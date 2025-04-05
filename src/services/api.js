// editor/src/services/api.js
const API_BASE_URL = process.env.REACT_APP_CODEBASE_URL || 'http://localhost:3020';

// Helper function for API calls
async function fetchApi(endpoint, options = {}) {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        credentials: 'include' // Important for session cookies
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {})
        }
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, mergedOptions);

        // Handle non-2xx responses
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                message: 'Unknown error occurred'
            }));

            throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
        }

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }

        return await response.text();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Session API
export const sessionApi = {
    // Get current session
    getCurrentSession: () => fetchApi('/api/sessions/current'),

    // Create new session
    createSession: () => fetchApi('/api/sessions', { method: 'POST' }),

    // Export session data
    exportSession: () => fetchApi('/api/sessions/export'),

    // Import session data
    importSession: (sessionData) => fetchApi('/api/sessions/import', {
        method: 'POST',
        body: JSON.stringify({ sessionData })
    }),

    // Create shareable link
    createShareLink: () => fetchApi('/api/sessions/share', { method: 'POST' })
};

// Project API
export const projectApi = {
    // Get all projects
    getProjects: () => fetchApi('/api/projects'),

    // Create a new project
    createProject: (name, description = '', template = 'default') => fetchApi('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name, description, template })
    }),

    // Get a specific project
    getProject: (projectId) => fetchApi(`/api/projects/${projectId}`),

    // Delete a project
    deleteProject: (projectId) => fetchApi(`/api/projects/${projectId}`, {
        method: 'DELETE'
    }),

    // Get project history
    getProjectHistory: (projectId) => fetchApi(`/api/projects/${projectId}/history`),

    // Get project files
    getProjectFiles: (projectId) => fetchApi(`/api/projects/${projectId}/files`)
};

// File API
export const fileApi = {
    // Get file content
    getFileContent: (projectId, filePath) => fetchApi(`/api/files/${projectId}/${filePath}`),

    // Save file content
    saveFile: (projectId, filePath, content, commitMessage) => fetchApi(`/api/files/${projectId}/${filePath}`, {
        method: 'PUT',
        body: JSON.stringify({ content, commitMessage })
    }),

    // Delete file
    deleteFile: (projectId, filePath, commitMessage) => fetchApi(`/api/files/${projectId}/${filePath}`, {
        method: 'DELETE',
        body: JSON.stringify({ commitMessage })
    }),

    // Get file history
    getFileHistory: (projectId, filePath) => fetchApi(`/api/files/${projectId}/${filePath}/history`)
};

export default {
    session: sessionApi,
    project: projectApi,
    file: fileApi
};
