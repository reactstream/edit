// editor/src/components/ProjectSelector.js
import React, { useState } from 'react';
import './ProjectSelector.css';

const ProjectSelector = ({ projects, currentProject, onProjectChange, onCreateProject }) => {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDescription, setNewProjectDescription] = useState('');

    const handleProjectClick = (project) => {
        if (project.id !== currentProject?.id) {
            onProjectChange(project);
        }
    };

    const handleCreateClick = () => {
        setShowCreateForm(true);
    };

    const handleCancelCreate = () => {
        setShowCreateForm(false);
        setNewProjectName('');
        setNewProjectDescription('');
    };

    const handleSubmitCreate = (e) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;

        onCreateProject(newProjectName, newProjectDescription);
        setShowCreateForm(false);
        setNewProjectName('');
        setNewProjectDescription('');
    };

    return (
        <div className="project-selector">
            <div className="project-selector-header">
                <h3>Projects</h3>
                <button className="create-button" onClick={handleCreateClick}>+</button>
            </div>

            {showCreateForm ? (
                <form className="create-project-form" onSubmit={handleSubmitCreate}>
                    <input
                        type="text"
                        placeholder="Project name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        required
                    />
                    <textarea
                        placeholder="Description (optional)"
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        rows={3}
                    />
                    <div className="form-actions">
                        <button type="button" onClick={handleCancelCreate}>Cancel</button>
                        <button type="submit">Create</button>
                    </div>
                </form>
            ) : (
                <ul className="project-list">
                    {projects && projects.length > 0 ? (
                        projects.map(project => (
                            <li
                                key={project.id}
                                className={currentProject?.id === project.id ? 'active' : ''}
                                onClick={() => handleProjectClick(project)}
                            >
                                <span className="project-name">{project.name}</span>
                                <span className="project-date">{new Date(project.updatedAt).toLocaleDateString()}</span>
                            </li>
                        ))
                    ) : (
                        <li className="empty-message">No projects found</li>
                    )}
                </ul>
            )}
        </div>
    );
};

export default ProjectSelector;
