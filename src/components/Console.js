// src/Console.js
import React, { useRef, useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';
import 'monaco-editor/esm/vs/editor/editor.all.js';

const Console = ({ logs = [] }) => {
    const consoleContainerRef = useRef(null);
    const [editorInstance, setEditorInstance] = useState(null);

    // Console editor options
    const editorOptions = {
        readOnly: true,
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: 'off',
        renderLineHighlight: 'none',
        fontSize: 13,
        wordWrap: 'on',
        contextmenu: false,
        folding: false,
        renderIndentGuides: false,
    };

    // Format logs for display
    const getConsoleContent = () => {
        return logs.map(log => {
            if (log.type === 'error') {
                return `// ERROR: ${log.message}`;
            } else if (log.type === 'warning') {
                return `// WARNING: ${log.message}`;
            } else if (log.type === 'success') {
                return `// SUCCESS: ${log.message}`;
            } else {
                return `// INFO: ${log.message}`;
            }
        }).join('\n');
    };

    // Create editor on component mount
    useEffect(() => {
        if (consoleContainerRef.current && !editorInstance) {
            // Define console theme
            monaco.editor.defineTheme('consoleTheme', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                    { token: 'comment', foreground: '6A9955' },
                    { token: 'string', foreground: 'CE9178' },
                    { token: 'keyword', foreground: '569CD6' },
                    { token: 'number', foreground: 'B5CEA8' },
                    { token: 'error', foreground: 'F44747' },
                    { token: 'warning', foreground: 'FF8C00' },
                    { token: 'info', foreground: '4FC1FF' },
                ],
                colors: {
                    'editor.background': '#1E1E1E',
                    'editor.foreground': '#D4D4D4',
                }
            });

            // Create editor
            const content = getConsoleContent();
            const editor = monaco.editor.create(consoleContainerRef.current, {
                ...editorOptions,
                value: content,
                language: 'javascript',
                theme: 'consoleTheme'
            });

            setEditorInstance(editor);

            // Scroll to bottom if there are logs
            if (logs.length > 0) {
                const model = editor.getModel();
                if (model) {
                    const lineCount = model.getLineCount();
                    editor.revealLine(lineCount);
                }
            }

            // Cleanup on unmount
            return () => {
                editor.dispose();
            };
        }
    }, [consoleContainerRef]);

    // Update content when logs change
    useEffect(() => {
        if (editorInstance) {
            const content = getConsoleContent();
            editorInstance.setValue(content);

            // Scroll to bottom
            const model = editorInstance.getModel();
            if (model) {
                const lineCount = model.getLineCount();
                editorInstance.revealLine(lineCount);
            }
        }
    }, [logs, editorInstance]);

    return (
        <div
            ref={consoleContainerRef}
            style={{ height: '100%', minHeight: '200px' }}
        />
    );
};

export default Console;
