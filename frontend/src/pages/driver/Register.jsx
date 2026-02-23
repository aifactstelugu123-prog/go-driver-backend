import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { registerDriver } from '../../services/api';
import { auth } from '../../config/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const VEHICLE_SKILLS = ['Car', 'SUV', 'Luxury', 'Mini Truck', 'Heavy Vehicle'];
const steps = ['Basic Info', 'Documents', 'Skills & Location'];

export default function DriverRegister() {
    const navigate = useNavigate();
    const location = useLocation();

    const initialState = location.state || {};

    const [step, setStep] = useState(0);
    const [form, setForm] = useState({
        name: initialState.name || '',
        phone: '',
        aadhaarNumber: '',
        vehicleSkills: [],
        homeLat: '', homeLng: '',
    });

    const [googleToken, setGoogleToken] = useState(initialState.googleToken || null);

    const [files, setFiles] = useState({ drivingLicense: null, tenthCertificate: null, photo: null });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const toggleSkill = (skill) => {
        setForm(f => ({
            ...f,
            vehicleSkills: f.vehicleSkills.includes(skill)
                ? f.vehicleSkills.filter(s => s !== skill)
                : [...f.vehicleSkills, skill]
        }));
    };

    const handleGoogleLogin = async () => {
        setLoading(true); setError('');
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const idToken = await result.user.getIdToken();
            setGoogleToken(idToken);
            if (!form.name) {
                setForm(f => ({ ...f, name: result.user.displayName || '' }));
            }
        } catch (e) {
            console.error('Google Auth Error:', e);
            setError('Google Authentication failed. Please try again.');
        }
        setLoading(false);
    };

    const handleNextStep0 = () => {
        if (!form.name || form.phone.length !== 10 || form.aadhaarNumber.length !== 12) {
            return setError('Please fill all fields correctly. Phone: 10 digits, Aadhaar: 12 digits.');
        }
        setError('');
        setStep(1);
    };

    const handleSubmit = async () => {
        if (form.vehicleSkills.length === 0) return setError('Select at least one vehicle skill.');
        if (!form.homeLat || !form.homeLng) return setError('Please enter your home location.');
        if (!googleToken) return setError('Google Account not linked.');

        setLoading(true); setError('');
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => {
                if (Array.isArray(v)) fd.append(k, JSON.stringify(v));
                else fd.append(k, v);
            });
            if (files.photo) fd.append('photo', files.photo);
            if (files.drivingLicense) fd.append('drivingLicense', files.drivingLicense);
            if (files.tenthCertificate) fd.append('tenthCertificate', files.tenthCertificate);

            // Append Google Token
            fd.append('googleToken', googleToken);

            await registerDriver(fd);
            setSuccess(true);
        } catch (e) {
            setError(e.response?.data?.message || 'Registration failed.');
        }
        setLoading(false);
    };

    if (success) {
        return (
            <div className="auth-page">
                <div className="auth-card" style={{ textAlign: 'center', maxWidth: 480 }}>
                    <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎉</div>
                    <h2 style={{ marginBottom: 12, color: 'var(--accent-teal)' }}>Registration Submitted!</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.7 }}>
                        Your application has been sent to the admin for review. You'll be able to login once your account is <strong style={{ color: 'var(--text-primary)' }}>approved</strong>.
                    </p>
                    <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: '0.85rem', color: '#f59e0b' }}>
                        ⏳ Admin approval typically takes 24–48 hours.
                    </div>
                    <Link to="/login" className="btn btn-primary btn-lg" style={{ display: 'inline-flex', justifyContent: 'center', width: '100%' }}>
                        → Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 40 }}>
            <div className="auth-card" style={{ maxWidth: 520 }}>
                <div className="auth-logo">
                    <div className="auth-logo-icon">🧑‍✈️</div>
                    <div><h2>Driver Registration</h2><span>Join the DaaS Platform</span></div>
                </div>

                {/* Step Progress */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
                    {steps.map((s, i) => (
                        <div key={s} style={{ flex: 1 }}>
                            <div style={{ height: 4, borderRadius: 2, background: i <= step ? 'var(--accent-teal)' : 'var(--border)', transition: 'all 0.3s' }} />
                            <div style={{ fontSize: '0.68rem', marginTop: 6, color: i <= step ? 'var(--accent-teal)' : 'var(--text-muted)', fontWeight: i === step ? 600 : 400 }}>{s}</div>
                        </div>
                    ))}
                </div>

                {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: '0.85rem' }}>{error}</div>}

                {/* Step 0: Basic Info & Google Link */}
                {step === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {!googleToken ? (
                            <>
                                <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    First, link your Google account for secure login.
                                </p>
                                <button onClick={handleGoogleLogin} disabled={loading} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                                    background: '#fff', color: '#000', border: 'none', borderRadius: 12, padding: '14px',
                                    fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', width: '100%'
                                }}>
                                    {loading ? '⏳ Please wait...' : 'Sign in with Google'}
                                </button>
                            </>
                        ) : (
                            <>
                                <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(0,212,170,0.1)', borderRadius: 8, color: 'var(--accent-teal)', fontSize: '0.9rem', fontWeight: 500 }}>
                                    ✅ Google Account Linked
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Full Name *</label>
                                    <input className="form-input" placeholder="As on Aadhaar" value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">📱 Mobile Number *</label>
                                    <input className="form-input" type="tel" placeholder="10-digit number" value={form.phone}
                                        onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} maxLength={10} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Aadhaar Number *</label>
                                    <input className="form-input" type="text" placeholder="12-digit Aadhaar" value={form.aadhaarNumber}
                                        onChange={e => setForm({ ...form, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) })} maxLength={12} />
                                </div>
                                <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                                    onClick={handleNextStep0} disabled={loading}>
                                    Next: Upload Documents →
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Step 1: Documents */}
                {step === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {[
                            { key: 'photo', label: '🤳 Profile Photo', hint: 'Clear face photo (JPG/PNG)' },
                            { key: 'drivingLicense', label: '🪪 Driving License', hint: 'Front side (JPG/PNG/PDF)' },
                            { key: 'tenthCertificate', label: '📄 10th Pass Certificate', hint: 'Marksheet (JPG/PNG/PDF)' },
                        ].map(({ key, label, hint }) => (
                            <div key={key} className="form-group">
                                <label className="form-label">{label}</label>
                                <div style={{ border: `2px dashed ${files[key] ? 'var(--accent-teal)' : 'var(--border)'}`, borderRadius: 10, padding: 16, textAlign: 'center', transition: 'all 0.2s', background: files[key] ? 'rgba(0,212,170,0.05)' : 'transparent' }}>
                                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }} id={`file-${key}`}
                                        onChange={e => setFiles({ ...files, [key]: e.target.files[0] })} />
                                    <label htmlFor={`file-${key}`} style={{ cursor: 'pointer' }}>
                                        <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{files[key] ? '✅' : '📁'}</div>
                                        <div style={{ fontSize: '0.8rem', color: files[key] ? 'var(--accent-teal)' : 'var(--text-muted)' }}>
                                            {files[key] ? files[key].name : hint}
                                        </div>
                                    </label>
                                </div>
                            </div>
                        ))}
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-secondary" onClick={() => setStep(0)} style={{ flex: 1, justifyContent: 'center' }}>← Back</button>
                            <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}
                                onClick={() => { setError(''); setStep(2); }}>
                                Next →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Skills & Location */}
                {step === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Vehicle Skills * (select all you can drive)</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                                {VEHICLE_SKILLS.map(skill => (
                                    <button type="button" key={skill} onClick={() => toggleSkill(skill)}
                                        style={{
                                            padding: '10px 12px', borderRadius: 10,
                                            border: `2px solid ${form.vehicleSkills.includes(skill) ? 'var(--accent-teal)' : 'var(--border)'}`,
                                            background: form.vehicleSkills.includes(skill) ? 'rgba(0,212,170,0.12)' : 'var(--bg-card)',
                                            color: form.vehicleSkills.includes(skill) ? 'var(--accent-teal)' : 'var(--text-secondary)',
                                            fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                                        }}>
                                        {form.vehicleSkills.includes(skill) ? '✅ ' : ''}{skill}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">🏠 Home Location (for return charge calc)</label>
                            <div className="grid-2">
                                <input className="form-input" type="number" step="any" placeholder="Latitude" value={form.homeLat}
                                    onChange={e => setForm({ ...form, homeLat: e.target.value })} />
                                <input className="form-input" type="number" step="any" placeholder="Longitude" value={form.homeLng}
                                    onChange={e => setForm({ ...form, homeLng: e.target.value })} />
                            </div>
                            <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}
                                onClick={() => navigator.geolocation.getCurrentPosition(p => {
                                    setForm(f => ({ ...f, homeLat: p.coords.latitude.toFixed(6), homeLng: p.coords.longitude.toFixed(6) }));
                                })}>
                                🎯 Use Current Location
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ flex: 1, justifyContent: 'center' }}>← Back</button>
                            <button id="submit-driver-reg" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={handleSubmit} disabled={loading}>
                                {loading ? 'Submitting...' : '🚀 Submit Application'}
                            </button>
                        </div>
                    </div>
                )}

                <p style={{ marginTop: 20, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Already registered? <Link to="/login" style={{ color: 'var(--accent-teal)' }}>Login here</Link>
                </p>
            </div>
        </div>
    );
}
