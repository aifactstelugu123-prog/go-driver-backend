import React from 'react';

const DocumentModal = ({ isOpen, onClose, filePath, title }) => {
    if (!isOpen) return null;

    const isPdf = filePath?.toLowerCase().endsWith('.pdf');
    // Ensure file path is correctly formatted for the server
    const fullUrl = filePath?.startsWith('http')
        ? filePath
        : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${filePath}`;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            backdropFilter: 'blur(5px)'
        }} onClick={onClose}>
            <div style={{
                position: 'relative',
                width: '90%',
                maxWidth: '1000px',
                maxHeight: '90vh',
                backgroundColor: 'var(--card-bg, #1e1e2d)',
                borderRadius: '16px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                border: '1px solid var(--border, rgba(255,255,255,0.1))'
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid var(--border, rgba(255,255,255,0.1))',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.02)'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>{title || 'Document View'}</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: 'none',
                            color: '#ef4444',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '1.2rem'
                        }}
                        onMouseEnter={e => e.target.style.background = 'rgba(239, 68, 68, 0.2)'}
                        onMouseLeave={e => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0f111a'
                }}>
                    {isPdf ? (
                        <iframe
                            src={fullUrl}
                            style={{ width: '100%', height: '70vh', border: 'none' }}
                            title={title}
                        />
                    ) : (
                        <img
                            src={fullUrl}
                            alt={title}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '75vh',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                            }}
                        />
                    )}
                </div>

                {/* Footer / Actions */}
                <div style={{
                    padding: '12px 24px',
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.02)',
                    borderTop: '1px solid var(--border, rgba(255,255,255,0.1))'
                }}>
                    <a
                        href={fullUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            fontSize: '0.85rem',
                            color: 'var(--accent-teal, #00d4aa)',
                            textDecoration: 'none',
                            fontWeight: 500
                        }}
                    >
                        🔗 Open in New Tab
                    </a>
                </div>
            </div>
        </div>
    );
};

export default DocumentModal;
