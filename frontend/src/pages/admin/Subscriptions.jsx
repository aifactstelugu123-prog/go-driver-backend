import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { getAdminSubscriptions } from '../../services/api';

const planColors = { free_trial: '#10b981', basic: '#3b82f6', standard: '#8b5cf6', premium: '#f59e0b' };
const planEmojis = { free_trial: '🎁', basic: '🥉', standard: '🥈', premium: '🥇' };

export default function AdminSubscriptions() {
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAdminSubscriptions().then(r => setSubs(r.data.subscriptions || [])).finally(() => setLoading(false));
    }, []);

    const totalRevenue = subs.filter(s => s.paymentStatus === 'paid').reduce((acc, s) => acc + (s.price || 0), 0);
    const active = subs.filter(s => s.isActive && new Date(s.expiryDate) > new Date()).length;
    const planCount = subs.reduce((acc, s) => { acc[s.plan] = (acc[s.plan] || 0) + 1; return acc; }, {});

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>Subscriptions 💳</h1>
                    <p>All driver subscription plans and revenue</p>
                </div>

                {/* Summary Cards */}
                <div className="grid-4" style={{ marginBottom: 24 }}>
                    {[
                        { label: 'Total Subscriptions', value: subs.length, icon: '📊', color: '#3b82f6' },
                        { label: 'Currently Active', value: active, icon: '✅', color: '#10b981' },
                        { label: 'Revenue Collected', value: `₹${totalRevenue}`, icon: '💰', color: 'var(--accent-teal)' },
                        { label: 'Free Trials Used', value: subs.filter(s => s.isFreeTrial).length, icon: '🎁', color: '#8b5cf6' },
                    ].map(s => (
                        <div key={s.label} className="stat-card">
                            <div className="stat-icon" style={{ background: `${s.color}20` }}>{s.icon}</div>
                            <div className="stat-info">
                                <h3 style={{ color: s.color }}>{s.value}</h3>
                                <p>{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Plan Breakdown */}
                <div className="grid-4" style={{ marginBottom: 24 }}>
                    {Object.entries(planColors).map(([plan, color]) => (
                        <div key={plan} className="glass-card" style={{ padding: 20, textAlign: 'center', borderColor: `${color}40` }}>
                            <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>{planEmojis[plan]}</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{planCount[plan] || 0}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{plan.replace('_', ' ')}</div>
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div className="loading-screen"><div className="spinner" /></div>
                ) : (
                    <div className="glass-card" style={{ padding: 0 }}>
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Driver</th><th>Plan</th><th>Price</th><th>Rides Used</th><th>Ride Limit</th><th>Status</th><th>Expiry</th><th>Payment</th></tr>
                                </thead>
                                <tbody>
                                    {subs.length === 0 ? (
                                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No subscriptions yet</td></tr>
                                    ) : subs.map(s => {
                                        const isActive = s.isActive && new Date(s.expiryDate) > new Date() && s.ridesAssigned < s.rideLimit;
                                        return (
                                            <tr key={s._id}>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{s.driverId?.name || '—'}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.driverId?.phone}</div>
                                                </td>
                                                <td>
                                                    <span className="badge" style={{ background: `${planColors[s.plan]}20`, color: planColors[s.plan], fontSize: '0.75rem' }}>
                                                        {planEmojis[s.plan]} {s.planName}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: 700, color: 'var(--accent-teal)' }}>
                                                    {s.price === 0 ? 'Free' : `₹${s.price}`}
                                                </td>
                                                <td style={{ fontWeight: 600 }}>{s.ridesAssigned}</td>
                                                <td>{s.rideLimit}</td>
                                                <td>
                                                    {isActive ? (
                                                        <span className="badge badge-success">✅ Active</span>
                                                    ) : new Date(s.expiryDate) < new Date() ? (
                                                        <span className="badge badge-danger">Expired</span>
                                                    ) : s.ridesAssigned >= s.rideLimit ? (
                                                        <span className="badge badge-warning">Exhausted</span>
                                                    ) : (
                                                        <span className="badge badge-muted">Inactive</span>
                                                    )}
                                                </td>
                                                <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                                    {new Date(s.expiryDate).toLocaleDateString('en-IN')}
                                                </td>
                                                <td>
                                                    <span className={`badge ${s.paymentStatus === 'paid' ? 'badge-success' : s.paymentStatus === 'failed' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                                                        {s.paymentStatus}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
