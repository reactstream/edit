// editor/src/components/FileExplorer.js
import React, { useState } from 'react';
import './FileExplorer.css';

const FileExplorer = ({ files, currentFile, onFileChange, onCreateFile, onDeleteFile }) => {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newFileName, setNewFileName] = useState('');
    const [expandedFolders, setExpandedFolders] = useState({});

    const handleFileClick = (file) => {
        if (!currentFile || file.path !== currentFile.path) {
            onFileChange(file);
        }
    };

    const handleCreateClick = () => {
        setShowCreateForm(true);
    };

    const handleCancelCreate = () => {
        setShowCreateForm(false);
        setNewFileName('');
    };

    const handleSubmitCreate = (e) => {
        e.preventDefault();
        if (!newFileName.trim()) return;

        onCreateFile(newFileName);
        setShowCreateForm(false);
        setNewFileName('');
    };

    const handleDeleteClick = () => {
        if (currentFile) {
            // Confirm deletion
            if (window.confirm(`Are you sure you want to delete ${currentFile.path}?`)) {
                onDeleteFile();
            }
        }
    };

    const toggleFolder = (folderPath) => {
        setExpandedFolders(prev => ({
            ...prev,
            [folderPath]: !prev[folderPath]
        }));
    };

    // Group files by folder
    const filesByFolder = files.reduce((acc, file) => {
        const parts = file.path.split('/');
        let currentPath = '';

        // Handle root files
        if (parts.length === 1) {
            if (!acc['']) acc[''] = [];
            acc[''].push(file);
            return acc;
        }

        // Handle files in folders
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];

            if (currentPath === '') {
                currentPath = part;
            } else {
                currentPath = `${currentPath}/${part}`;
            }

            if (!acc[currentPath]) {
                acc[currentPath] = [];
            }
        }

        const folder = parts.slice(0, -1).join('/');
        if (!acc[folder]) acc[folder] = [];
        acc[folder].push(file);

        return acc;
    }, { '': [] });

    // Create a tree structure
    const renderTree = () => {
        // Get all unique folders
        const folders = Object.keys(filesByFolder).filter(f => f !== '');

        // Sort folders by path
        folders.sort();

        // Root files
        const rootFiles = filesByFolder[''] || [];

        return (
            <>
                {/* Render root files */}
                {rootFiles.map(file => (
                    <li
                        key={file.path}
                        className={currentFile?.path === file.path ? 'active' : ''}
                        onClick={() => handleFileClick(file)}
                    >
                        <span className="file-icon">📄</span>
                        <span className="file-name">{file.path}</span>
                    </li>
                ))}

                {/* Render folders and their files */}
                {folders.map(folder => {
                    const isExpanded = expandedFolders[folder] !== false; // Default to expanded
                    const folderFiles = filesByFolder[folder] || [];
                    const folderName = folder.split('/').pop();

                    return (
                        <li key={folder} className="folder">
                            <div className="folder-header" onClick={() => toggleFolder(folder)}>
                                <span className="folder-icon">{isExpanded ? '📂' : '📁'}</span>
                                <span className="folder-name">{folderName}</span>
                            </div>

                            {isExpanded && (
                                <ul className="folder-content">
                                    {folderFiles.map(file => {
                                        const fileName = file.path.split('/').pop();

                                        return (
                                            <li
                                                key={file.path}
                                                className={currentFile?.path === file.path ? 'active' : ''}
                                                onClick={() => handleFileClick(file)}
                                            >
                                                <span className="file-icon">📄</span>
                                                <span className="file-name">{fileName}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </li>
                    );
                })}
            </>
        );
    };

    return (
        <div className="file-explorer">
            <div className="file-explorer-header">
                <h3>Files</h3>
                <div className="file-actions">
                    <button
                        className="create-button"
                        onClick={handleCreateClick}
                        title="Create new file"
                    >
                        +
                    </button>
                    <button
                        className="delete-button"
                        onClick={handleDeleteClick}
                        disabled={!currentFile}
                        title="Delete current file"
                    >
                        🗑️
                    </button>
                </div>
            </div>

            {showCreateForm ? (
                <form className="create-file-form" onSubmit={handleSubmitCreate}>
                    <input
                        type="text"
                        placeholder="File name (e.g. folder/file.js)"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        required
                    />
                    <div className="form-actions">
                        <button type="button" onClick={handleCancelCreate}>Cancel</button>
                        <button type="submit">Create</button>
                    </div>
                </form>
            ) : (
                <ul className="file-list">
                    {files && files.length > 0 ? (
                        renderTree()
                    ) : (
                        <li className="empty-message">No files found</li>
                    )}
                </ul>
            )}
        </div>
    );
};

export default FileExplorer;
