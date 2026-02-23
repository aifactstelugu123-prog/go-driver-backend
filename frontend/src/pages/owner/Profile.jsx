import { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import DocumentModal from '../../components/DocumentModal';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const apiFetch = async (url, method = 'GET', body) => {
    const res = await fetch(`${API_BASE}${url}`, {
        method, headers: { 'Content-Type': 'application/json', ...authHeader() },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return res.json();
};

const DOCS = [
    { key: 'photo', label: 'Profile Photo', icon: '🤳', accept: 'image/*' },
    { key: 'aadhaarCard', label: 'Aadhaar Card', icon: '🪪', accept: 'image/*,.pdf' },
    { key: 'panCard', label: 'PAN Card', icon: '💳', accept: 'image/*,.pdf' },
];

const statusColors = { pending: '#f59e0b', verified: '#10b981', rejected: '#ef4444' };
const statusIcons = { pending: '⏳', verified: '✅', rejected: '❌' };

export default function OwnerProfile() {
    const { updateUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('info');
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState({});
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');
    const fileRefs = useRef({});

    // Document Viewer State
    const [viewer, setViewer] = useState({ isOpen: false, path: '', title: '' });

    const load = async () => {
        const r = await apiFetch('/profile/owner');
        if (r.success) {
            setProfile(r.profile);
            setForm({
                email: r.profile.email || '',
                address: r.profile.address || '',
                dob: r.profile.dob ? r.profile.dob.slice(0, 10) : '',
                aadhaarNumber: r.profile.aadhaarNumber || '',
                panNumber: r.profile.panNumber || '',
            });
            updateUser(r.profile);
        }
        setLoading(false);
    };
    useEffect(() => { load(); }, []);

    const showMsg = (m, isErr = false) => {
        isErr ? setError(m) : setMsg(m);
        setTimeout(() => { setMsg(''); setError(''); }, 4000);
    };

    const saveProfile = async () => {
        setSaving(true);
        const r = await apiFetch('/profile/owner', 'PUT', form);
        r.success ? showMsg('Profile saved!') : showMsg(r.message, true);
        setSaving(false);
        load();
    };

    const uploadDoc = async (docKey, file) => {
        if (!file) return;
        if (file.size > 200 * 1024) return showMsg(`File too large! Max 200 KB. Your file: ${(file.size / 1024).toFixed(1)} KB`, true);
        setUploading(u => ({ ...u, [docKey]: true }));
        const fd = new FormData();
        fd.append(docKey, file);
        try {
            const res = await fetch(`${API_BASE}/profile/owner/upload/${docKey}`, {
                method: 'POST', headers: authHeader(), body: fd,
            });
            const data = await res.json();
            if (data.success) {
                showMsg(`${docKey} uploaded!`);
                // Force sync profilePhoto to AuthContext immediately
                if (docKey === 'photo') {
                    updateUser({ profilePhoto: data.filePath });
                }
                load(); // refresh local profile to show in KYC list
            } else {
                showMsg(data.message, true);
            }
            load();
        } catch {
            showMsg('Upload failed.', true);
        }
        setUploading(u => ({ ...u, [docKey]: false }));
    };

    const locked = profile?.profileLocked;
    const docs = profile?.documents || {};
    const verifiedCount = DOCS.filter(d => docs[d.key]?.status === 'verified').length;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>My Profile 👤</h1>
                    <p>Upload your KYC documents for admin verification.</p>
                </div>

                {/* Status banner */}
                {profile && (
                    <div style={{
                        display: 'flex', gap: 12, marginBottom: 20, padding: '14px 20px',
                        borderRadius: 12, alignItems: 'center',
                        background: locked ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                        border: `1px solid ${locked ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>{locked ? '🔒' : '✏️'}</span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: locked ? '#10b981' : '#f59e0b' }}>
                                {locked ? 'Profile Locked — Admin Verified' : 'Profile Editable'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {verifiedCount}/{DOCS.length} documents verified
                            </div>
                        </div>
                        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', marginLeft: 12 }}>
                            <div style={{ height: '100%', width: `${(verifiedCount / DOCS.length) * 100}%`, background: 'var(--accent-teal)', borderRadius: 99, transition: 'width 0.5s' }} />
                        </div>
                    </div>
                )}

                {msg && <div style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid var(--accent-teal)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--accent-teal)', fontSize: '0.85rem' }}>✅ {msg}</div>}
                {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: '0.85rem' }}>❌ {error}</div>}

                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    {[['info', '👤 Personal Info'], ['docs', '📄 KYC Documents']].map(([k, l]) => (
                        <button key={k} onClick={() => setTab(k)} className={`btn ${tab === k ? 'btn-primary' : 'btn-secondary'} btn-sm`}>{l}</button>
                    ))}
                </div>

                {loading ? <div className="loading-screen"><div className="spinner" /></div> : (<>

                    {tab === 'info' && (
                        <div className="glass-card" style={{ padding: 28 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                                <h3>Personal Information</h3>
                                {locked && <span style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: 20 }}>🔒 Locked</span>}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                {[['Name', profile.name], ['Phone', `+91 ${profile.phone}`]].map(([l, v]) => (
                                    <div key={l} className="form-group">
                                        <label className="form-label">{l}</label>
                                        <input className="form-input" value={v || '—'} disabled style={{ opacity: 0.6 }} />
                                    </div>
                                ))}
                                {[
                                    { key: 'email', label: 'Email', type: 'email', placeholder: 'your@email.com' },
                                    { key: 'dob', label: 'Date of Birth', type: 'date' },
                                    { key: 'aadhaarNumber', label: 'Aadhaar Number', placeholder: '12-digit Aadhaar' },
                                    { key: 'panNumber', label: 'PAN Number', placeholder: 'ABCDE1234F' },
                                ].map(f => (
                                    <div key={f.key} className="form-group">
                                        <label className="form-label">{f.label}</label>
                                        <input className="form-input" type={f.type || 'text'} placeholder={f.placeholder}
                                            value={form[f.key] || ''} disabled={locked}
                                            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                            style={{ opacity: locked ? 0.6 : 1 }} />
                                    </div>
                                ))}
                                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                    <label className="form-label">Address</label>
                                    <textarea className="form-input" rows={2} placeholder="Full address" disabled={locked}
                                        value={form.address || ''} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                                        style={{ opacity: locked ? 0.6 : 1, resize: 'none' }} />
                                </div>
                            </div>
                            {!locked && (
                                <button className="btn btn-primary" onClick={saveProfile} disabled={saving} style={{ marginTop: 20, width: '100%', justifyContent: 'center' }}>
                                    {saving ? 'Saving...' : '💾 Save Profile'}
                                </button>
                            )}
                            {locked && <div style={{ marginTop: 16, textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>🔒 Profile locked. Contact admin for changes.</div>}
                        </div>
                    )}

                    {tab === 'docs' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {DOCS.map(doc => {
                                const docData = docs[doc.key];
                                const verified = docData?.status === 'verified';
                                return (
                                    <div key={doc.key} className="glass-card" style={{
                                        padding: 20, display: 'flex', alignItems: 'center', gap: 16,
                                        border: `1px solid ${docData ? statusColors[docData.status] + '40' : 'var(--border)'}`,
                                    }}>
                                        {/* Photo preview or icon */}
                                        {doc.key === 'photo' && docData?.filePath ? (
                                            <img
                                                src={docData.filePath.startsWith('http')
                                                    ? docData.filePath
                                                    : `${API_BASE.replace('/api', '')}${docData.filePath}`
                                                }
                                                alt="Profile"
                                                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--accent-teal)', cursor: 'pointer' }}
                                                onClick={() => setViewer({ isOpen: true, path: docData.filePath, title: 'Profile Photo' })}
                                            />
                                        ) : (
                                            <div style={{ fontSize: '2rem', flexShrink: 0 }}>{doc.icon}</div>
                                        )}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{doc.label}</div>
                                            {docData?.uploadedAt && (
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                    Uploaded: {new Date(docData.uploadedAt).toLocaleDateString('en-IN')}
                                                </div>
                                            )}
                                            {!docData && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Not uploaded yet</div>}
                                        </div>
                                        {docData && (
                                            <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: `${statusColors[docData.status]}15`, color: statusColors[docData.status] }}>
                                                {statusIcons[docData.status]} {docData.status}
                                            </span>
                                        )}
                                        {docData?.filePath && (
                                            <button
                                                onClick={() => setViewer({ isOpen: true, path: docData.filePath, title: doc.label })}
                                                className="btn btn-secondary btn-sm"
                                                style={{ whiteSpace: 'nowrap' }}
                                            >
                                                👁️ View
                                            </button>
                                        )}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                            <input type="file" accept={doc.accept} ref={el => fileRefs.current[doc.key] = el}
                                                style={{ display: 'none' }} onChange={e => uploadDoc(doc.key, e.target.files[0])} />
                                            {!verified ? (
                                                <button className="btn btn-secondary btn-sm" onClick={() => fileRefs.current[doc.key]?.click()}
                                                    disabled={uploading[doc.key]} style={{ whiteSpace: 'nowrap' }}>
                                                    {uploading[doc.key] ? '⏳' : docData ? '🔄 Re-upload' : '⬆️ Upload'}
                                                </button>
                                            ) : (
                                                <div style={{ fontSize: '0.7rem', color: '#10b981', whiteSpace: 'nowrap' }}>✅ Verified</div>
                                            )}
                                            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Max 200 KB</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>)}
            </main>

            <DocumentModal
                isOpen={viewer.isOpen}
                onClose={() => setViewer({ ...viewer, isOpen: false })}
                filePath={viewer.path}
                title={viewer.title}
            />
        </div>
    );
}
