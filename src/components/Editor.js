// editor/src/components/Editor.js
import React, { useRef, useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';
import './Editor.css';

const Editor = ({ value, onChange, language = 'javascript', isLoading = false, readOnly = false }) => {
    const editorRef = useRef(null);
    const containerRef = useRef(null);
    const [editor, setEditor] = useState(null);

    // Initialize editor
    useEffect(() => {
        if (containerRef.current && !editor) {
            // Configure TypeScript compiler options for JSX
            monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
                jsx: monaco.languages.typescript.JsxEmit.React,
                jsxFactory: 'React.createElement',
                reactNamespace: 'React',
                allowNonTsExtensions: true,
                target: monaco.languages.typescript.ScriptTarget.Latest,
                allowJs: true,
                moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs
            });

            // Define a custom theme
            monaco.editor.defineTheme('reactStreamTheme', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                    { token: 'comment', foreground: '6A9955' },
                    { token: 'keyword', foreground: '569CD6' },
                    { token: 'string', foreground: 'CE9178' },
                    { token: 'number', foreground: 'B5CEA8' },
                    { token: 'regexp', foreground: 'D16969' },
                    { token: 'operator', foreground: 'D4D4D4' },
                    { token: 'delimiter', foreground: 'D4D4D4' },
                    { token: 'tag', foreground: '569CD6' },
                    { token: 'attribute.name', foreground: '9CDCFE' },
                    { token: 'attribute.value', foreground: 'CE9178' }
                ],
                colors: {
                    'editor.background': '#1E1E1E',
                    'editor.foreground': '#D4D4D4',
                    'editorLineNumber.foreground': '#858585',
                    'editorCursor.foreground': '#AEAFAD',
                    'editor.selectionBackground': '#264F78',
                    'editor.inactiveSelectionBackground': '#3A3D41'
                }
            });

            // Create editor
            const newEditor = monaco.editor.create(containerRef.current, {
                value: value || '',
                language,
                theme: 'reactStreamTheme',
                automaticLayout: true,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                fontFamily: 'Fira Code, Consolas, Monaco, monospace',
                fontSize: 14,
                lineHeight: 22,
                tabSize: 2,
                wordWrap: 'on',
                wrappingIndent: 'same',
                readOnly,
                cursorStyle: 'line',
                lineNumbers: 'on',
                renderWhitespace: 'selection',
                renderIndentGuides: true,
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                snippetSuggestions: 'inline',
                folding: true,
                formatOnType: true
            });

            setEditor(newEditor);
            editorRef.current = newEditor;

            // Return cleanup function
            return () => {
                newEditor.dispose();
            };
        }
    }, [containerRef]);

    // Update editor value when value prop changes
    useEffect(() => {
        if (editor && value !== undefined && editor.getValue() !== value) {
            editor.setValue(value);
        }
    }, [value, editor]);

    // Handle language changes
    useEffect(() => {
        if (editor) {
            monaco.editor.setModelLanguage(editor.getModel(), language);
        }
    }, [language, editor]);

    // Handle read-only changes
    useEffect(() => {
        if (editor) {
            editor.updateOptions({ readOnly });
        }
    }, [readOnly, editor]);

    // Set up content change handler
    useEffect(() => {
        if (editor && onChange) {
            const changeHandler = editor.onDidChangeModelContent(() => {
                const newValue = editor.getValue();
                onChange(newValue);
            });

            return () => {
                changeHandler.dispose();
            };
        }
    }, [editor, onChange]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (editor) {
                editor.layout();
            }
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [editor]);

    return (
        <div className="editor-container">
            {isLoading && (
                <div className="editor-loading">
                    <div className="spinner"></div>
                    <p>Loading editor...</p>
                </div>
            )}
            <div
                ref={containerRef}
                className="monaco-editor-container"
                style={{ opacity: isLoading ? 0.5 : 1 }}
            />
        </div>
    );
};

export default Editor;
