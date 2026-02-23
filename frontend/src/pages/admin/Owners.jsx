import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { getAdminOwners } from '../../services/api';
import DocumentModal from '../../components/DocumentModal';

export default function AdminOwners() {
    const [owners, setOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState('');

    // Document Viewing State
    const [selectedOwner, setSelectedOwner] = useState(null);
    const [viewer, setViewer] = useState({ isOpen: false, path: '', title: '' });

    const load = () => {
        setLoading(true);
        getAdminOwners()
            .then(r => setOwners(r.data.owners || []))
            .catch(e => console.error('Failed to load owners', e))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>Owner Management 👤</h1>
                    <p>View and manage all registered vehicle owners</p>
                </div>

                {loading ? (
                    <div className="loading-screen"><div className="spinner" /></div>
                ) : owners.length === 0 ? (
                    <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>👤</div>
                        <p style={{ color: 'var(--text-secondary)' }}>No owners found.</p>
                    </div>
                ) : (
                    <div className="glass-card" style={{ padding: 0 }}>
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Owner</th>
                                        <th>Phone</th>
                                        <th>Email</th>
                                        <th>Wallet Balance</th>
                                        <th>Joined At</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {owners.map(o => (
                                        <tr key={o._id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{
                                                        width: 36, height: 36, borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, #00d4aa, #3b82f6)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: '#fff', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0
                                                    }}>
                                                        {o.name?.[0] || 'O'}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{o.name}</div>
                                                        <span className="badge badge-teal" style={{ fontSize: '0.65rem' }}>Owner</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '0.85rem' }}>{o.phone}</td>
                                            <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{o.email}</td>
                                            <td>
                                                <span style={{ fontWeight: 700, color: 'var(--accent-teal)' }}>
                                                    ₹{o.walletBalance?.toLocaleString('en-IN') || 0}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {new Date(o.createdAt).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button
                                                        className="btn btn-info btn-sm"
                                                        onClick={() => setSelectedOwner(o)}
                                                        style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                                                    >
                                                        🔍 Docs
                                                    </button>
                                                    <a
                                                        href={`/admin/owners/${o._id}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="btn btn-primary btn-sm"
                                                        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                                                    >
                                                        👤 Profile
                                                    </a>
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

            {/* Document Selection Modal */}
            {selectedOwner && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 9000
                }} onClick={() => setSelectedOwner(null)}>
                    <div style={{
                        width: '90%', maxWidth: '500px', background: 'var(--card-bg)',
                        borderRadius: 16, padding: 24, border: '1px solid var(--border)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h3 style={{ margin: 0 }}>Documents: {selectedOwner.name}</h3>
                            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedOwner(null)}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {['photo', 'aadhaarCard', 'panCard'].map(key => {
                                const doc = selectedOwner.documents?.[key];
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
                            {!selectedOwner.documents || Object.values(selectedOwner.documents).every(d => !d?.filePath) ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>
                                    No documents uploaded yet.
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* Document Viewer Modal */}
            <DocumentModal
                isOpen={viewer.isOpen}
                onClose={() => setViewer({ ...viewer, isOpen: false })}
                filePath={viewer.path}
                title={viewer.title}
            />
        </div>
    );
}
