import { useState, useEffect } from 'react';

export default function PermissionGuard({ children }) {
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const requested = localStorage.getItem('permissionsRequested');
        if (!requested) {
            setShowPrompt(true);
        }
    }, []);

    const requestPermissions = async () => {
        try {
            // Request Location
            await new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(resolve, resolve, { timeout: 10000 });
            });
            // Request Camera
            try {
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    stream.getTracks().forEach(track => track.stop());
                }
            } catch (err) {
                console.log('Camera permission denied', err);
            }
        } catch (e) {
            console.error(e);
        } finally {
            localStorage.setItem('permissionsRequested', 'true');
            setShowPrompt(false);
        }
    };

    return (
        <>
            {showPrompt && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(10,14,26,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div className="glass-card" style={{ maxWidth: 400, width: '100%', padding: 30, textAlign: 'center', animation: 'fadeIn 0.3s' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 16 }}>📍📷</div>
                        <h2 style={{ marginBottom: 12 }}>App Permissions Needed</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.5 }}>
                            To provide you with the best experience, Go Driver requires access to your <b>Location</b> for finding nearby rides and your <b>Camera</b> for document verification.
                        </p>
                        <button className="btn btn-primary btn-lg" onClick={requestPermissions} style={{ width: '100%', justifyContent: 'center' }}>
                            Allow Permissions
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => { localStorage.setItem('permissionsRequested', 'true'); setShowPrompt(false); }} style={{ width: '100%', justifyContent: 'center', marginTop: 12, border: 'none', background: 'transparent' }}>
                            Maybe Later
                        </button>
                    </div>
                </div>
            )}
            {children}
        </>
    );
}
