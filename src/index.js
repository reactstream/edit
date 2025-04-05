// src/index.js

import React from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './App.css';

// Configure Monaco workers properly
import * as monaco from 'monaco-editor';

// Set up Monaco environment for workers
window.MonacoEnvironment = {
    getWorkerUrl: function (moduleId, label) {
        if (label === 'json') {
            return './json.worker.js';
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
            return './css.worker.js';
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return './html.worker.js';
        }
        if (label === 'typescript' || label === 'javascript') {
            return './ts.worker.js';
        }
        return './editor.worker.js';
    }
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);
