// ts.worker.js
import * as monaco from 'monaco-editor/esm/vs/language/typescript/ts.worker';

self.onmessage = () => {
    // This is needed to make the worker load correctly
    monaco.initialize((ctx, createData) => {
        return new monaco.TypeScriptWorker(ctx, createData);
    });
};