// editor/src/components/Header.js
import React, { useState } from 'react';
import api from '../services/api';
import './Header.css';

const Header = ({ currentProject, currentFile, onSave, sessionInfo }) => {
    const [showSessionMenu, setShowSessionMenu] = useState(false);

    const handleSave = () => {
        onSave();
    };

    const handleShare = async () => {
        try {
            const shareResponse = await api.session.createShareLink();

            // Copy to clipboard
            navigator.clipboard.writeText(shareResponse.shareUrl)
                .then(() => {
                    alert(`Share link copied to clipboard: ${shareResponse.shareUrl}`);
                })
                .catch(() => {
                    // If clipboard API fails, show the URL
                    alert(`Share link: ${shareResponse.shareUrl}`);
                });
        } catch (error) {
            alert(`Error creating share link: ${error.message}`);
        }
    };

    const handleExport = async () => {
        try {
            // This will trigger a download through the browser
            window.open('/api/sessions/export', '_blank');
        } catch (error) {
            alert(`Error exporting session: ${error.message}`);
        }
    };

    const handleNewSession = async () => {
        if (window.confirm('This will create a new session. You can still access this session with the browser back button. Continue?')) {
            try {
                await api.session.createSession();
                // Reload the page to initialize with the new session
                window.location.reload();
            } catch (error) {
                alert(`Error creating new session: ${error.message}`);
            }
        }
    };

    const toggleSessionMenu = () => {
        setShowSessionMenu(!showSessionMenu);
    };

    return (
        <header className="main-header">
            <div className="logo">
                <h1>ReactStream</h1>
            </div>

            <div className="current-path">
                {currentProject && (
                    <span className="project-name">{currentProject.name}</span>
                )}

                {currentProject && currentFile && (
                    <span className="separator">/</span>
                )}

                {currentFile && (
                    <span className="file-name">{currentFile.path}</span>
                )}
            </div>

            <div className="header-actions">
                <button
                    className="save-button"
                    onClick={handleSave}
                    disabled={!currentProject || !currentFile}
                >
                    💾 Save
                </button>

                <div className="session-menu-container">
                    <button className="session-button" onClick={toggleSessionMenu}>
                        👤 Session
                    </button>

                    {showSessionMenu && (
                        <div className="session-menu">
                            <div className="session-info">
                                {sessionInfo && (
                                    <>
                                        <p><strong>Session ID:</strong> {sessionInfo.id.substring(0, 8)}...</p>
                                        <p><strong>Created:</strong> {new Date(sessionInfo.createdAt).toLocaleString()}</p>
                                    </>
                                )}
                            </div>

                            <button onClick={handleShare}>Share Session</button>
                            <button onClick={handleExport}>Export Session</button>
                            <button onClick={handleNewSession}>New Session</button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
