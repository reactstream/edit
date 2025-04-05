// src/components/Editor.js
import React, { useRef, useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';

const Editor = ({ value, onChange, language = 'javascript', isLoading = false }) => {
    const editorContainerRef = useRef(null);
    const [editorInstance, setEditorInstance] = useState(null);

    const editorOptions = {
        selectOnLineNumbers: true,
        roundedSelection: false,
        readOnly: false,
        cursorStyle: 'line',
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineNumbers: 'on',
        tabSize: 2,
        wordWrap: 'on',
    };

    // Setup editor on mount
    useEffect(() => {
        if (editorContainerRef.current && !editorInstance) {
            // Configure Monaco
            monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                jsx: monaco.languages.typescript.JsxEmit.React,
                jsxFactory: 'React.createElement',
                reactNamespace: 'React',
                allowNonTsExtensions: true,
                allowJs: true,
                target: monaco.languages.typescript.ScriptTarget.Latest
            });

            // Define custom theme
            monaco.editor.defineTheme('reactStreamTheme', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                    { token: 'comment', foreground: '6A9955' },
                    { token: 'string', foreground: 'CE9178' },
                    { token: 'keyword', foreground: '569CD6' },
                ],
                colors: {
                    'editor.background': '#1E1E1E',
                    'editor.foreground': '#D4D4D4',
                }
            });

            // Set theme
            monaco.editor.setTheme('reactStreamTheme');

            // Create editor with initial value (even if empty)
            const editor = monaco.editor.create(editorContainerRef.current, {
                ...editorOptions,
                value: value || '',
                language: language,
                theme: 'reactStreamTheme'
            });

            // Set focus
            editor.focus();

            // Save editor instance
            setEditorInstance(editor);

            // Cleanup on unmount
            return () => {
                editor.dispose();
            };
        }
    }, [editorContainerRef]);

    // Update editor value when prop changes
    useEffect(() => {
        if (editorInstance && value !== undefined && value !== null && editorInstance.getValue() !== value) {
            editorInstance.setValue(value);
        }
    }, [value, editorInstance]);

    // Setup change handler
    useEffect(() => {
        if (editorInstance && onChange) {
            const disposable = editorInstance.onDidChangeModelContent(() => {
                const newValue = editorInstance.getValue();
                onChange(newValue);
            });

            return () => {
                disposable.dispose();
            };
        }
    }, [onChange, editorInstance]);

    // Update language if it changes
    useEffect(() => {
        if (editorInstance) {
            const model = editorInstance.getModel();
            if (model) {
                monaco.editor.setModelLanguage(model, language);
            }
        }
    }, [language, editorInstance]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '500px' }}>
            {isLoading && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: 'rgba(30,30,30,0.7)',
                    zIndex: 10,
                    color: 'white'
                }}>
                    Loading code...
                </div>
            )}
            <div
                ref={editorContainerRef}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};

export default Editor;
