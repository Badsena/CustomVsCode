/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { constObservable, observableValue, transaction } from '../../../../../base/common/observable.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { LineRange } from '../../../../../editor/common/core/ranges/lineRange.js';
import { DetailedLineRangeMapping } from '../../../../../editor/common/diff/rangeMapping.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { createTextBufferFactoryFromSnapshot } from '../../../../../editor/common/model/textModel.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { stringToSnapshot } from '../../../../services/textfile/common/textfiles.js';
import { IAiEditTelemetryService } from '../../../editTelemetry/browser/telemetry/aiEditTelemetry/aiEditTelemetryService.js';
import { IChatService } from '../../common/chatService/chatService.js';
import { AbstractChatEditingModifiedFileEntry } from './chatEditingModifiedFileEntry.js';
import { ChatEditingTextModelContentProvider } from './chatEditingTextModelContentProviders.js';
/**
 * Represents a file that has been deleted by the chat editing session.
 * Unlike ChatEditingModifiedDocumentEntry, this doesn't maintain a live model
 * since the file no longer exists on disk.
 */
let ChatEditingDeletedFileEntry = class ChatEditingDeletedFileEntry extends AbstractChatEditingModifiedFileEntry {
    constructor(resource, originalContent, _multiDiffEntryDelegate, telemetryInfo, _languageId, _modelService, _languageService, configService, fileConfigService, chatService, fileService, undoRedoService, instantiationService, aiEditTelemetryService) {
        super(resource, telemetryInfo, 2 /* ChatEditKind.Deleted */, configService, fileConfigService, chatService, fileService, undoRedoService, instantiationService, aiEditTelemetryService);
        this._multiDiffEntryDelegate = _multiDiffEntryDelegate;
        this._languageId = _languageId;
        this._modelService = _modelService;
        this._languageService = _languageService;
        this.linesAdded = constObservable(0);
        this._changesCount = observableValue(this, 1);
        this.changesCount = this._changesCount;
        this.isDeletion = true;
        this._originalContent = originalContent;
        this.initialContent = originalContent;
        this.originalURI = ChatEditingTextModelContentProvider.getFileURI(telemetryInfo.sessionResource, this.entryId, resource.path);
        this.diffInfo = constObservable(this._diffInfo());
        this.linesRemoved = constObservable(this._getOrCreateOriginalModel().getLineCount());
    }
    dispose() {
        this._originalModel?.dispose();
        this._modifiedModel?.dispose();
        super.dispose();
    }
    /**
     * Gets or creates the original model for diff display.
     */
    _getOrCreateOriginalModel() {
        if (!this._originalModel || this._originalModel.isDisposed()) {
            this._originalModel = this._modelService.createModel(createTextBufferFactoryFromSnapshot(stringToSnapshot(this._originalContent)), this._languageService.createById(this._languageId), this.originalURI, false);
        }
        return this._originalModel;
    }
    /**
     * Gets or creates an empty model representing the deleted state.
     */
    _getOrCreateModifiedModel() {
        if (!this._modifiedModel || this._modifiedModel.isDisposed()) {
            // Create empty model - file is deleted so content is empty
            this._modifiedModel = this._modelService.createModel('', this._languageService.createById(this._languageId), this.modifiedURI.with({ scheme: 'deleted-file' }), false);
        }
        return this._modifiedModel;
    }
    _diffInfo() {
        // For deleted files, return a simple diff showing all content removed
        const originalModel = this._getOrCreateOriginalModel();
        this._getOrCreateModifiedModel(); // Ensure the modified model exists for the diff view
        const originalLineCount = originalModel.getLineCount();
        return {
            changes: [new DetailedLineRangeMapping(new LineRange(1, originalLineCount + 1), new LineRange(1, 1), undefined)],
            quitEarly: false,
            identical: false,
            moves: []
        };
    }
    getDiffInfo() {
        return Promise.resolve(this._diffInfo());
    }
    equalsSnapshot(snapshot) {
        return !!snapshot &&
            isEqual(this.modifiedURI, snapshot.resource) &&
            this._languageId === snapshot.languageId &&
            this._originalContent === snapshot.original &&
            snapshot.current === '' &&
            this.state.get() === snapshot.state;
    }
    createSnapshot(chatSessionResource, requestId, undoStop) {
        return {
            resource: this.modifiedURI,
            languageId: this._languageId,
            snapshotUri: this.originalURI,
            original: this._originalContent,
            current: '', // File is deleted, so current content is empty
            state: this.state.get(),
            telemetryInfo: this._telemetryInfo,
            isDeleted: true,
        };
    }
    async restoreFromSnapshot(snapshot, restoreToDisk = true) {
        this._stateObs.set(snapshot.state, undefined);
        if (restoreToDisk && snapshot.current !== '') {
            // Restore file to disk with the snapshot content
            await this._fileService.writeFile(this.modifiedURI, VSBuffer.fromString(snapshot.current));
        }
    }
    async resetToInitialContent() {
        // Restore the file with original content
        await this._fileService.writeFile(this.modifiedURI, VSBuffer.fromString(this._originalContent));
    }
    async _areOriginalAndModifiedIdentical() {
        // A deleted file is never identical to its original (unless original was empty)
        return this._originalContent === '';
    }
    _createUndoRedoElement(response) {
        return {
            type: 0 /* UndoRedoElementType.Resource */,
            resource: this.modifiedURI,
            label: 'Chat File Deletion',
            code: 'chat.delete',
            undo: async () => {
                // Restore the file
                await this._fileService.writeFile(this.modifiedURI, VSBuffer.fromString(this._originalContent));
            },
            redo: async () => {
                // Delete the file again
                await this._fileService.del(this.modifiedURI, { useTrash: false });
            }
        };
    }
    async acceptAgentEdits(_uri, _edits, isLastEdits, _responseModel) {
        // For deleted files, there are no incremental edits - the file is just deleted
        transaction((tx) => {
            this._waitsForLastEdits.set(!isLastEdits, tx);
            this._stateObs.set(0 /* ModifiedFileEntryState.Modified */, tx);
            if (isLastEdits) {
                this._resetEditsState(tx);
                this._rewriteRatioObs.set(1, tx);
            }
        });
    }
    async _doAccept() {
        // File deletion is already done - just collapse the entry
        this._multiDiffEntryDelegate.collapse(undefined);
    }
    async _doReject() {
        // Restore the file from original content
        await this._fileService.writeFile(this.modifiedURI, VSBuffer.fromString(this._originalContent));
        this._multiDiffEntryDelegate.collapse(undefined);
    }
    _createEditorIntegration(_editor) {
        // Deleted files don't need complex editor integration since there's nothing to navigate
        return {
            currentIndex: observableValue(this, 0),
            reveal: () => { },
            next: () => false,
            previous: () => false,
            enableAccessibleDiffView: () => { },
            acceptNearestChange: async () => { },
            rejectNearestChange: async () => { },
            toggleDiff: async () => { },
            dispose: () => { }
        };
    }
    async computeEditsFromSnapshots(_beforeSnapshot, _afterSnapshot) {
        // For deleted files, we don't compute incremental edits
        return [];
    }
    async save() {
        // Nothing to save - file is deleted
    }
    async revertToDisk() {
        // Nothing to revert - file is deleted
    }
};
ChatEditingDeletedFileEntry = __decorate([
    __param(5, IModelService),
    __param(6, ILanguageService),
    __param(7, IConfigurationService),
    __param(8, IFilesConfigurationService),
    __param(9, IChatService),
    __param(10, IFileService),
    __param(11, IUndoRedoService),
    __param(12, IInstantiationService),
    __param(13, IAiEditTelemetryService)
], ChatEditingDeletedFileEntry);
export { ChatEditingDeletedFileEntry };
//# sourceMappingURL=chatEditingDeletedFileEntry.js.map