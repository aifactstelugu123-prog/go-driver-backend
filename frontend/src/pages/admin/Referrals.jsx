import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const Avatar = ({ name, photo, size = 40 }) => {
    const src = photo ? (photo.startsWith('http') ? photo : `${API_BASE.replace('/api', '')}${photo}`) : null;
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'rgba(0,212,170,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, color: 'var(--accent-teal)', border: '2px solid rgba(0,212,170,0.2)' }}>
            {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name || 'A')[0].toUpperCase()}
        </div>
    );
};

const CodeBadge = ({ code }) => (
    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, background: 'rgba(0,212,170,0.1)', color: 'var(--accent-teal)', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(0,212,170,0.25)', letterSpacing: '0.05em' }}>
        {code}
    </span>
);

export default function AdminReferrals() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('drivers');   // 'drivers' | 'owners'
    const [subTab, setSubTab] = useState('joined'); // 'joined' | 'referrers'

    useEffect(() => {
        fetch(`${API_BASE}/referral/admin/list`, { headers: authHeader() })
            .then(r => r.json())
            .then(d => { if (d.success) setData(d); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const tabStyle = (active) => ({
        padding: '10px 22px', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', border: 'none',
        background: active ? 'var(--accent-teal)' : 'rgba(255,255,255,0.05)',
        color: active ? '#000' : 'var(--text-secondary)',
        transition: 'all 0.2s',
    });

    const subTabStyle = (active) => ({
        padding: '7px 18px', borderRadius: 20, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', border: `1px solid ${active ? 'var(--accent-teal)' : 'rgba(255,255,255,0.1)'}`,
        background: active ? 'rgba(0,212,170,0.12)' : 'transparent',
        color: active ? 'var(--accent-teal)' : 'var(--text-muted)',
        transition: 'all 0.2s',
    });

    const joined = tab === 'drivers' ? data?.referredDrivers || [] : data?.referredOwners || [];
    const referrers = tab === 'drivers' ? data?.activeReferrerDrivers || [] : data?.activeReferrerOwners || [];
    const visible = subTab === 'joined' ? joined : referrers;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>Referral Analytics 🎁</h1>
                    <p>Track referrals — who referred, who joined, and rewards earned.</p>
                </div>

                {/* Summary Cards */}
                {data && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
                        {[
                            { label: 'Drivers Referred', value: data.referredDrivers?.length || 0, icon: '🧑‍✈️', color: '#00d4aa' },
                            { label: 'Owners Referred', value: data.referredOwners?.length || 0, icon: '👥', color: '#f59e0b' },
                            { label: 'Active Driver Referrers', value: data.activeReferrerDrivers?.length || 0, icon: '🏆', color: '#8b5cf6' },
                            { label: 'Active Owner Referrers', value: data.activeReferrerOwners?.length || 0, icon: '⭐', color: '#ef4444' },
                        ].map(s => (
                            <div key={s.label} className="glass-card" style={{ padding: '20px 16px', textAlign: 'center', border: `1px solid ${s.color}25` }}>
                                <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>{s.icon}</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Main Tabs: Driver / Owner */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    <button style={tabStyle(tab === 'drivers')} onClick={() => setTab('drivers')}>🧑‍✈️ Drivers</button>
                    <button style={tabStyle(tab === 'owners')} onClick={() => setTab('owners')}>👥 Owners</button>
                </div>

                {/* Sub Tabs: Joined / Referrers */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    <button style={subTabStyle(subTab === 'joined')} onClick={() => setSubTab('joined')}>
                        📥 Joined via Referral ({tab === 'drivers' ? data?.referredDrivers?.length || 0 : data?.referredOwners?.length || 0})
                    </button>
                    <button style={subTabStyle(subTab === 'referrers')} onClick={() => setSubTab('referrers')}>
                        🔗 Top Referrers ({tab === 'drivers' ? data?.activeReferrerDrivers?.length || 0 : data?.activeReferrerOwners?.length || 0})
                    </button>
                </div>

                {loading ? (
                    <div className="loading-screen"><div className="spinner" /></div>
                ) : visible.length === 0 ? (
                    <div className="glass-card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎉</div>
                        <div>No data yet for this category.</div>
                    </div>
                ) : (
                    <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
                        {/* Table Header */}
                        <div style={{ display: 'grid', gridTemplateColumns: subTab === 'joined' ? '2fr 1.2fr 1.2fr 1.2fr 1fr' : '2fr 1.2fr 1.2fr 1.2fr 1fr', gap: 12, padding: '14px 20px', background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <div>User</div>
                            <div>{subTab === 'joined' ? 'Joined With Code' : 'Referral Code'}</div>
                            <div>{subTab === 'joined' ? 'Phone' : 'Total Referred'}</div>
                            <div>{subTab === 'referrers' && tab === 'drivers' ? 'Free Rides Until' : (tab === 'owners' ? 'Free Usage Until' : 'Date Joined')}</div>
                            <div>Action</div>
                        </div>

                        {/* Table Rows */}
                        {visible.map((item, i) => (
                            <div key={item._id || i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 1.2fr 1fr', gap: 12, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', transition: 'background 0.15s' }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                                {/* User */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <Avatar name={item.name} photo={item.profilePhoto} />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.phone}</div>
                                    </div>
                                </div>

                                {/* Code */}
                                <div>
                                    {subTab === 'joined' ? (
                                        item.referredByCode ? <CodeBadge code={item.referredByCode} /> : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                                    ) : (
                                        item.referralCode ? <CodeBadge code={item.referralCode} /> : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                                    )}
                                </div>

                                {/* Phone / Count */}
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {subTab === 'joined'
                                        ? <span>+91 {item.phone}</span>
                                        : <span style={{ fontWeight: 700, color: 'var(--accent-teal)', fontSize: '1rem' }}>{item.referralCount || 0} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>joined</span></span>
                                    }
                                </div>

                                {/* Date / Expiry */}
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {subTab === 'joined'
                                        ? new Date(item.createdAt).toLocaleDateString('en-IN')
                                        : tab === 'drivers'
                                            ? item.freeRidesExpiryDate
                                                ? <span style={{ color: new Date(item.freeRidesExpiryDate) > new Date() ? '#10b981' : '#ef4444' }}>{new Date(item.freeRidesExpiryDate).toLocaleDateString('en-IN')}</span>
                                                : '—'
                                            : item.freeUsageExpiryDate
                                                ? <span style={{ color: new Date(item.freeUsageExpiryDate) > new Date() ? '#10b981' : '#ef4444' }}>{new Date(item.freeUsageExpiryDate).toLocaleDateString('en-IN')}</span>
                                                : '—'
                                    }
                                </div>

                                {/* Action */}
                                <div>
                                    <Link
                                        to={`/admin/${tab === 'drivers' ? 'drivers' : 'owners'}/${item._id}`}
                                        style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'all 0.15s' }}
                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                    >
                                        👁️ View
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
