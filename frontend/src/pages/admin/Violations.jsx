import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { getAdminViolations } from '../../services/api';

export default function AdminViolations() {
    const [violations, setViolations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAdminViolations().then(r => setViolations(r.data.violations || [])).finally(() => setLoading(false));
    }, []);

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>Speed Violations ⚠️</h1>
                    <p>All recorded speed limit breaches (max 60 km/h)</p>
                </div>

                {violations.length > 0 && (
                    <div className="glass-card" style={{ padding: 20, marginBottom: 20, borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
                        <div style={{ display: 'flex', gap: 24 }}>
                            <div><div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444' }}>{violations.length}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Violations</div></div>
                            <div><div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>{Math.max(...violations.map(v => v.speed || 0))} km/h</div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Highest Speed</div></div>
                            <div><div style={{ fontSize: '2rem', fontWeight: 800, color: '#3b82f6' }}>{new Set(violations.map(v => v.driverId?._id)).size}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Unique Drivers</div></div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="loading-screen"><div className="spinner" /></div>
                ) : violations.length === 0 ? (
                    <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
                        <h3 style={{ color: '#10b981', marginBottom: 8 }}>No Violations Recorded</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>All drivers are following the 60 km/h speed limit.</p>
                    </div>
                ) : (
                    <div className="glass-card" style={{ padding: 0 }}>
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Driver</th><th>Speed</th><th>Over Limit</th><th>Location</th><th>Order</th><th>Time</th></tr>
                                </thead>
                                <tbody>
                                    {violations.map(v => (
                                        <tr key={v._id}>
                                            <td>
                                                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{v.driverId?.name || '—'}</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{v.driverId?.phone}</div>
                                            </td>
                                            <td>
                                                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>{v.speed} km/h</span>
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 700, color: '#f59e0b' }}>+{v.speed - v.maxAllowed} km/h</span>
                                            </td>
                                            <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                                {v.location?.lat ? `${v.location.lat.toFixed(4)}, ${v.location.lng.toFixed(4)}` : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                                #{v.orderId?._id?.slice(-6).toUpperCase() || '—'}
                                            </td>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {new Date(v.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
