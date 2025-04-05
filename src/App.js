// src/App.js
import React, { useState, useEffect } from 'react';
import Editor from './components/Editor';
import Console from './components/Console';
import Preview from './components/Preview';
import './App.css';

function App() {
    const [code, setCode] = useState('');
    const [logs, setLogs] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [previewPort, setPreviewPort] = useState(3010);
    const [isLoading, setIsLoading] = useState(true);
    const [previewKey, setPreviewKey] = useState(Date.now()); // do wymuszenia przeładowania iframe

    // Fragment do dodania w App.js - lepsza obsługa błędów w fetch

    useEffect(() => {
        // Ładuj przykładowy kod od razu przy inicjalizacji strony
        fetch('/api/example')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.text();
            })
            .then(data => {
                setCode(data);
                setLogs(prev => [...prev, { type: 'info', message: 'Example code loaded successfully' }]);
                setIsLoading(false); // Kod został załadowany

                // Upewnij się, że podgląd przykładowego komponentu jest uruchomiony
                return fetch('/api/restart-preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}) // Pusty obiekt jako body
                });
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    setLogs(prev => [...prev, { type: 'info', message: data.message }]);
                } else {
                    setLogs(prev => [...prev, { type: 'error', message: data.message || 'Failed to restart preview' }]);
                }
            })
            .catch(error => {
                console.error("Error:", error);
                setLogs(prev => [...prev, { type: 'error', message: `Error: ${error.message}` }]);
                setIsLoading(false);
            });

        // Dodaj komunikat do konsoli, że używamy portu 3010
        setLogs(prev => [...prev, { type: 'info', message: 'Preview available on port 3010' }]);
    }, []);



    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setLogs(prev => [...prev, { type: 'info', message: 'Analyzing component...' }]);

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            const result = await response.json();

            if (result.error) {
                setLogs(prev => [...prev, { type: 'error', message: result.error }]);
            } else {
                setLogs(prev => [...prev, { type: 'success', message: 'Analysis complete!' }]);
                if (result.output) {
                    setLogs(prev => [...prev, { type: 'info', message: result.output }]);
                }
            }
        } catch (error) {
            setLogs(prev => [...prev, { type: 'error', message: `Error: ${error.message}` }]);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleUpdatePreview = async () => {
        setLogs(prev => [...prev, { type: 'info', message: 'Updating preview...' }]);

        try {
            const response = await fetch('/api/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                setLogs(prev => [...prev, { type: 'success', message: result.message }]);
                // Wymuszamy przeładowanie iframe
                setPreviewKey(Date.now());
            } else {
                setLogs(prev => [...prev, { type: 'error', message: result.message || 'Failed to update preview' }]);
            }
        } catch (error) {
            console.error("Error updating preview:", error);
            setLogs(prev => [...prev, { type: 'error', message: `Error updating preview: ${error.message}` }]);
        }
    };

    // Handle socket.io communication
    useEffect(() => {
        import('socket.io-client').then(({ io }) => {
            const socket = io();

            socket.on('connect', () => {
                setLogs(prev => [...prev, { type: 'info', message: 'Connected to server' }]);
            });

            socket.on('disconnect', () => {
                setLogs(prev => [...prev, { type: 'warning', message: 'Disconnected from server' }]);
            });

            socket.on('analysis-result', (data) => {
                if (data.error) {
                    setLogs(prev => [...prev, { type: 'error', message: data.error }]);
                }
                if (data.output) {
                    setLogs(prev => [...prev, { type: 'info', message: data.output }]);
                }
                setIsAnalyzing(false);
            });

            socket.on('serve-output', (data) => {
                if (data.type === 'stdout') {
                    setLogs(prev => [...prev, { type: 'info', message: data.data }]);
                } else if (data.type === 'stderr') {
                    setLogs(prev => [...prev, { type: 'error', message: data.data }]);
                }
            });

            return () => {
                socket.disconnect();
            };
        }).catch(error => {
            console.error('Failed to load socket.io-client:', error);
        });
    }, []);

    return (
        <div className="app-container">
            <header>
                <h1>ReactStream</h1>
                <div className="button-group">
                    <button onClick={handleAnalyze} disabled={isAnalyzing}>
                        {isAnalyzing ? 'Analyzing...' : 'Analyze Component'}
                    </button>
                    <button onClick={handleUpdatePreview}>
                        Update Preview
                    </button>
                </div>
            </header>

            <div className="main-content">
                <div className="editor-section">
                    <h2>Component Editor</h2>
                    <Editor
                        value={code}
                        onChange={setCode}
                        language="javascript"
                        isLoading={isLoading}
                    />
                </div>

                <div className="preview-section">
                    <h2>Preview</h2>
                    {/* Przekazujemy key, aby wymusić przeładowanie przy zmianie */}
                    <Preview port={3010} key={previewKey} />
                </div>
            </div>

            <div className="console-section">
                <h2>Console</h2>
                <Console logs={logs} />
            </div>
        </div>
    );
}

export default App;
