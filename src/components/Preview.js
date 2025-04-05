// src/components/Preview.js
import React, { useEffect, useState } from 'react';
import config from '../config';

const Preview = ({ port }) => {
    const [isLoading, setIsLoading] = useState(true);

    // Zawsze używamy portu z props lub 3010 jako default
    const previewPort = port || 3010;

    // Create the preview URL
    const previewUrl = `${config.preview_protocol}://${config.preview_domain}:${previewPort}`;

    useEffect(() => {
        // Shorter loading state - just 1 second
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

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
                    Loading preview on port {previewPort}...
                </div>
            )}
            <iframe
                src={previewUrl}
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
