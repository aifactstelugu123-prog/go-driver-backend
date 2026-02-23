import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { getAdminDrivers, approveDriver, blockDriver, unblockDriver } from '../../services/api';
import DocumentModal from '../../components/DocumentModal';

export default function AdminDrivers() {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [actionLoading, setActionLoading] = useState('');

    // Document Viewing State
    const [selectedDriver, setSelectedDriver] = useState(null); // Driver for selection modal
    const [viewer, setViewer] = useState({ isOpen: false, path: '', title: '' }); // Final doc viewer

    const load = (f) => {
        setLoading(true);
        const params = f === 'pending' ? { approved: false } : f === 'blocked' ? { blocked: true } : f === 'approved' ? { approved: true } : {};
        getAdminDrivers(params).then(r => setDrivers(r.data.drivers || [])).finally(() => setLoading(false));
    };

    useEffect(() => { load(filter); }, [filter]);

    const handleAction = async (id, action) => {
        setActionLoading(id + action);
        try {
            if (action === 'approve') await approveDriver(id);
            else if (action === 'block') await blockDriver(id);
            else if (action === 'unblock') await unblockDriver(id);
            load(filter);
        } catch (e) { alert(e.response?.data?.message || 'Action failed.'); }
        setActionLoading('');
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>Driver Management 🧑‍✈️</h1>
                    <p>Approve, monitor, and manage all drivers</p>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    {[
                        { key: 'all', label: '🔍 All Drivers' },
                        { key: 'pending', label: '⏳ Pending Approval' },
                        { key: 'approved', label: '✅ Approved' },
                        { key: 'blocked', label: '🚫 Blocked' },
                    ].map(f => (
                        <button key={f.key} onClick={() => setFilter(f.key)} className={`btn ${filter === f.key ? 'btn-primary' : 'btn-secondary'} btn-sm`}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="loading-screen"><div className="spinner" /></div>
                ) : drivers.length === 0 ? (
                    <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🧑‍✈️</div>
                        <p style={{ color: 'var(--text-secondary)' }}>No drivers found for "{filter}"</p>
                    </div>
                ) : (
                    <div className="glass-card" style={{ padding: 0 }}>
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Driver</th><th>Phone</th><th>Aadhaar</th><th>Skills</th><th>Status</th><th>Subscription</th><th>Violations</th><th>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {drivers.map(d => (
                                        <tr key={d._id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #00d4aa, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                                                        {d.name[0]}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{d.name}</div>
                                                        {d.trainingBadge && <span className="badge badge-teal" style={{ fontSize: '0.65rem' }}>✅ Verified</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '0.85rem' }}>{d.phone}</td>
                                            <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{d.aadhaar?.slice(0, 4)}****{d.aadhaar?.slice(-4)}</td>
                                            <td>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                    {d.vehicleSkills?.map(s => <span key={s} className="badge badge-info" style={{ fontSize: '0.65rem' }}>{s}</span>)}
                                                </div>
                                            </td>
                                            <td>
                                                {d.isBlocked ? <span className="badge badge-danger">🚫 Blocked</span>
                                                    : d.isApproved ? <span className="badge badge-success">✅ Approved</span>
                                                        : <span className="badge badge-warning">⏳ Pending</span>}
                                                {d.isOnline && !d.isBlocked && <span className="badge badge-teal" style={{ marginLeft: 4, fontSize: '0.65rem' }}>🟢 Online</span>}
                                            </td>
                                            <td>
                                                {d.subscriptionExpiry && new Date(d.subscriptionExpiry) > new Date() ? (
                                                    <div>
                                                        <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Active</span>
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                                            {d.ridesAssigned}/{d.rideLimit} used
                                                        </div>
                                                    </div>
                                                ) : <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>None</span>}
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 700, color: d.speedViolationCount > 0 ? '#ef4444' : '#6b7280' }}>
                                                    {d.speedViolationCount || 0}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    {!d.isApproved && !d.isBlocked && (
                                                        <button id={`approve-${d._id}`} className="btn btn-primary btn-sm"
                                                            onClick={() => handleAction(d._id, 'approve')}
                                                            disabled={actionLoading === d._id + 'approve'}>
                                                            {actionLoading === d._id + 'approve' ? '...' : '✅ Approve'}
                                                        </button>
                                                    )}
                                                    {!d.isBlocked ? (
                                                        <button className="btn btn-danger btn-sm" onClick={() => handleAction(d._id, 'block')}
                                                            disabled={actionLoading === d._id + 'block'}>
                                                            {actionLoading === d._id + 'block' ? '...' : '🚫 Block'}
                                                        </button>
                                                    ) : (
                                                        <button className="btn btn-secondary btn-sm" onClick={() => handleAction(d._id, 'unblock')}
                                                            disabled={actionLoading === d._id + 'unblock'}>
                                                            {actionLoading === d._id + 'unblock' ? '...' : '✅ Unblock'}
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn btn-info btn-sm"
                                                        onClick={() => setSelectedDriver(d)}
                                                        style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                                                    >
                                                        🔍 View Docs
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Document Selection Modal (Lists all documents for a driver) */}
            {selectedDriver && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 9000
                }} onClick={() => setSelectedDriver(null)}>
                    <div style={{
                        width: '90%', maxWidth: '500px', background: 'var(--card-bg)',
                        borderRadius: 16, padding: 24, border: '1px solid var(--border)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h3 style={{ margin: 0 }}>Documents: {selectedDriver.name}</h3>
                            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDriver(null)}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {['photo', 'aadhaarCard', 'panCard', 'drivingLicense', 'tenthCertificate', 'policeVerification', 'rcBook'].map(key => {
                                const doc = selectedDriver.documents?.[key];
                                if (!doc?.filePath) return null;
                                return (
                                    <div key={key} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8,
                                        border: '1px solid var(--border)'
                                    }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem', textTransform: 'capitalize' }}>
                                            {key.replace(/([A-Z])/g, ' $1')}
                                        </div>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => setViewer({ isOpen: true, path: doc.filePath, title: key.replace(/([A-Z])/g, ' $1') })}
                                        >
                                            👁️ View
                                        </button>
                                    </div>
                                );
                            })}
                            {!selectedDriver.documents || Object.values(selectedDriver.documents).every(d => !d?.filePath) ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>
                                    No documents uploaded yet.
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* Final Document Viewer Modal */}
            <DocumentModal
                isOpen={viewer.isOpen}
                onClose={() => setViewer({ ...viewer, isOpen: false })}
                filePath={viewer.path}
                title={viewer.title}
            />
        </div>
    );
}
