import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const REWARD_SLABS = [
    { count: 1, reward: '1 Free Ride (≤5km)' },
    { count: 3, reward: '15 Days Free Platform Fee' },
    { count: 5, reward: '30 Days Free Platform Fee' },
    { count: 7, reward: '45 Days Free Platform Fee' },
    { count: 10, reward: '60 Days Free Platform Fee 🏆' },
];

export default function DriverReferral() {
    const [status, setStatus] = useState(null);
    const [joinedDrivers, setJoinedDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        Promise.all([
            fetch(`${API_BASE}/referral/status`, { headers }).then(r => r.json()),
            fetch(`${API_BASE}/referral/driver/joined`, { headers }).then(r => r.json()),
        ]).then(([s, j]) => {
            if (s.success) setStatus(s);
            if (j.success) setJoinedDrivers(j.drivers || []);
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
        const url = `${window.location.origin}/register/driver?ref=${code}`;
        const text = `Hey! Join Go Driver as a professional driver using my referral code: ${code}. Register here: ${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    };

    const count = status?.referralCount || 0;
    const nextSlab = REWARD_SLABS.find(s => s.count > count);
    const currentSlab = REWARD_SLABS.filter(s => s.count <= count).pop();
    const isValid = status?.freeRidesExpiryDate && new Date(status.freeRidesExpiryDate) > new Date();

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>Refer & Earn 🎁</h1>
                    <p>Refer other drivers and earn free rides & platform fee waivers.</p>
                </div>

                {loading ? <div className="loading-screen"><div className="spinner" /></div> : (
                    <>
                        {/* Referral Code Card */}
                        <div className="glass-card" style={{ padding: 32, marginBottom: 24, background: 'linear-gradient(135deg, rgba(0,212,170,0.08) 0%, rgba(139,92,246,0.05) 100%)', border: '1px solid rgba(0,212,170,0.2)' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'center' }}>
                                {/* Left: Big code */}
                                <div style={{ flex: '1 1 250px' }}>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Your Referral Code</div>
                                    <div style={{ fontFamily: 'monospace', fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent-teal)', letterSpacing: '0.12em', marginBottom: 12 }}>
                                        {status?.referralCode || '—'}
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                        Share this code with other drivers. When they register and get approved using your code, you earn rewards!
                                    </div>
                                </div>

                                {/* Right: Stats + Actions */}
                                <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-teal)' }}>{count}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Drivers Referred</div>
                                        </div>
                                        <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: isValid ? '#10b981' : 'var(--text-muted)' }}>
                                                {status?.freeRidesExpiryDate ? new Date(status.freeRidesExpiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{isValid ? '✅ Reward Valid' : 'No Active Reward'}</div>
                                        </div>
                                    </div>

                                    {currentSlab && (
                                        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.82rem', color: '#10b981', fontWeight: 600 }}>
                                            🏆 Current Reward: {currentSlab.reward}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button onClick={copyCode} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid rgba(0,212,170,0.4)', background: copied ? 'rgba(0,212,170,0.15)' : 'rgba(0,0,0,0.2)', color: copied ? 'var(--accent-teal)' : 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem', transition: 'all 0.2s' }}>
                                            {copied ? '✅ Copied!' : '📋 Copy Code'}
                                        </button>
                                        <button onClick={shareWhatsApp} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}>
                                            📱 WhatsApp
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Progress to next reward */}
                        <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                            <h3 style={{ marginBottom: 20 }}>🎯 Reward Progress</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {REWARD_SLABS.map((slab, i) => {
                                    const done = count >= slab.count;
                                    const isCurrent = count < slab.count && (i === 0 || count >= REWARD_SLABS[i - 1].count);
                                    return (
                                        <div key={slab.count} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', borderRadius: 10, background: done ? 'rgba(16,185,129,0.08)' : isCurrent ? 'rgba(0,212,170,0.06)' : 'rgba(0,0,0,0.1)', border: `1px solid ${done ? 'rgba(16,185,129,0.25)' : isCurrent ? 'rgba(0,212,170,0.2)' : 'rgba(255,255,255,0.05)'}` }}>
                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: done ? '#10b981' : isCurrent ? 'rgba(0,212,170,0.2)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: done ? '#000' : isCurrent ? 'var(--accent-teal)' : 'var(--text-muted)', flexShrink: 0 }}>
                                                {done ? '✓' : slab.count}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: done ? '#10b981' : isCurrent ? 'var(--text-primary)' : 'var(--text-muted)' }}>{slab.reward}</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{slab.count} referral{slab.count > 1 ? 's' : ''} required</div>
                                            </div>
                                            {isCurrent && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--accent-teal)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                    {slab.count - count} more to go →
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Who joined via this driver's code */}
                        <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
                            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ margin: 0 }}>🧑‍✈️ Drivers Who Joined via Your Code</h3>
                                <span style={{ background: 'rgba(0,212,170,0.12)', color: 'var(--accent-teal)', padding: '4px 12px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 700 }}>{joinedDrivers.length} joined</span>
                            </div>

                            {joinedDrivers.length === 0 ? (
                                <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>👋</div>
                                    <div>No drivers have joined using your code yet.</div>
                                    <div style={{ fontSize: '0.8rem', marginTop: 8 }}>Share your code via WhatsApp to start earning!</div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1.2fr', gap: 12, padding: '12px 24px', background: 'rgba(0,0,0,0.2)', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <div>Name</div>
                                        <div>Phone</div>
                                        <div>Email</div>
                                        <div>Joined On</div>
                                    </div>
                                    {joinedDrivers.map((d, i) => (
                                        <div key={d._id || i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1.2fr', gap: 12, padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}
                                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,212,170,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent-teal)', fontSize: '0.9rem', flexShrink: 0 }}>
                                                    {(d.name || 'D')[0].toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{d.name}</span>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>+91 {d.phone}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.email || '—'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(d.createdAt).toLocaleDateString('en-IN')}</div>
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
