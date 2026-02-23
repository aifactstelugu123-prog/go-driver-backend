import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const apiFetch = async (url, method = 'GET', body) => {
    const res = await fetch(`${API_BASE}${url}`, {
        method, headers: { 'Content-Type': 'application/json', ...authHeader() },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return res.json();
};

const statusColor = { pending: '#f59e0b', approved: '#3b82f6', rejected: '#ef4444', transferred: '#10b981' };
const statusIcon = { pending: '⏳', approved: '✅', rejected: '❌', transferred: '💸' };

export default function AdminPayouts() {
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [actionLoading, setActionLoading] = useState('');
    const [noteInput, setNoteInput] = useState({});

    const load = async (f) => {
        setLoading(true);
        const r = await apiFetch(`/driver-wallet/admin/payouts?status=${f}`);
        if (r.success) setPayouts(r.payouts || []);
        setLoading(false);
    };

    useEffect(() => { load(filter); }, [filter]);

    const action = async (id, endpoint, body = {}) => {
        setActionLoading(id + endpoint);
        const r = await apiFetch(`/driver-wallet/admin/payouts/${id}/${endpoint}`, 'POST', body);
        alert(r.message);
        load(filter);
        setActionLoading('');
    };

    const totalPending = payouts.reduce((s, p) => s + p.amount, 0);

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>Driver Payouts 💸</h1>
                    <p>Review, approve, and mark driver withdrawal requests as transferred</p>
                </div>

                {/* Summary */}
                <div className="glass-card" style={{ padding: 20, marginBottom: 20, display: 'flex', gap: 32, alignItems: 'center', borderColor: 'rgba(245,158,11,0.3)' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>₹{totalPending.toFixed(0)}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Total in view</div>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                        <strong>Payout Flow:</strong> Pending → Approve → Mark Transferred<br />
                        Rejection refunds money back to driver wallet automatically.
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    {['pending', 'approved', 'transferred', 'rejected'].map(s => (
                        <button key={s} onClick={() => setFilter(s)} className={`btn ${filter === s ? 'btn-primary' : 'btn-secondary'} btn-sm`}>
                            {statusIcon[s]} {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="loading-screen"><div className="spinner" /></div>
                ) : payouts.length === 0 ? (
                    <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>💸</div>
                        <p style={{ color: 'var(--text-secondary)' }}>No {filter} payout requests</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {payouts.map(p => (
                            <div key={p._id} className="glass-card" style={{ padding: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#00d4aa,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                                                {p.driverId?.name?.[0] || 'D'}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{p.driverId?.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.driverId?.phone}</div>
                                            </div>
                                            <span className="badge" style={{ background: `${statusColor[p.status]}18`, color: statusColor[p.status] }}>
                                                {statusIcon[p.status]} {p.status}
                                            </span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '6px 24px', fontSize: '0.82rem' }}>
                                            <div><span style={{ color: 'var(--text-muted)' }}>Account: </span><span style={{ fontFamily: 'monospace' }}>{p.bankSnapshot?.accountNumberMasked}</span></div>
                                            <div><span style={{ color: 'var(--text-muted)' }}>IFSC: </span>{p.bankSnapshot?.ifscCode}</div>
                                            <div><span style={{ color: 'var(--text-muted)' }}>Bank: </span>{p.bankSnapshot?.bankName}</div>
                                            <div><span style={{ color: 'var(--text-muted)' }}>Holder: </span>{p.bankSnapshot?.accountHolderName}</div>
                                            {p.bankSnapshot?.upiId && <div><span style={{ color: 'var(--text-muted)' }}>UPI: </span>{p.bankSnapshot.upiId}</div>}
                                            <div><span style={{ color: 'var(--text-muted)' }}>Requested: </span>{new Date(p.requestedAt).toLocaleString('en-IN')}</div>
                                        </div>
                                        {p.adminNote && <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>📝 Note: {p.adminNote}</div>}
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-teal)' }}>₹{p.amount}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>withdrawal</div>

                                        {/* Actions */}
                                        {p.status === 'pending' && (
                                            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                                                <input className="form-input" placeholder="Note (optional)" style={{ fontSize: '0.78rem', padding: '6px 10px', width: 200 }}
                                                    value={noteInput[p._id] || ''} onChange={e => setNoteInput({ ...noteInput, [p._id]: e.target.value })} />
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button className="btn btn-primary btn-sm" disabled={!!actionLoading}
                                                        onClick={() => action(p._id, 'approve', { note: noteInput[p._id] })}>
                                                        {actionLoading === p._id + 'approve' ? '...' : '✅ Approve'}
                                                    </button>
                                                    <button className="btn btn-danger btn-sm" disabled={!!actionLoading}
                                                        onClick={() => action(p._id, 'reject', { reason: noteInput[p._id] })}>
                                                        {actionLoading === p._id + 'reject' ? '...' : '❌ Reject'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {p.status === 'approved' && (
                                            <div style={{ marginTop: 12 }}>
                                                <button className="btn btn-primary btn-sm" disabled={!!actionLoading}
                                                    onClick={() => action(p._id, 'transfer')}>
                                                    {actionLoading === p._id + 'transfer' ? '...' : '💸 Mark as Transferred'}
                                                </button>
                                            </div>
                                        )}
                                        {p.status === 'transferred' && (
                                            <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#10b981' }}>
                                                Transferred {p.transferredAt ? new Date(p.transferredAt).toLocaleDateString('en-IN') : ''}
                                            </div>
                                        )}
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
