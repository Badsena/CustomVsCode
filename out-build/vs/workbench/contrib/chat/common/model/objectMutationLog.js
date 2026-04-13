/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../../../base/common/assert.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { isUndefinedOrNull } from '../../../../../base/common/types.js';
/**
 * Updates an error's message and stack trace with a prefix. In V8 the stack
 * string starts with "ErrorName: message\n  at …", so we rebuild the header
 * after mutating the message.
 */
function prefixError(e, prefix) {
    e.message = prefix + e.message;
    if (e.stack) {
        const nlIdx = e.stack.indexOf('\n');
        e.stack = nlIdx !== -1
            ? `${e.name}: ${e.message}${e.stack.slice(nlIdx)}`
            : `${e.name}: ${e.message}`;
    }
}
/**
 * Prepends a path segment to an error as it unwinds through nested extract
 * calls. Each level adds its segment so the final message reads e.g.
 * `.responses[2].content: Cannot read property 'x' of undefined`.
 */
function rethrowWithPathSegment(e, segment) {
    if (e instanceof Error) {
        const part = typeof segment === 'number' ? `[${segment}]` : `.${segment}`;
        const needsSep = !e.message.startsWith('[') && !e.message.startsWith('.');
        prefixError(e, part + (needsSep ? ': ' : ''));
    }
    throw e;
}
/** IMPORTANT: `Key` comes first. Then we should sort in order of least->most expensive to diff */
var TransformKind;
(function (TransformKind) {
    TransformKind[TransformKind["Key"] = 0] = "Key";
    TransformKind[TransformKind["Primitive"] = 1] = "Primitive";
    TransformKind[TransformKind["Array"] = 2] = "Array";
    TransformKind[TransformKind["Object"] = 3] = "Object";
})(TransformKind || (TransformKind = {}));
/**
 * A primitive that will be tracked and compared first. If this is changed, the entire
 * object is thrown out and re-stored.
 */
export function key(comparator) {
    return {
        kind: 0 /* TransformKind.Key */,
        extract: (from) => from,
        equals: comparator ?? ((a, b) => a === b),
    };
}
export function value(comparator) {
    return {
        kind: 1 /* TransformKind.Primitive */,
        extract: (from) => {
            let value = from;
            // We map the object to JSON for two reasons (a) reduce issues with references to
            // mutable type that could be held internally in the LogAdapter and (b) to make
            // object comparison work with the data we re-hydrate from disk (e.g. if using
            // objectsEqual, a hydrated URI is not equal to the serialized UriComponents)
            if (!!value && typeof value === 'object') {
                value = JSON.parse(JSON.stringify(value));
            }
            return value;
        },
        equals: comparator ?? ((a, b) => a === b),
    };
}
/** An array that will use the schema to compare items positionally. */
export function array(schema) {
    return {
        kind: 2 /* TransformKind.Array */,
        itemSchema: schema,
        extract: from => from?.map((item, i) => {
            try {
                return schema.extract(item);
            }
            catch (e) {
                rethrowWithPathSegment(e, i);
            }
        }),
    };
}
/** An object schema. */
export function object(schema, options) {
    // Sort entries with key properties first for fast key checking
    const entries = Object.entries(schema).sort(([, a], [, b]) => a.kind - b.kind);
    return {
        kind: 3 /* TransformKind.Object */,
        children: entries,
        sealed: options?.sealed,
        extract: (from) => {
            if (isUndefinedOrNull(from)) {
                return from;
            }
            const result = Object.create(null);
            for (const [key, transform] of entries) {
                try {
                    result[key] = transform.extract(from);
                }
                catch (e) {
                    rethrowWithPathSegment(e, key);
                }
            }
            return result;
        },
    };
}
/**
 * Defines a getter on the object to extract a value, compared with the given schema.
 * It should return the value that will get serialized in the resulting log file.
 */
export function t(getter, schema) {
    return {
        ...schema,
        extract: (from) => schema.extract(getter(from)),
    };
}
export function v(getter, comparator) {
    const inner = value(comparator);
    return {
        ...inner,
        extract: (from) => inner.extract(getter(from)),
    };
}
var EntryKind;
(function (EntryKind) {
    /** Initial complete object state, valid only as the first entry */
    EntryKind[EntryKind["Initial"] = 0] = "Initial";
    /** Property update */
    EntryKind[EntryKind["Set"] = 1] = "Set";
    /** Array push/splice. */
    EntryKind[EntryKind["Push"] = 2] = "Push";
    /** Delete a property */
    EntryKind[EntryKind["Delete"] = 3] = "Delete";
})(EntryKind || (EntryKind = {}));
const LF = VSBuffer.fromString('\n');
/**
 * An implementation of an append-based mutation logger. Given a `Transform`
 * definition of an object, it can recreate it from a file on disk. It is
 * then stateful, and given a `write` call it can update the log in a minimal
 * way.
 */
