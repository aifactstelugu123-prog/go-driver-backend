import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../config/firebase';
import { GoogleAuthProvider, signInWithPopup, getRedirectResult, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [role, setRole] = useState('owner');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');

    // Mobile Phone flow (Firebase)
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [loginTab, setLoginTab] = useState('otp'); // 'otp' | 'password'
    const [password, setPassword] = useState('');

    // Email OTP flow
    const [email, setEmail] = useState('');
    const [emailOtp, setEmailOtp] = useState('');
    const [emailOtpSent, setEmailOtpSent] = useState(false);

    // Registration
    const [requireReg, setRequireReg] = useState(false);
    const [name, setName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [referralCode, setReferralCode] = useState(
        () => new URLSearchParams(window.location.search).get('ref') || ''
    );

    const [googleToken, setGoogleToken] = useState('');
    const [isWebView, setIsWebView] = useState(false);
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const startTimer = () => setTimer(60);

    const setupRecaptcha = (buttonId) => {
        try {
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
            }
            window.recaptchaVerifier = new RecaptchaVerifier(auth, buttonId || 'recaptcha-container', {
                'size': 'invisible',
                'callback': () => { console.log('Recaptcha resolved'); }
            });
        } catch (e) {
            console.error('Recaptcha Error:', e);
        }
    };

    useEffect(() => {
        const ua = navigator.userAgent || navigator.vendor || window.opera;
        setIsWebView(/Android.*(wv|Version\/.*Chrome)/.test(ua) || /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/.test(ua));
    }, []);

    useEffect(() => {
        const savedRole = localStorage.getItem('pendingRole');
        if (savedRole && ['owner', 'driver', 'admin'].includes(savedRole)) {
            setRole(savedRole);
            localStorage.removeItem('pendingRole');
        }
    }, []);

    useEffect(() => {
        getRedirectResult(auth).then(result => {
            if (result) result.user.getIdToken().then(handleGoogleSuccess);
        }).catch(() => {});
    }, [role]);

    const reset = () => {
        setError(''); setMsg(''); setOtp(''); setOtpSent(false); setTimer(0);
        setEmailOtp(''); setEmailOtpSent(false); setConfirmationResult(null);
        setRequireReg(false); setPassword(''); setNewPassword('');
    };

    // ── FIREBASE PHONE OTP ──────────────────────────────────────
    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();
        if (phone.length !== 10) return setError('Enter a valid 10-digit mobile number.');
        setSendingOtp(true); setError(''); setMsg('');
        
        try {
            setupRecaptcha('recaptcha-anchor');
            const formatPhone = `+91${phone}`;
            const confirmation = await signInWithPhoneNumber(auth, formatPhone, window.recaptchaVerifier);
            setConfirmationResult(confirmation);
            setOtpSent(true);
            setMsg(`OTP sent via SMS to +91 ${phone}`);
            startTimer();
        } catch (err) {
            console.error('[FIREBASE PHONE ERR]', err);
            setError(err.message.includes('reCAPTCHA') ? 'Security check failed. Please refresh.' : 'Failed to send SMS. Check your number or try again.');
        }
        setSendingOtp(false);
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) return setError('Enter the 6-digit OTP.');
        if (!confirmationResult) return setError('Session expired. Please request OTP again.');
        
        setLoading(true); setError(''); setMsg('');
        try {
            const result = await confirmationResult.confirm(otp);
            const idToken = await result.user.getIdToken();
            
            // Send token to backend for session create
            const { data } = await axios.post(`${BASE_URL}/auth/phone-login`, { idToken, role, referralCode });
            
            if (data.requireRegistration) {
                if (role === 'driver') {
                    navigate('/register/driver', { state: { phone, firebaseToken: idToken, referralCode } });
                } else {
                    setRequireReg(true);
                    setMsg('Welcome! Please enter your name to complete sign-up.');
                }
            } else {
                login(data.token, data.user, data.role);
                navigate(role === 'admin' ? '/admin' : role === 'owner' ? '/owner' : '/driver');
            }
        } catch (err) {
            console.error('[VERIFY ERR]', err);
            setError('Invalid OTP. Please check and try again.');
        }
        setLoading(false);
    };

    const handlePasswordLogin = async (e) => {
        e.preventDefault();
        if (phone.length !== 10) return setError('Enter a valid 10-digit mobile number.');
        if (!password) return setError('Enter your password.');
        setLoading(true); setError('');
        try {
            const { data } = await axios.post(`${BASE_URL}/auth/login-password`, { phone, password, role });
            login(data.token, data.user, data.role);
            navigate(role === 'admin' ? '/admin' : role === 'owner' ? '/owner' : '/driver');
        } catch (e) {
            setError(e.response?.data?.message || 'Invalid mobile number or password.');
        }
        setLoading(false);
    };

    // ── EMAIL OTP ────────────────────────────────────────────────
    const handleSendEmailOtp = async (e) => {
        if (e) e.preventDefault();
        if (!email) return setError('Enter your email address.');
        setSendingOtp(true); setError('');
        try {
            await axios.post(`${BASE_URL}/auth/send-otp`, { email });
            setMsg(`OTP sent to ${email}`);
            setEmailOtpSent(true);
            startTimer();
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to send OTP.');
        }
        setSendingOtp(false);
    };

    const handleVerifyEmailOtp = async (e) => {
        e.preventDefault();
        if (emailOtp.length !== 6) return setError('Enter the 6-digit OTP.');
        setLoading(true); setError('');
        try {
            const { data } = await axios.post(`${BASE_URL}/auth/verify-otp`, { email, otp: emailOtp, role, referralCode });
            if (data.requireRegistration) {
                if (role === 'driver') navigate('/register/driver', { state: { email, otp: emailOtp } });
                else { setRequireReg(true); setMsg('Enter your details to complete sign-up.'); }
            } else {
                login(data.token, data.user, data.role);
                navigate(role === 'admin' ? '/admin' : role === 'owner' ? '/owner' : '/driver');
            }
        } catch (e) {
            setError(e.response?.data?.message || 'Invalid or expired OTP.');
        }
        setLoading(false);
    };

    const handleCompleteReg = async () => {
        if (!name.trim()) return setError('Enter your full name.');
        setLoading(true); setError('');
        try {
            const result = await confirmationResult?.confirm(otp);
            const firebaseToken = result ? await result.user.getIdToken() : googleToken;

            const payload = { phone, email, emailOtp, role, name, referralCode, idToken: firebaseToken };
            if (newPassword) payload.password = newPassword;
            
            const url = googleToken ? `${BASE_URL}/auth/${role}/google-register` : `${BASE_URL}/auth/phone-login`;
            const { data } = await axios.post(url, payload);
            
            login(data.token, data.user, data.role);
            navigate(role === 'owner' ? '/owner' : '/driver');
        } catch (e) {
            console.error('REG FAIL', e);
            setError(e.response?.data?.message || 'Registration failed.');
        }
        setLoading(false);
    };

    // ── GOOGLE ───────────────────────────────────────────────────
    const handleGoogleLogin = async () => {
        setLoading(true); setError('');
        try {
            const result = await signInWithPopup(auth, new GoogleAuthProvider());
            await handleGoogleSuccess(await result.user.getIdToken());
        } catch (e) {
            setError(`Google login failed: ${e.message}`);
            if (e.code === 'auth/disallowed-useragent' || e.code === 'auth/popup-blocked') setIsWebView(true);
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (idToken) => {
        setLoading(true); setError('');
        try {
            const { data } = await axios.post(`${BASE_URL}/auth/${role}/google-login`, { idToken });
            if (data.requireRegistration) {
                navigate('/register/driver', { state: { googleToken: idToken, email: data.email, name: data.name, referralCode } });
            } else if (data.requirePhone) {
                setGoogleToken(idToken);
                setName(data.name || '');
                setRequireReg(true);
                setMsg(`Welcome ${data.name || ''}! Enter your mobile number to finish.`);
            } else {
                login(data.token, data.user, data.role);
                navigate(role === 'admin' ? '/admin' : role === 'owner' ? '/owner' : '/driver');
            }
        } catch (e) {
            setError(e.response?.data?.message || 'Google authentication failed.');
        }
        setLoading(false);
    };

    // ── REGISTRATION FORM ────────────────────────────────────────
    if (requireReg && !googleToken) {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-logo">
                        <div className="auth-logo-icon">🚗</div>
                        <div><h2>Create Account</h2><span>Almost there!</span></div>
                    </div>
                    {error && <div style={errStyle}>{error}</div>}
                    {msg && !error && <div style={msgStyle}>{msg}</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div className="form-group">
                            <label className="form-label">👤 Full Name *</label>
                            <input className="form-input" type="text" placeholder="Enter your full name"
                                value={name} onChange={e => setName(e.target.value)} autoFocus />
                        </div>
                        <div className="form-group">
                            <label className="form-label">🔑 Set Password <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span></label>
                            <input className="form-input" type="password" placeholder="e.g. Aaaa@1234"
                                value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                            <small style={{ color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>Set a strong password to login without OTP next time.</small>
                        </div>
                        <div className="form-group">
                            <label className="form-label">🎁 Referral Code <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span></label>
                            <input className="form-input" type="text" placeholder="e.g. OWN123"
                                value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())}
                                style={{ fontFamily: 'monospace', letterSpacing: '0.08em' }} maxLength={15} />
                        </div>
                        <button className="btn btn-primary btn-lg" onClick={handleCompleteReg}
                            disabled={loading || !name.trim()} style={{ width: '100%', justifyContent: 'center' }}>
                            {loading ? '⏳ Creating account...' : '🚀 Create Account & Sign In'}
                        </button>
                        <button onClick={() => { setRequireReg(false); reset(); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            ← Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (requireReg && googleToken) {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-logo">
                        <div className="auth-logo-icon">🚗</div>
                        <div><h2>One More Step</h2><span>Link your mobile number</span></div>
                    </div>
                    {error && <div style={errStyle}>{error}</div>}
                    {msg && !error && <div style={msgStyle}>{msg}</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div className="form-group">
                            <label className="form-label">📱 Mobile Number *</label>
                            <div style={{ position: 'relative' }}>
                                <span style={prefixStyle}>+91</span>
                                <input className="form-input" type="tel" placeholder="10-digit number"
                                    value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    style={{ paddingLeft: 48, fontFamily: 'monospace', fontWeight: 600 }}
                                    maxLength={10} inputMode="numeric" autoFocus />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">🎁 Referral Code <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span></label>
                            <input className="form-input" type="text" placeholder="e.g. OWN123"
                                value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())}
                                style={{ fontFamily: 'monospace', letterSpacing: '0.08em' }} maxLength={15} />
                        </div>
                        <button className="btn btn-primary btn-lg" onClick={handleSendOtp}
                            disabled={loading || phone.length !== 10} style={{ width: '100%', justifyContent: 'center' }}>
                            {loading ? '⏳ Saving...' : '✅ Send Phone Verification'}
                        </button>
                        <div id="recaptcha-anchor"></div>
                        <button onClick={() => { setRequireReg(false); setGoogleToken(''); reset(); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            ← Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── MAIN LOGIN PAGE ──────────────────────────────────────────
    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <div className="auth-logo-icon">🚗</div>
                    <div><h2>DaaS Platform</h2><span>Driver-as-a-Service</span></div>
                </div>

                {/* Role Tabs */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
                    {[['owner', '👤 Owner'], ['driver', '🚗 Driver'], ['admin', '🛡️ Admin']].map(([r, label]) => (
                        <button key={r} onClick={() => { setRole(r); reset(); }} style={{
                            flex: 1, padding: '8px 0', borderRadius: 9, fontSize: '0.82rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                            background: role === r ? 'linear-gradient(135deg, #00d4aa, #00a882)' : 'transparent',
                            color: role === r ? '#000' : 'var(--text-secondary)', transition: 'all 0.2s',
                        }}>{label}</button>
                    ))}
                </div>

                {error && <div style={errStyle}>{error}</div>}
                {msg && !error && <div style={msgStyle}>{msg}</div>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    
                    {/* 1. GOOGLE LOGIN */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <button onClick={handleGoogleLogin} disabled={loading} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                            background: '#fff', color: '#000', border: 'none', borderRadius: 12, padding: '14px',
                            fontSize: '1rem', fontWeight: 600, cursor: 'pointer', width: '100%',
                        }}>
                            {loading && !phone && !email ? '⏳ Please wait...' : (
                                <>
                                    <svg width="22" height="22" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
                                    Sign in with Google
                                </>
                            )}
                        </button>
                    </div>

                    <Divider>OR</Divider>

                    {/* 2. MOBILE LOGIN (Firebase) */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px' }}>
                        {!otpSent ? (
                            <form onSubmit={handleSendOtp}>
                                <div style={{ display: 'flex', gap: 0, marginBottom: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3 }}>
                                    {[['otp', '📱 OTP Login'], ['password', '🔑 Password']].map(([t, label]) => (
                                        <button key={t} type="button" onClick={() => { setLoginTab(t); setError(''); }} style={{
                                            flex: 1, padding: '6px 0', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                                            background: loginTab === t ? 'rgba(0,212,170,0.15)' : 'transparent',
                                            color: loginTab === t ? 'var(--accent-teal)' : 'var(--text-muted)', transition: 'all 0.2s',
                                        }}>{label}</button>
                                    ))}
                                </div>
                                <div className="form-group" style={{ margin: '0 0 12px' }}>
                                    <div style={{ position: 'relative' }}>
                                        <span style={prefixStyle}>+91</span>
                                        <input className="form-input" type="tel" placeholder="10-digit mobile"
                                            value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            style={{ paddingLeft: 48, fontFamily: 'monospace', fontWeight: 700 }}
                                            maxLength={10} inputMode="numeric" required />
                                    </div>
                                </div>
                                {loginTab === 'password' && (
                                    <div className="form-group" style={{ margin: '0 0 12px' }}>
                                        <input type="password" className="form-input" placeholder="Password"
                                            value={password} onChange={e => setPassword(e.target.value)} required />
                                    </div>
                                )}
                                <div id="recaptcha-anchor"></div>
                                <button type="submit" className="btn btn-primary" disabled={sendingOtp || loading} style={{ width: '100%', justifyContent: 'center' }}>
                                    {loginTab === 'otp' ? (sendingOtp ? '⏳ Sending...' : 'Continue with Mobile →') : (loading ? 'Logging in...' : 'Sign In with Password')}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Enter OTP sent to +91 {phone}</label>
                                    <input type="text" className="form-input" placeholder="Enter 6-digit OTP"
                                        value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        maxLength={6} autoFocus required
                                        style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '8px', fontWeight: 'bold' }} />
                                </div>
                                <button type="submit" className="btn btn-primary" disabled={loading || otp.length !== 6} style={{ width: '100%', justifyContent: 'center' }}>
                                    {loading ? '⏳ Verifying...' : 'Verify & Sign In'}
                                </button>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setTimer(0); }} style={subBtnStyle}>← Back</button>
                                    <button type="button" onClick={handleSendOtp} disabled={timer > 0} style={{ ...subBtnStyle, color: timer > 0 ? 'var(--text-muted)' : 'var(--accent-teal)' }}>
                                        {timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    <Divider>OR</Divider>

                    {/* 3. EMAIL LOGIN */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px' }}>
                        {!emailOtpSent ? (
                            <form onSubmit={handleSendEmailOtp}>
                                <div className="form-group" style={{ margin: '0 0 12px' }}>
                                    <input type="email" className="form-input" placeholder="Email Address"
                                        value={email} onChange={e => setEmail(e.target.value)} required />
                                </div>
                                <button type="submit" className="btn btn-secondary" disabled={sendingOtp} style={{ width: '100%', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
                                    {sendingOtp ? 'Sending...' : 'Continue with Email ✉️'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyEmailOtp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label" style={{ fontSize: '0.75rem' }}>OTP sent to {email}</label>
                                    <input type="text" className="form-input" placeholder="6-digit OTP"
                                        value={emailOtp} onChange={e => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        maxLength={6} autoFocus required
                                        style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '8px', fontWeight: 'bold' }} />
                                </div>
                                <button type="submit" className="btn btn-primary" disabled={loading || emailOtp.length !== 6} style={{ width: '100%', justifyContent: 'center' }}>
                                    Verify Email OTP
                                </button>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <button type="button" onClick={() => { setEmailOtpSent(false); setEmailOtp(''); setTimer(0); }} style={subBtnStyle}>← Back</button>
                                    <button type="button" onClick={handleSendEmailOtp} disabled={timer > 0} style={{ ...subBtnStyle, color: timer > 0 ? 'var(--text-muted)' : 'var(--accent-teal)' }}>
                                        {timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                </div>

                {role === 'driver' && (
                    <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 20 }}>
                        New driver? <Link to="/register/driver" style={{ color: 'var(--accent-teal)' }}>Register here</Link>
                    </p>
                )}

                <p style={{ marginTop: 24, textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.5 }}>
                    Protected by reCAPTCHA and Subject to Privacy Policy
                </p>
            </div>
        </div>
    );
}

const Divider = ({ children }) => (
    <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, opacity: 0.5 }}>
        <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <span style={{ padding: '0 12px' }}>{children}</span>
        <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
    </div>
);

const prefixStyle = {
    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
    color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.95rem',
};
const errStyle = {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 10, padding: '12px', marginBottom: 16, fontSize: '0.85rem', color: '#ef4444',
};
const msgStyle = {
    background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)',
    borderRadius: 10, padding: '12px', marginBottom: 16, fontSize: '0.85rem', color: 'var(--accent-teal)',
};
const subBtnStyle = {
    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', padding: '8px 0'
};
