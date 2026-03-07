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
    { key: 'drivingLicense', label: 'Driving License', icon: '🚗', accept: 'image/*,.pdf' },
    { key: 'tenthCertificate', label: '10th Certificate', icon: '🎓', accept: 'image/*,.pdf' },
    { key: 'policeVerification', label: 'Police Verification', icon: '👮', accept: 'image/*,.pdf' },
    { key: 'rcBook', label: 'RC Book', icon: '📋', accept: 'image/*,.pdf' },
];

const statusColors = { pending: '#f59e0b', verified: '#10b981', rejected: '#ef4444' };
const statusIcons = { pending: '⏳', verified: '✅', rejected: '❌' };

export default function DriverProfile() {
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

    // Document Edit Request State
    const [requestModal, setRequestModal] = useState({ isOpen: false, reason: 'Wrong document', description: '' });
    const [submittingLock, setSubmittingLock] = useState(false);

    const load = async () => {
        const r = await apiFetch('/profile/driver');
        if (r.success) {
            setProfile(r.profile);
            setForm({
                email: r.profile.email || '',
                address: r.profile.address || '',
                dob: r.profile.dob ? r.profile.dob.slice(0, 10) : '',
                aadhaarNumber: r.profile.aadhaarNumber || '',
                panNumber: r.profile.panNumber || '',
                licenseNumber: r.profile.licenseNumber || '',
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
        const r = await apiFetch('/profile/driver', 'PUT', form);
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
            const res = await fetch(`${API_BASE}/profile/driver/upload/${docKey}`, {
                method: 'POST', headers: authHeader(), body: fd,
            });
            const data = await res.json();
            if (data.success) {
                showMsg(`${docKey} uploaded successfully!`);
                if (docKey === 'photo') {
                    updateUser({ profilePhoto: data.filePath });
                }
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
    const docsLocked = profile?.documents_locked;
    const editStatus = profile?.edit_request_status;
    const docs = profile?.documents || {};

    const allVerified = DOCS.every(d => docs[d.key]?.status === 'verified');
    const uploadedCount = DOCS.filter(d => docs[d.key]?.filePath).length;
    const verifiedCount = DOCS.filter(d => docs[d.key]?.status === 'verified').length;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>My Profile 👤</h1>
                    <p>Upload your documents for admin verification. Profile locks after verification.</p>
                </div>

                {/* Status banner */}
                {profile && (
                    <div style={{
                        display: 'flex', gap: 12, marginBottom: 20, padding: '14px 20px',
                        borderRadius: 12, alignItems: 'center',
                        background: (locked || docsLocked) ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                        border: `1px solid ${(locked || docsLocked) ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>{(locked || docsLocked) ? '🔒' : '✏️'}</span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: (locked || docsLocked) ? '#10b981' : '#f59e0b' }}>
                                {(locked || docsLocked) ? 'Profile & Documents Locked — Admin Verified or Under Review' : 'Documents Editable'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {uploadedCount}/{DOCS.length} documents uploaded · {verifiedCount} verified
                            </div>
                        </div>
                        {/* Progress bar */}
                        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', marginLeft: 12 }}>
                            <div style={{ height: '100%', width: `${(verifiedCount / DOCS.length) * 100}%`, background: 'var(--accent-teal)', borderRadius: 99, transition: 'width 0.5s' }} />
                        </div>
                    </div>
                )}

                {msg && <div style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid var(--accent-teal)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--accent-teal)', fontSize: '0.85rem' }}>✅ {msg}</div>}
                {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: '0.85rem' }}>❌ {error}</div>}

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    {[['info', '👤 Personal Info'], ['docs', '📄 Documents']].map(([k, l]) => (
                        <button key={k} onClick={() => setTab(k)} className={`btn ${tab === k ? 'btn-primary' : 'btn-secondary'} btn-sm`}>{l}</button>
                    ))}
                </div>

                {loading ? <div className="loading-screen"><div className="spinner" /></div> : (<>

                    {/* ── Personal Info Tab ── */}
                    {tab === 'info' && (
                        <div className="glass-card" style={{ padding: 28 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                <h3>Personal Information</h3>
                                {locked && <span style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: 20 }}>🔒 Locked</span>}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                {/* Read-only fields */}
                                {[['Name', profile.name], ['Phone', `+91 ${profile.phone}`], ['Aadhaar', profile.aadhaarNumber]].map(([l, v]) => (
                                    <div key={l} className="form-group">
                                        <label className="form-label">{l}</label>
                                        <input className="form-input" value={v || '—'} disabled style={{ opacity: 0.6 }} />
                                    </div>
                                ))}
                                {/* Editable fields */}
                                {[
                                    { key: 'email', label: 'Email', type: 'email', placeholder: 'your@email.com' },
                                    { key: 'dob', label: 'Date of Birth', type: 'date' },
                                    { key: 'aadhaarNumber', label: 'Aadhaar Number', placeholder: '12-digit Aadhaar' },
                                    { key: 'panNumber', label: 'PAN Number', placeholder: 'ABCDE1234F' },
                                    { key: 'licenseNumber', label: 'License Number', placeholder: 'DL-XXXXX' },
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
                            {locked && (
                                <div style={{ marginTop: 16, textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    🔒 Profile locked after admin verification. Contact admin to make any changes.
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Documents Tab ── */}
                    {tab === 'docs' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                {DOCS.map(doc => {
                                    const docData = docs[doc.key];
                                    const verified = docData?.status === 'verified';
                                    const canReupload = !docsLocked && !verified; // Block if locked

                                    return (
                                        <div key={doc.key} className="glass-card" style={{
                                            padding: 20,
                                            border: `1px solid ${docData ? statusColors[docData.status] + '40' : 'var(--border)'}`,
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{ fontSize: '1.6rem' }}>{doc.icon}</span>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{doc.label}</div>
                                                        {docData?.uploadedAt && (
                                                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                                                Uploaded: {new Date(docData.uploadedAt).toLocaleDateString('en-IN')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {docData && (
                                                    <span style={{
                                                        padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                                                        background: `${statusColors[docData.status]}20`, color: statusColors[docData.status],
                                                    }}>
                                                        {statusIcons[docData.status]} {docData.status}
                                                    </span>
                                                )}
                                            </div>

                                            {/* View uploaded file */}
                                            {docData?.filePath && (
                                                <button
                                                    onClick={() => setViewer({ isOpen: true, path: docData.filePath, title: doc.label })}
                                                    className="btn btn-secondary btn-sm"
                                                    style={{
                                                        width: '100%',
                                                        marginBottom: 10,
                                                        fontSize: '0.75rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    👁️ View {doc.label}
                                                </button>
                                            )}
                                            {doc.key === 'photo' && docData?.filePath && (
                                                <div style={{ textAlign: 'center', marginBottom: 10 }}>
                                                    <img
                                                        src={docData.filePath.startsWith('http')
                                                            ? docData.filePath
                                                            : `${API_BASE.replace('/api', '')}${docData.filePath}`
                                                        }
                                                        alt="Profile"
                                                        style={{
                                                            width: 80,
                                                            height: 80,
                                                            borderRadius: '50%',
                                                            objectFit: 'cover',
                                                            border: '2px solid var(--accent-teal)',
                                                            cursor: 'pointer'
                                                        }}
                                                        onClick={() => setViewer({ isOpen: true, path: docData.filePath, title: 'Profile Photo' })}
                                                    />
                                                </div>
                                            )}

                                            {/* Upload button */}
                                            {canReupload ? (
                                                <>
                                                    <input type="file" accept={doc.accept} ref={el => fileRefs.current[doc.key] = el}
                                                        style={{ display: 'none' }}
                                                        onChange={e => uploadDoc(doc.key, e.target.files[0])} />
                                                    <button className="btn btn-secondary btn-sm"
                                                        onClick={() => fileRefs.current[doc.key]?.click()}
                                                        disabled={uploading[doc.key]}
                                                        style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem' }}>
                                                        {uploading[doc.key] ? '⏳ Uploading...' : docData ? '🔄 Re-upload' : '⬆️ Upload'}
                                                    </button>
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4, textAlign: 'center' }}>
                                                        Max 200 KB · JPG, PNG, PDF
                                                    </div>
                                                </>
                                            ) : (
                                                <div style={{ fontSize: '0.75rem', color: '#10b981', textAlign: 'center', marginTop: 6 }}>
                                                    ✅ Verified — cannot re-upload
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Sticky Bottom Actions */}
                            {!docsLocked ? (
                                <div className="glass-card" style={{ padding: 20, textAlign: 'center', background: 'rgba(0,0,0,0.2)' }}>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                                        Once you have uploaded the required documents, please submit them for admin review. Editing will be disabled.
                                    </p>
                                    <button
                                        className="btn btn-primary"
                                        style={{ width: '100%', maxWidth: 300, margin: '0 auto', justifyContent: 'center' }}
                                        disabled={submittingLock}
                                        onClick={async () => {
                                            if (!window.confirm('Are you sure you want to lock and submit your documents for review? You will not be able to edit them until reviewed.')) return;
                                            setSubmittingLock(true);
                                            const r = await apiFetch('/profile/driver/submit-documents', 'POST');
                                            r.success ? showMsg(r.message) : showMsg(r.message, true);
                                            setSubmittingLock(false);
                                            load();
                                        }}
                                    >
                                        {submittingLock ? '⏳ Submitting...' : '🔒 Submit Documents for Review'}
                                    </button>
                                </div>
                            ) : (
                                <div className="glass-card" style={{ padding: 20, textAlign: 'center', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    <h3 style={{ marginBottom: 8 }}>Documents are locked 🔒</h3>
                                    {editStatus === 'pending' ? (
                                        <div style={{ display: 'inline-block', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem' }}>
                                            Edit Request Status: Pending Admin Approval 🟡
                                        </div>
                                    ) : (
                                        <>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                                                If you found any mistake (e.g., wrong document uploaded, spelling mistake), you can request admin approval to unlock your documents.
                                            </p>
                                            <button className="btn btn-secondary" style={{ width: '100%', maxWidth: 300, margin: '0 auto', justifyContent: 'center', borderColor: '#ef4444', color: '#ef4444' }} onClick={() => setRequestModal({ ...requestModal, isOpen: true })}>
                                                📝 Request Edit Approval
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
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

            {/* Request Edit Modal */}
            {requestModal.isOpen && (
                <div className="modal-backdrop">
                    <div className="modal-content" style={{ maxWidth: 400 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>Request Document Edit</h2>
                            <button className="icon-btn" onClick={() => setRequestModal({ ...requestModal, isOpen: false })}>✖</button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Select Reason</label>
                            <select
                                className="form-input"
                                value={requestModal.reason}
                                onChange={e => setRequestModal({ ...requestModal, reason: e.target.value })}
                            >
                                <option value="Wrong document">Wrong document uploaded</option>
                                <option value="Spelling mistake">Spelling mistake in name</option>
                                <option value="Number mistake">Wrong number entered</option>
                                <option value="Expired document">Expired document</option>
                                <option value="Other">Other (specify below)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Additional Details</label>
                            <textarea
                                className="form-input" rows={3} placeholder="Provide details..."
                                value={requestModal.description}
                                onChange={e => setRequestModal({ ...requestModal, description: e.target.value })}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                            <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setRequestModal({ ...requestModal, isOpen: false })}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={async () => {
                                setSubmittingLock(true);
                                const r = await apiFetch('/profile/driver/request-edit', 'POST', { reason: requestModal.reason, description: requestModal.description });
                                r.success ? showMsg(r.message) : showMsg(r.message, true);
                                setSubmittingLock(false);
                                setRequestModal({ ...requestModal, isOpen: false });
                                load();
                            }}>
                                {submittingLock ? '⏳...' : 'Submit Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
