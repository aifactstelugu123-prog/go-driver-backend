import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../config/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import axios from 'axios';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [role, setRole] = useState('owner'); // 'owner', 'driver', 'admin'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');

    // For new users needing phone registration
    const [requirePhone, setRequirePhone] = useState(false);
    const [googleToken, setGoogleToken] = useState('');
    const [phone, setPhone] = useState('');
    const [isWebView, setIsWebView] = useState(false);

    // Detect WebView
    useEffect(() => {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isAndroidWebView = /Android.*(wv|Version\/.*Chrome)/.test(userAgent);
        const isIosWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/.test(userAgent);
        setIsWebView(isAndroidWebView || isIosWebView);
    }, []);

    // Handle Redirect Result (Mobile)
    useEffect(() => {
        const checkRedirect = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (result) {
                    const idToken = await result.user.getIdToken();
                    handleAuthSuccess(idToken);
                }
            } catch (e) {
                console.error('Redirect Result Error:', e);
                // Only show error if it's not a "no result" case
                if (e.code !== 'auth/no-current-user') {
                    console.error('Redirect Result Detail:', e);
                    setError(`Login failed: ${e.message || 'Please try again.'} (${e.code || 'unknown'})`);
                }
            }
        };
        checkRedirect();
    }, [role]); // Role dependency ensures we use the correct role after redirect if it changed (though usually user selects first)

    const handleAuthSuccess = async (idToken) => {
        setLoading(true); setError('');
        try {
            const endpoint = `/auth/${role}/google-login`;
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

            const { data } = await axios.post(`${baseUrl}${endpoint}`, { idToken });

            if (data.requireRegistration) {
                navigate('/register/driver', { state: { googleToken: idToken, email: data.email, name: data.name } });
            } else if (data.requirePhone) {
                setGoogleToken(idToken);
                setRequirePhone(true);
                setMsg(`Welcome ${data.name}! Please provide your mobile number to complete registration.`);
            } else {
                login(data.token, data.user, data.role);
                navigate(role === 'admin' ? '/admin' : (role === 'owner' ? '/owner' : '/driver'));
            }
        } catch (e) {
            console.error('Auth Post Error:', e);
            setError(e.response?.data?.message || `Authentication failed: ${e.message || 'Network error'} (${e.code || 'api-error'})`);
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setLoading(true); setError(''); setMsg(''); setRequirePhone(false);
        try {
            const provider = new GoogleAuthProvider();
            // Using signInWithPopup for all devices as signInWithRedirect often fails due to 
            // cross-site tracking prevention in Safari/iOS and mobile WebViews.
            const result = await signInWithPopup(auth, provider);
            const idToken = await result.user.getIdToken();
            handleAuthSuccess(idToken);
        } catch (e) {
            console.error('Google Auth Error:', e);
            setError(`Authentication failed: ${e.message || 'Please try again.'} (${e.code || 'unknown'})`);
            if (e.code === 'auth/disallowed-useragent' || e.message?.includes('disallowed_useragent') || e.code === 'auth/popup-blocked') {
                setIsWebView(true);
            }
            setLoading(false);
        }
    };

    const handleExternalLogin = () => {
        const currentUrl = window.location.href;
        // Using intent for Android to force Chrome, or just window.open for others
        if (/Android/i.test(navigator.userAgent)) {
            const intentUrl = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
            window.location.href = intentUrl;
        } else {
            window.open(currentUrl, '_system');
        }
    };

    // Auto-restore role after redirect
    useEffect(() => {
        const savedRole = localStorage.getItem('pendingRole');
        if (savedRole && (savedRole === 'owner' || savedRole === 'driver' || savedRole === 'admin')) {
            setRole(savedRole);
            localStorage.removeItem('pendingRole');
        }
    }, []);

    const handlePhoneSubmit = async () => {
        if (!phone || phone.length !== 10) return setError('Enter a valid 10-digit phone number.');
        setLoading(true); setError('');
        try {
            const endpoint = `/auth/${role}/google-register`;
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

            const { data } = await axios.post(`${baseUrl}${endpoint}`, { idToken: googleToken, phone });

            login(data.token, data.user, data.role);
            navigate(role === 'owner' ? '/owner' : '/driver');
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to register phone number.');
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <div className="auth-logo-icon">🚗</div>
                    <div>
                        <h2>DaaS Platform</h2>
                        <span>Driver-as-a-Service</span>
                    </div>
                </div>

                {!requirePhone && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 28, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4, alignItems: 'center' }}>
                        {[['owner', '👤 Owner'], ['driver', '🚗 Driver'], ['admin', '🛡️ Admin']].map(([r, label]) => (
                            <button key={r} onClick={() => { setRole(r); setError(''); setMsg(''); }} style={{
                                flex: 1, padding: '8px 0', borderRadius: 9, fontSize: '0.82rem', fontWeight: 600,
                                background: role === r ? 'linear-gradient(135deg, #00d4aa, #00a882)' : 'transparent',
                                color: role === r ? '#000' : 'var(--text-secondary)', transition: 'all 0.2s',
                            }}>{label}</button>
                        ))}
                    </div>
                )}

                {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.85rem', color: '#ef4444' }}>{error}</div>}
                {msg && !error && <div style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.85rem', color: 'var(--accent-teal)' }}>{msg}</div>}

                {!requirePhone ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {isWebView && (
                            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '12px 14px', marginBottom: 8, fontSize: '0.82rem', color: '#f59e0b', textAlign: 'center', lineHeight: 1.5 }}>
                                ⚠️ <strong>App Restriction:</strong> Google login is blocked inside some apps.
                                <button onClick={handleExternalLogin} style={{
                                    display: 'block', width: '100%', marginTop: 10, background: 'var(--accent-gold)', color: '#000',
                                    border: 'none', borderRadius: 8, padding: '8px', fontWeight: 600, cursor: 'pointer'
                                }}>
                                    Open in Chrome to Login
                                </button>
                            </div>
                        )}

                        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                            Sign in to access your {role} dashboard.
                        </p>

                        <button onClick={handleGoogleLogin} disabled={loading} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                            background: '#fff', color: '#000', border: 'none', borderRadius: 12, padding: '14px',
                            fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', width: '100%'
                        }}>
                            {loading ? '⏳ Please wait...' : (
                                <>
                                    <svg width="24" height="24" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
                                    Sign in with Google
                                </>
                            )}
                        </button>

                        {role === 'driver' && (
                            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
                                New driver? <Link to="/register/driver" style={{ color: 'var(--accent-teal)' }}>Register here</Link>
                            </p>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">📱 Mobile Number</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600 }}>+91</span>
                                <input id="phone-input" className="form-input" type="tel" placeholder="10-digit number"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    onKeyDown={e => e.key === 'Enter' && handlePhoneSubmit()}
                                    style={{ paddingLeft: 48, fontFamily: 'monospace', fontSize: '1rem', fontWeight: 600, letterSpacing: '0.08em' }}
                                    maxLength={10} inputMode="numeric" />
                            </div>
                        </div>
                        <button className="btn btn-primary btn-lg" onClick={handlePhoneSubmit}
                            disabled={loading || phone.length !== 10} style={{ width: '100%', justifyContent: 'center' }}>
                            {loading ? '⏳ Saving...' : '✅ Complete Registration'}
                        </button>
                        <button onClick={() => { setRequirePhone(false); setGoogleToken(''); setError(''); setMsg(''); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0, fontSize: '0.85rem' }}>
                            ← Back
                        </button>
                    </div>
                )}

                <p style={{ marginTop: 24, textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    🔒 Secure authentication via Google
                </p>
            </div>
        </div>
    );
}
