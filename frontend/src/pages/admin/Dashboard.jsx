import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { getAnalytics } from '../../services/api';

export default function AdminDashboard() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAnalytics().then(r => setAnalytics(r.data.analytics)).finally(() => setLoading(false));
    }, []);

    const a = analytics;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>Admin Dashboard 📊</h1>
                    <p>Platform overview and live metrics</p>
                </div>

                {loading ? (
                    <div className="loading-screen"><div className="spinner" /></div>
                ) : (
                    <>
                        {/* Top Stats */}
                        <div className="grid-4" style={{ marginBottom: 24 }}>
                            {[
                                { label: 'Total Drivers', value: a?.drivers?.total || 0, icon: '🧑‍✈️', color: '#3b82f6', sub: `${a?.drivers?.approved || 0} approved` },
                                { label: 'Vehicle Owners', value: a?.owners?.total || 0, icon: '👤', color: '#8b5cf6', sub: 'registered' },
                                { label: 'Total Orders', value: a?.orders?.total || 0, icon: '🚗', color: '#00d4aa', sub: `${a?.orders?.active || 0} active` },
                                { label: 'Speed Violations', value: a?.violations?.total || 0, icon: '⚠️', color: '#ef4444', sub: 'all time' },
                            ].map(s => (
                                <div key={s.label} className="stat-card">
                                    <div className="stat-icon" style={{ background: `${s.color}20` }}>{s.icon}</div>
                                    <div className="stat-info">
                                        <h3 style={{ color: s.color }}>{s.value}</h3>
                                        <p>{s.label}</p>
                                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Revenue Row */}
                        <div className="grid-3" style={{ marginBottom: 24 }}>
                            {[
                                { label: 'Platform Earnings', value: `₹${a?.revenue?.platformEarnings || 0}`, icon: '💰', color: '#10b981' },
                                { label: 'Subscription Revenue', value: `₹${a?.revenue?.subscriptionRevenue || 0}`, icon: '💳', color: '#f59e0b' },
                                { label: 'Total Fare Processed', value: `₹${a?.revenue?.totalFareProcessed || 0}`, icon: '📦', color: '#3b82f6' },
                            ].map(s => (
                                <div key={s.label} className="glass-card" style={{ padding: 24, textAlign: 'center', borderColor: `${s.color}30` }}>
                                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>{s.icon}</div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Driver Status + Order Status side by side */}
                        <div className="grid-2">
                            <div className="glass-card" style={{ padding: 24 }}>
                                <h3 style={{ marginBottom: 16 }}>🧑‍✈️ Driver Status</h3>
                                {[
                                    { label: 'Approved', value: a?.drivers?.approved || 0, color: '#10b981' },
                                    { label: 'Pending Approval', value: a?.drivers?.pending || 0, color: '#f59e0b' },
                                    { label: 'Blocked', value: a?.drivers?.blocked || 0, color: '#ef4444' },
                                    { label: 'Active Subscriptions', value: a?.subscriptions?.active || 0, color: '#3b82f6' },
                                ].map(row => (
                                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                        <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{row.label}</span>
                                        <span style={{ fontWeight: 700, color: row.color, fontSize: '1.1rem' }}>{row.value}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="glass-card" style={{ padding: 24 }}>
                                <h3 style={{ marginBottom: 16 }}>🚗 Order Status</h3>
                                {[
                                    { label: 'Currently Active', value: a?.orders?.active || 0, color: '#10b981' },
                                    { label: 'Completed Today', value: a?.orders?.completed || 0, color: '#00d4aa' },
                                    { label: 'Total Orders', value: a?.orders?.total || 0, color: '#3b82f6' },
                                ].map(row => (
                                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                        <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{row.label}</span>
                                        <span style={{ fontWeight: 700, color: row.color, fontSize: '1.1rem' }}>{row.value}</span>
                                    </div>
                                ))}

                                {/* Ride Trend */}
                                {a?.rideTrend?.length > 0 && (
                                    <div style={{ marginTop: 20 }}>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 10 }}>Last 7 days ride trend</div>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 60 }}>
                                            {a.rideTrend.map(({ _id, count }) => {
                                                const max = Math.max(...a.rideTrend.map(t => t.count), 1);
                                                return (
                                                    <div key={_id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                                        <div style={{ width: '100%', background: 'var(--accent-teal)', borderRadius: '3px 3px 0 0', height: `${(count / max) * 50}px`, opacity: 0.8, minHeight: 4 }} />
                                                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', transform: 'rotate(-45deg)', transformOrigin: 'top left', marginLeft: 6 }}>{_id?.slice(5)}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
