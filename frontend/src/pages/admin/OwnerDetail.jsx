import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { getAdminOwnerById } from '../../services/api';
import { User, Phone, Mail, MapPin, Calendar, CreditCard, FileText, ChevronLeft, Eye, ExternalLink } from 'lucide-react';

export default function AdminOwnerDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [owner, setOwner] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        getAdminOwnerById(id)
            .then(res => setOwner(res.data.owner))
            .catch(err => {
                console.error('Failed to fetch owner details:', err);
                setError('Failed to load owner details. Please try again.');
            })
            .finally(() => setLoading(false));
    }, [id]);

    const getFullUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${path}`;
    };

    if (loading) return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <div className="loading-screen"><div className="spinner" /></div>
            </div>
        </div>
    );

    if (error || !owner) return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <div className=" glass-card" style={{ padding: 40, textAlign: 'center' }}>
                    <div style={{ color: '#ef4444', marginBottom: 20, fontSize: '2rem' }}>⚠️</div>
                    <h3>{error || 'Owner not found'}</h3>
                    <button onClick={() => navigate('/admin/owners')} className="btn btn-secondary mt-4">Go Back</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <button onClick={() => navigate('/admin/owners')} className="btn btn-icon" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1>Owner Details 👤</h1>
                        <p>Complete profile and documents for {owner.name}</p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    {/* Basic Info */}
                    <div className="glass-card">
                        <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <User size={18} className="text-teal" /> Personal Information
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <InfoRow icon={<User size={16} />} label="Full Name" value={owner.name} />
                            <InfoRow icon={<Phone size={16} />} label="Phone Number" value={owner.phone} />
                            <InfoRow icon={<Mail size={16} />} label="Email Address" value={owner.email} />
                            <InfoRow icon={<MapPin size={16} />} label="Address" value={owner.address || 'Not Provided'} />
                            <InfoRow icon={<Calendar size={16} />} label="Date of Birth" value={owner.dob ? new Date(owner.dob).toLocaleDateString() : 'Not Provided'} />
                            <InfoRow icon={<CreditCard size={16} />} label="Aadhaar Number" value={owner.aadhaarNumber || 'Not Provided'} />
                            <InfoRow icon={<FileText size={16} />} label="PAN Number" value={owner.panNumber || 'Not Provided'} />
                        </div>
                    </div>

                    {/* Stats & Wallet */}
                    <div className="glass-card">
                        <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <CreditCard size={18} className="text-teal" /> Account Summary
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                            <div style={{ background: 'rgba(0, 212, 170, 0.05)', padding: 20, borderRadius: 12, border: '1px solid rgba(0, 212, 170, 0.1)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 5 }}>Wallet Balance</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-teal)' }}>₹{owner.walletBalance?.toLocaleString('en-IN') || 0}</div>
                            </div>
                            <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: 20, borderRadius: 12, border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 5 }}>Member Since</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{new Date(owner.createdAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                        <div style={{ marginTop: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Profile Status</span>
                                <span className={`badge ${owner.isVerified ? 'badge-teal' : 'badge-warning'}`}>
                                    {owner.isVerified ? '✅ Verified' : '⏳ Pending'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Profile Locked</span>
                                <span style={{ color: owner.profileLocked ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                                    {owner.profileLocked ? '🔒 Yes' : '🔓 No'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Documents View */}
                    <div className="glass-card" style={{ gridColumn: 'span 2' }}>
                        <h3 style={{ marginBottom: 24 }}>Verified Documents</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                            <DocumentCard title="Profile Photo" path={owner.documents?.photo?.filePath} />
                            <DocumentCard title="Aadhaar Card" path={owner.documents?.aadhaarCard?.filePath} />
                            <DocumentCard title="PAN Card" path={owner.documents?.panCard?.filePath} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );

    function InfoRow({ icon, label, value }) {
        return (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{icon}</div>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>{value}</div>
                </div>
            </div>
        );
    }

    function DocumentCard({ title, path }) {
        const url = getFullUrl(path);
        const isPdf = path?.toLowerCase().endsWith('.pdf');

        return (
            <div className="doc-preview-card" style={{
                background: 'rgba(255,255,255,0.02)', borderRadius: 12, overflow: 'hidden',
                border: '1px solid var(--border)', transition: 'all 0.2s'
            }}>
                <div style={{ padding: '10px 15px', background: 'rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{title}</span>
                    {url && (
                        <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-teal)' }}>
                            <ExternalLink size={14} />
                        </a>
                    )}
                </div>
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', position: 'relative' }}>
                    {path ? (
                        isPdf ? (
                            <div style={{ textAlign: 'center' }}>
                                <FileText size={48} color="#ef4444" />
                                <div style={{ fontSize: '0.8rem', marginTop: 10 }}>PDF Document</div>
                            </div>
                        ) : (
                            <img src={url} alt={title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        )
                    ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Not Uploaded</div>
                    )}
                </div>
            </div>
        );
    }
}
