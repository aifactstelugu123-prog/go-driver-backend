import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const apiFetch = async (url, method = 'GET', body) => {
    const res = await fetch(`${API_BASE}${url}`, {
        method, headers: { 'Content-Type': 'application/json', ...authHeader() },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return res.json();
};

export default function AdminDocumentRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');

    const load = async () => {
        setLoading(true);
        const r = await apiFetch('/profile/admin/document-requests');
        if (r.success) {
            const drvs = (r.drivers || []).map(d => ({ ...d, userType: 'Driver', id: d._id, model: 'driver' }));
            const owns = (r.owners || []).map(o => ({ ...o, userType: 'Owner', id: o._id, model: 'owner' }));

            // Sort by request date descending
            const combined = [...drvs, ...owns].sort((a, b) => new Date(b.edit_request_date) - new Date(a.edit_request_date));
            setRequests(combined);
        } else {
            showMsg(r.message, true);
        }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const showMsg = (m, isErr = false) => {
        isErr ? setError(m) : setMsg(m);
        setTimeout(() => { setMsg(''); setError(''); }, 4000);
    };

    const handleAction = async (model, id, action) => {
        if (!window.confirm(`Are you sure you want to ${action} this request?`)) return;
        const res = await apiFetch(`/profile/admin/document-request/${model}/${id}/${action}`, 'PATCH');
        if (res.success) {
            showMsg(`Request ${action}d successfully.`);
            load();
        } else {
            showMsg(res.message, true);
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>Document Edit Requests 📄</h1>
                    <p>Review and act on user requests to edit their locked documents.</p>
                </div>

                {msg && <div style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid var(--accent-teal)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--accent-teal)', fontSize: '0.85rem' }}>✅ {msg}</div>}
                {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: '0.85rem' }}>❌ {error}</div>}

                {loading ? <div className="loading-screen"><div className="spinner" /></div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {requests.length === 0 ? (
                            <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                                No pending edit requests. 🎉
                            </div>
                        ) : requests.map(req => (
                            <div key={req.id} className="glass-card" style={{ padding: 20, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                                <div style={{ flex: '1 1 300px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', overflow: 'hidden', flexShrink: 0 }}>
                                                {req.profilePhoto ? (
                                                    <img src={req.profilePhoto.startsWith('http') ? req.profilePhoto : `${API_BASE.replace('/api', '')}${req.profilePhoto}`} alt="PFP" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: 'var(--text-muted)' }}>👤</div>
                                                )}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{req.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{req.userType} • +91 {req.phone}</div>
                                            </div>
                                        </div>
                                        {req.edit_request_date && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                Requested: {new Date(req.edit_request_date).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', borderLeft: '3px solid #ef4444', padding: '12px 16px', borderRadius: '0 8px 8px 0', marginTop: 12 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>Reason: {req.edit_request_reason || 'Not specified'}</div>
                                        {req.edit_request_desc && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{req.edit_request_desc}</div>}
                                    </div>
                                </div>

                                <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 12, minWidth: 200 }}>
                                    <Link to={`/admin/${req.userType.toLowerCase()}s/${req.id}`} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                                        👁️ View Profile
                                    </Link>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center', background: '#10b981', color: '#000' }} onClick={() => handleAction(req.model, req.id, 'approve')}>
                                            ✅ Approve Edit
                                        </button>
                                        <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', borderColor: '#ef4444', color: '#ef4444' }} onClick={() => handleAction(req.model, req.id, 'reject')}>
                                            ❌ Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
