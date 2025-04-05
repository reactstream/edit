// editor/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Editor from './components/Editor';
import Console from './components/Console';
import Preview from './components/Preview';
import ProjectSelector from './components/ProjectSelector';
import FileExplorer from './components/FileExplorer';
import Header from './components/Header';
import api from './services/api';
import './App.css';

function App() {
    const [currentProject, setCurrentProject] = useState(null);
    const [currentFile, setCurrentFile] = useState(null);
    const [code, setCode] = useState('');
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [files, setFiles] = useState([]);
    const [previewKey, setPreviewKey] = useState(Date.now());
    const [sessionInfo, setSessionInfo] = useState(null);

    // Initialize session and load projects
    useEffect(() => {
        const initialize = async () => {
            try {
                // Get current session
                const sessionResponse = await api.session.getCurrentSession();
                setSessionInfo(sessionResponse.session);
                setLogs(prev => [...prev, { type: 'info', message: `Session loaded: ${sessionResponse.session.id}` }]);

                // Load projects
                const projectsResponse = await api.project.getProjects();
                setProjects(projectsResponse.projects || []);

                // If there are no projects, create a default one
                if (!projectsResponse.projects || projectsResponse.projects.length === 0) {
                    const newProject = await api.project.createProject('Default Project', 'A default project created automatically');
                    setProjects([newProject.project]);
                    setCurrentProject(newProject.project);

                    // Load files for the new project
                    const filesResponse = await api.project.getProjectFiles(newProject.project.id);
                    setFiles(filesResponse.files || []);

                    // Select first file if available
                    if (filesResponse.files && filesResponse.files.length > 0) {
                        setCurrentFile(filesResponse.files[0]);
                        const fileContent = await api.file.getFileContent(newProject.project.id, filesResponse.files[0].path);
                        setCode(fileContent);
                    }
                } else {
                    // Select the first project
                    setCurrentProject(projectsResponse.projects[0]);

                    // Load files for the selected project
                    const filesResponse = await api.project.getProjectFiles(projectsResponse.projects[0].id);
                    setFiles(filesResponse.files || []);

                    // Select first file if available
                    if (filesResponse.files && filesResponse.files.length > 0) {
                        setCurrentFile(filesResponse.files[0]);
                        const fileContent = await api.file.getFileContent(
                            projectsResponse.projects[0].id,
                            filesResponse.files[0].path
                        );
                        setCode(fileContent);
                    }
                }
            } catch (error) {
                setLogs(prev => [...prev, { type: 'error', message: `Initialization error: ${error.message}` }]);
            } finally {
                setIsLoading(false);
            }
        };

        initialize();
    }, []);

    // Update files list when current project changes
    useEffect(() => {
        if (!currentProject) return;

        const loadProjectFiles = async () => {
            try {
                const filesResponse = await api.project.getProjectFiles(currentProject.id);
                setFiles(filesResponse.files || []);

                // Clear current file if it doesn't belong to the current project
                setCurrentFile(null);
                setCode('');
            } catch (error) {
                setLogs(prev => [...prev, { type: 'error', message: `Error loading files: ${error.message}` }]);
            }
        };

        loadProjectFiles();
    }, [currentProject]);

    // Load file content when current file changes
    useEffect(() => {
        if (!currentProject || !currentFile) return;

        const loadFileContent = async () => {
            try {
                const fileContent = await api.file.getFileContent(currentProject.id, currentFile.path);
                setCode(fileContent);
                setLogs(prev => [...prev, { type: 'info', message: `File loaded: ${currentFile.path}` }]);
            } catch (error) {
                setLogs(prev => [...prev, { type: 'error', message: `Error loading file: ${error.message}` }]);
            }
        };

        loadFileContent();
    }, [currentProject, currentFile]);

    // Handle project selection
    const handleProjectChange = (project) => {
        setCurrentProject(project);
        setLogs(prev => [...prev, { type: 'info', message: `Project selected: ${project.name}` }]);
    };

    // Handle file selection
    const handleFileChange = (file) => {
        setCurrentFile(file);
    };

    // Handle code changes
    const handleCodeChange = (newCode) => {
        setCode(newCode);
    };

    // Save current file
    const handleSaveFile = async () => {
        if (!currentProject || !currentFile) {
            setLogs(prev => [...prev, { type: 'error', message: 'No file selected' }]);
            return;
        }

        try {
            await api.file.saveFile(
                currentProject.id,
                currentFile.path,
                code,
                `Update ${currentFile.path}`
            );

            setLogs(prev => [...prev, { type: 'success', message: `File saved: ${currentFile.path}` }]);

            // Refresh preview
            setPreviewKey(Date.now());
        } catch (error) {
            setLogs(prev => [...prev, { type: 'error', message: `Error saving file: ${error.message}` }]);
        }
    };

    // Create a new file
    const handleCreateFile = async (fileName) => {
        if (!currentProject) {
            setLogs(prev => [...prev, { type: 'error', message: 'No project selected' }]);
            return;
        }

        try {
            await api.file.saveFile(
                currentProject.id,
                fileName,
                '// New file',
                `Create ${fileName}`
            );

            setLogs(prev => [...prev, { type: 'success', message: `File created: ${fileName}` }]);

            // Refresh file list
            const filesResponse = await api.project.getProjectFiles(currentProject.id);
            setFiles(filesResponse.files || []);

            // Select the new file
            const newFile = filesResponse.files.find(f => f.path === fileName);
            if (newFile) {
                setCurrentFile(newFile);
            }
        } catch (error) {
            setLogs(prev => [...prev, { type: 'error', message: `Error creating file: ${error.message}` }]);
        }
    };

    // Delete the current file
    const handleDeleteFile = async () => {
        if (!currentProject || !currentFile) {
            setLogs(prev => [...prev, { type: 'error', message: 'No file selected' }]);
            return;
        }

        try {
            await api.file.deleteFile(
                currentProject.id,
                currentFile.path,
                `Delete ${currentFile.path}`
            );

            setLogs(prev => [...prev, { type: 'success', message: `File deleted: ${currentFile.path}` }]);

            // Refresh file list
            const filesResponse = await api.project.getProjectFiles(currentProject.id);
            setFiles(filesResponse.files || []);

            // Clear current file
            setCurrentFile(null);
            setCode('');
        } catch (error) {
            setLogs(prev => [...prev, { type: 'error', message: `Error deleting file: ${error.message}` }]);
        }
    };

    // Create a new project
    const handleCreateProject = async (name, description) => {
        try {
            const newProject = await api.project.createProject(name, description);

            // Add new project to list
            setProjects(prev => [...prev, newProject.project]);

            // Select the new project
            setCurrentProject(newProject.project);

            setLogs(prev => [...prev, { type: 'success', message: `Project created: ${name}` }]);
        } catch (error) {
            setLogs(prev => [...prev, { type: 'error', message: `Error creating project: ${error.message}` }]);
        }
    };

    return (
        <Router>
            <div className="app-container">
                <Header
                    currentProject={currentProject}
                    currentFile={currentFile}
                    onSave={handleSaveFile}
                    sessionInfo={sessionInfo}
                />

                <div className="main-content">
                    <div className="sidebar">
                        <ProjectSelector
                            projects={projects}
                            currentProject={currentProject}
                            onProjectChange={handleProjectChange}
                            onCreateProject={handleCreateProject}
                        />

                        <FileExplorer
                            files={files}
                            currentFile={currentFile}
                            onFileChange={handleFileChange}
                            onCreateFile={handleCreateFile}
                            onDeleteFile={handleDeleteFile}
                        />
                    </div>

                    <div className="editor-section">
                        <Editor
                            value={code}
                            onChange={handleCodeChange}
                            language={currentFile ? getLanguageFromFilePath(currentFile.path) : 'javascript'}
                            isLoading={isLoading}
                        />
                    </div>

                    <div className="preview-section">
                        <Preview
                            port={3010}
                            key={previewKey}
                            projectId={currentProject?.id}
                            filePath={currentFile?.path}
                        />
                    </div>
                </div>

                <div className="console-section">
                    <Console logs={logs} />
                </div>
            </div>
        </Router>
    );
}

// Helper function to determine language based on file extension
function getLanguageFromFilePath(filePath) {
    if (!filePath) return 'javascript';

    const ext = filePath.split('.').pop().toLowerCase();

    switch (ext) {
        case 'js':
        case 'jsx':
            return 'javascript';
        case 'ts':
        case 'tsx':
            return 'typescript';
        case 'html':
            return 'html';
        case 'css':
            return 'css';
        case 'json':
            return 'json';
        case 'md':
            return 'markdown';
        default:
            return 'javascript';
    }
}

export default App;
