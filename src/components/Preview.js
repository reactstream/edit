// editor/src/components/Preview.js
import React, { useEffect, useState } from 'react';

const Preview = ({ port, previewUrl, projectId, filePath }) => {
    const [isLoading, setIsLoading] = useState(true);

    // Determine the preview URL based on props
    const getPreviewUrl = () => {
        if (previewUrl) {
            return previewUrl;
        }

        // Default URL with optional projectId and filePath
        let url = `http://localhost:${port || 3010}`;

        // Add query parameters if projectId and filePath are provided
        if (projectId) {
            url += `?projectId=${encodeURIComponent(projectId)}`;

            if (filePath) {
                url += `&filePath=${encodeURIComponent(filePath)}`;
            }
        }

        return url;
    };

    useEffect(() => {
        // Show loading state for 1 second
        setIsLoading(true);
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, [port, projectId, filePath]);

    return (
        <div className="preview-container" style={{ height: '100%', position: 'relative' }}>
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
                    background: 'rgba(255,255,255,0.8)',
                    zIndex: 10
                }}>
                    Loading preview...
                </div>
            )}
            <iframe
                src={getPreviewUrl()}
                title="Component Preview"
                style={{
                    width: '100%',
                    height: '100%',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    minHeight: '400px'
                }}
            />
        </div>
    );
};

export default Preview;
