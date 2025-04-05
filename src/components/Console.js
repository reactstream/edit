// editor/src/components/Console.js
import React, { useEffect, useRef, useState } from 'react';
import './Console.css';

const Console = ({ logs }) => {
    const consoleRef = useRef(null);
    const [visibleLogs, setVisibleLogs] = useState([]);

    // Add timestamp to logs
    useEffect(() => {
        if (logs.length > 0) {
            const lastLog = logs[logs.length - 1];

            // Check if the log already has a timestamp
            if (!lastLog.timestamp) {
                setVisibleLogs(prevLogs => [
                    ...prevLogs,
                    {
                        ...lastLog,
                        timestamp: new Date().toISOString()
                    }
                ]);
            }
        }
    }, [logs]);

    // Auto-scroll to bottom when new logs are added
    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [visibleLogs]);

    const handleClear = () => {
        setVisibleLogs([]);
    };

    return (
        <div className="console-container">
            <div className="console-header">
                <h3>Console</h3>
                <button className="clear-button" onClick={handleClear}>Clear</button>
            </div>

            <div className="console-output" ref={consoleRef}>
                {visibleLogs.map((log, index) => {
                    const timestamp = log.timestamp
                        ? new Date(log.timestamp).toLocaleTimeString()
                        : '';

                    return (
                        <div key={index} className={`log-entry ${log.type}`}>
                            <span className="log-timestamp">[{timestamp}]</span>
                            <span className="log-message">{log.message}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Console;
