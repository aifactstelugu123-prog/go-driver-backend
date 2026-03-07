import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function OwnerReferral() {
    const [status, setStatus] = useState(null);
    const [joinedDrivers, setJoinedDrivers] = useState([]);
    const [joinedOwners, setJoinedOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [tab, setTab] = useState('drivers');

    useEffect(() => {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        Promise.all([
            fetch(`${API_BASE}/referral/status`, { headers }).then(r => r.json()),
            fetch(`${API_BASE}/referral/owner/joined`, { headers }).then(r => r.json()),
        ]).then(([s, j]) => {
            if (s.success) setStatus(s);
            if (j.success) {
                setJoinedDrivers(j.drivers || []);
                setJoinedOwners(j.owners || []);
            }
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    const copyCode = () => {
        if (!status?.referralCode) return;
        navigator.clipboard.writeText(status.referralCode).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        });
    };

    const shareWhatsApp = () => {
        const code = status?.referralCode;
        if (!code) return;
        const url = `${window.location.origin}/login?ref=${code}`;
        const text = `Hey! Join Go Driver DaaS Platform using my referral code: ${code}. Link: ${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    };

    const visible = tab === 'drivers' ? joinedDrivers : joinedOwners;
    const isValid = status?.freeUsageExpiryDate && new Date(status.freeUsageExpiryDate) > new Date();

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>Refer & Earn 🎁</h1>
                    <p>Share your code and track everyone who joined through your referral.</p>
                </div>

                {loading ? <div className="loading-screen"><div className="spinner" /></div> : (
                    <>
                        {/* Referral Code Card */}
                        <div className="glass-card" style={{ padding: 32, marginBottom: 24, background: 'linear-gradient(135deg, rgba(0,212,170,0.08) 0%, rgba(139,92,246,0.05) 100%)', border: '1px solid rgba(0,212,170,0.2)' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'center' }}>
                                {/* Left: Big code display */}
                                <div style={{ flex: '1 1 250px' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Your Referral Code</div>
                                    <div style={{ fontFamily: 'monospace', fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent-teal)', letterSpacing: '0.12em', marginBottom: 12 }}>
                                        {status?.referralCode || '—'}
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                        Share this code with other owners or drivers. When they sign up using your code, you earn referral benefits!
                                    </div>
                                </div>

                                {/* Right: Stats + Actions */}
                                <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-teal)' }}>{status?.referralCount || 0}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Total Referred</div>
                                        </div>
                                        <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: isValid ? '#10b981' : '#ef4444' }}>
                                                {status?.freeUsageExpiryDate ? new Date(status.freeUsageExpiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{isValid ? '✅ Valid Till' : '⚠️ Expired'}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button onClick={copyCode} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid rgba(0,212,170,0.4)', background: copied ? 'rgba(0,212,170,0.15)' : 'rgba(0,0,0,0.2)', color: copied ? 'var(--accent-teal)' : 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem', transition: 'all 0.2s' }}>
                                            {copied ? '✅ Copied!' : '📋 Copy Code'}
                                        </button>
                                        <button onClick={shareWhatsApp} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}>
                                            📱 Share on WhatsApp
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* who joined section */}
                        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                            {/* Tab Header */}
                            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)' }}>
                                {[
                                    { key: 'drivers', label: `Drivers (${joinedDrivers.length})`, icon: '🧑‍✈️' },
                                    { key: 'owners', label: `Owners (${joinedOwners.length})`, icon: '👥' },
                                ].map(t => (
                                    <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '16px 24px', border: 'none', background: 'transparent', color: tab === t.key ? 'var(--accent-teal)' : 'var(--text-muted)', fontWeight: tab === t.key ? 700 : 500, fontSize: '0.9rem', cursor: 'pointer', borderBottom: tab === t.key ? '2px solid var(--accent-teal)' : '2px solid transparent', transition: 'all 0.2s', marginBottom: '-1px' }}>
                                        {t.icon} {t.label}
                                    </button>
                                ))}
                            </div>

                            {visible.length === 0 ? (
                                <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>👋</div>
                                    <div>No {tab} have joined using your code yet.</div>
                                    <div style={{ fontSize: '0.8rem', marginTop: 8, color: 'var(--text-muted)' }}>Share your code to start earning referral benefits!</div>
                                </div>
                            ) : (
                                <div>
                                    {/* Table Header */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1.2fr', gap: 12, padding: '12px 24px', background: 'rgba(0,0,0,0.2)', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <div>Name</div>
                                        <div>Phone</div>
                                        <div>Email</div>
                                        <div>Joined On</div>
                                    </div>
                                    {visible.map((u, i) => (
                                        <div key={u._id || i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1.2fr', gap: 12, padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}
                                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,212,170,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent-teal)', fontSize: '0.9rem', flexShrink: 0 }}>
                                                    {(u.name || 'A')[0].toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.name}</span>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>+91 {u.phone}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email || '—'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleDateString('en-IN')}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