export class ObjectMutationLog {
    constructor(_transform, _compactAfterEntries = 512) {
        this._transform = _transform;
        this._compactAfterEntries = _compactAfterEntries;
        this._entryCount = 0;
    }
    /**
     * Creates an initial log file from the given object.
     */
    createInitial(current) {
        return this.createInitialFromSerialized(this._transform.extract(current));
    }
    /**
     * Creates an initial log file from the serialized object.
     */
    createInitialFromSerialized(value) {
        this._previous = value;
        this._entryCount = 1;
        const entry = { kind: 0 /* EntryKind.Initial */, v: value };
        return VSBuffer.fromString(JSON.stringify(entry) + '\n');
    }
    /**
     * Reads and reconstructs the state from a log file.
     */
    read(content) {
        let state;
        let lineCount = 0;
        let start = 0;
        const len = content.byteLength;
        while (start < len) {
            let end = content.indexOf(LF, start);
            if (end === -1) {
                end = len;
            }
            if (end > start) {
                const line = content.slice(start, end);
                if (line.byteLength > 0) {
                    lineCount++;
                    const entry = JSON.parse(line.toString());
                    switch (entry.kind) {
                        case 0 /* EntryKind.Initial */:
                            state = entry.v;
                            break;
                        case 1 /* EntryKind.Set */:
                            this._applySet(state, entry.k, entry.v);
                            break;
                        case 2 /* EntryKind.Push */:
                            this._applyPush(state, entry.k, entry.v, entry.i);
                            break;
                        case 3 /* EntryKind.Delete */:
                            this._applySet(state, entry.k, undefined);
                            break;
                        default:
                            assertNever(entry);
                    }
                }
            }
            start = end + 1;
        }
        if (lineCount === 0) {
            throw new Error('Empty log file');
        }
        this._previous = state;
        this._entryCount = lineCount;
        return state;
    }
    /**
     * Writes updates to the log. Returns the operation type and data to write.
     */
    write(current) {
        const currentValue = this._transform.extract(current);
        if (!this._previous || this._entryCount > this._compactAfterEntries) {
            // No previous state, create initial
            this._previous = currentValue;
            this._entryCount = 1;
            const entry = { kind: 0 /* EntryKind.Initial */, v: currentValue };
            return { op: 'replace', data: VSBuffer.fromString(JSON.stringify(entry) + '\n') };
        }
        // Generate diff entries
        const entries = [];
        const path = [];
        try {
            this._diff(this._transform, path, this._previous, currentValue, entries);
        }
        catch (e) {
            if (e instanceof Error) {
                const pathStr = path.map(s => typeof s === 'number' ? `[${s}]` : `.${s}`).join('') || '<root>';
                prefixError(e, `error diffing at ${pathStr}: `);
            }
            throw e;
        }
        if (entries.length === 0) {
            // No changes
            return { op: 'append', data: VSBuffer.fromString('') };
        }
        this._entryCount += entries.length;
        this._previous = currentValue;
        // Append entries - build string directly
        let data = '';
        for (const e of entries) {
            data += JSON.stringify(e) + '\n';
        }
        return { op: 'append', data: VSBuffer.fromString(data) };
    }
    _applySet(state, path, value) {
        if (path.length === 0) {
            return; // Root replacement handled by caller
        }
        let current = state;
        for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
    }
    _applyPush(state, path, values, startIndex) {
        let current = state;
        for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
        }
        const arrayKey = path[path.length - 1];
        const arr = current[arrayKey] || [];
        if (startIndex !== undefined) {
            arr.length = startIndex;
        }
        if (values && values.length > 0) {
            arr.push(...values);
        }
        current[arrayKey] = arr;
    }
    _diff(transform, path, prev, curr, entries) {
        if (transform.kind === 0 /* TransformKind.Key */ || transform.kind === 1 /* TransformKind.Primitive */) {
            // Simple value change - copy path since we're storing it
            if (!transform.equals(prev, curr)) {
                entries.push({ kind: 1 /* EntryKind.Set */, k: path.slice(), v: curr });
            }
        }
        else if (isUndefinedOrNull(prev) || isUndefinedOrNull(curr)) {
            if (prev !== curr) {
                if (curr === undefined) {
                    entries.push({ kind: 3 /* EntryKind.Delete */, k: path.slice() });
                }
                else if (curr === null) {
                    entries.push({ kind: 1 /* EntryKind.Set */, k: path.slice(), v: null });
                }
                else {
                    entries.push({ kind: 1 /* EntryKind.Set */, k: path.slice(), v: curr });
                }
            }
        }
        else if (transform.kind === 2 /* TransformKind.Array */) {
            this._diffArray(transform, path, prev, curr, entries);
        }
        else if (transform.kind === 3 /* TransformKind.Object */) {
            this._diffObject(transform.children, path, prev, curr, entries, transform.sealed);
        }
        else {
            throw new Error(`Unknown transform kind ${JSON.stringify(transform)}`);
        }
    }
    _diffObject(children, path, prev, curr, entries, sealed) {
        const prevObj = prev;
        const currObj = curr;
        // First check key fields (sorted to front) - if any key changed, replace the entire object
        let i = 0;
        for (; i < children.length; i++) {
            const [key, transform] = children[i];
            if (transform.kind !== 0 /* TransformKind.Key */) {
                break; // Keys are sorted to front, so we can stop
            }
            if (!transform.equals(prevObj?.[key], currObj[key])) {
                // Key changed, replace entire object
                entries.push({ kind: 1 /* EntryKind.Set */, k: path.slice(), v: curr });
                return;
            }
        }
        // If both objects are sealed, we've already verified keys match above,
        // so we can skip diffing the other properties since sealed objects don't change
        if (sealed && sealed(prev, true) && sealed(curr, false)) {
            return;
        }
        // Diff each property using mutable path
        for (; i < children.length; i++) {
            const [key, transform] = children[i];
            path.push(key);
            this._diff(transform, path, prevObj?.[key], currObj[key], entries);
            path.pop();
        }
    }
    _diffArray(transform, path, prev, curr, entries) {
        const prevArr = prev || [];
        const currArr = curr || [];
        const itemSchema = transform.itemSchema;
        const minLen = Math.min(prevArr.length, currArr.length);
        // If the item schema is an object, we can recurse into it to diff individual
        // properties instead of replacing the entire item. However, we only do this
        // if the key fields match.
        if (itemSchema.kind === 3 /* TransformKind.Object */) {
            const childEntries = itemSchema.children;
            // Diff common elements by recursing into them
            for (let i = 0; i < minLen; i++) {
                const prevItem = prevArr[i];
                const currItem = currArr[i];
                // Check if key fields match - if not, we need to replace from this point
                if (this._hasKeyMismatch(childEntries, prevItem, currItem)) {
                    // Key mismatch: replace from this point onward
                    const newItems = currArr.slice(i);
                    entries.push({ kind: 2 /* EntryKind.Push */, k: path.slice(), v: newItems.length > 0 ? newItems : undefined, i });
                    return;
                }
                // Keys match, recurse into the object
                path.push(i);
                this._diffObject(childEntries, path, prevItem, currItem, entries, itemSchema.sealed);
                path.pop();
            }
            // Handle length changes
            if (currArr.length > prevArr.length) {
                entries.push({ kind: 2 /* EntryKind.Push */, k: path.slice(), v: currArr.slice(prevArr.length) });
            }
            else if (currArr.length < prevArr.length) {
                entries.push({ kind: 2 /* EntryKind.Push */, k: path.slice(), i: currArr.length });
            }
        }
        else {
            // No children schema, use the original positional comparison
            let firstMismatch = -1;
            for (let i = 0; i < minLen; i++) {
                if (!itemSchema.equals(prevArr[i], currArr[i])) {
                    firstMismatch = i;
                    break;
                }
            }
            if (firstMismatch === -1) {
                // All common elements match
                if (currArr.length > prevArr.length) {
                    // New items appended
                    entries.push({ kind: 2 /* EntryKind.Push */, k: path.slice(), v: currArr.slice(prevArr.length) });
                }
                else if (currArr.length < prevArr.length) {
                    // Items removed from end
                    entries.push({ kind: 2 /* EntryKind.Push */, k: path.slice(), i: currArr.length });
                }
                // else: same length, all match - no change
            }
            else {
                // Mismatch found, rewrite from that point
                const newItems = currArr.slice(firstMismatch);
                entries.push({ kind: 2 /* EntryKind.Push */, k: path.slice(), v: newItems.length > 0 ? newItems : undefined, i: firstMismatch });
            }
        }
    }
    _hasKeyMismatch(children, prev, curr) {
        const prevObj = prev;
        const currObj = curr;
        for (const [key, transform] of children) {
            if (transform.kind !== 0 /* TransformKind.Key */) {
                break; // Keys are sorted to front, so we can stop
            }
            if (!transform.equals(prevObj?.[key], currObj[key])) {
                return true;
            }
        }
        return false;
    }
}
//# sourceMappingURL=objectMutationLog.js.map