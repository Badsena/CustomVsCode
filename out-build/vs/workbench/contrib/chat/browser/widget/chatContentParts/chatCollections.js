/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class ResourcePool {
    get inUse() {
        return this._inUse;
    }
    constructor(_itemFactory) {
        this._itemFactory = _itemFactory;
        this.pool = [];
        this._inUse = new Set;
    }
    get() {
        if (this.pool.length > 0) {
            const item = this.pool.pop();
            this._inUse.add(item);
            return item;
        }
        const item = this._itemFactory();
        this._inUse.add(item);
        return item;
    }
    release(item) {
        this._inUse.delete(item);
        this.pool.push(item);
    }
    /**
     * Clear and dispose the items in the pool that are not in use.
     */
    clear() {
        for (const item of this.pool) {
            item.dispose();
        }
        this.pool.length = 0;
    }
    dispose() {
        this.clear();
        for (const item of this._inUse) {
            item.dispose();
        }
        this._inUse.clear();
    }
}
//# sourceMappingURL=chatCollections.js.map