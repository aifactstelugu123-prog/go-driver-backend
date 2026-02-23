import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { getOwnerRides } from '../../services/api';

const statusColor = { Searching: 'warning', Accepted: 'info', Active: 'success', Completed: 'teal', Cancelled: 'danger' };
const typeEmoji = { Car: '🚗', SUV: '🚙', Luxury: '✨', 'Mini Truck': '🚐', 'Heavy Vehicle': '🚛' };

export default function OwnerRides() {
    const navigate = useNavigate();
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');

    useEffect(() => {
        getOwnerRides().then(r => setRides(r.data.orders || [])).finally(() => setLoading(false));
    }, []);

    const statuses = ['All', 'Searching', 'Accepted', 'Active', 'Completed', 'Cancelled'];
    const filtered = filter === 'All' ? rides : rides.filter(r => r.status === filter);

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1>Ride History 📋</h1>
                            <p>All your past and current rides</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => navigate('/owner/create-ride')}>➕ New Ride</button>
                    </div>
                </div>

                {/* Filter tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                    {statuses.map(s => (
                        <button key={s} onClick={() => setFilter(s)}
                            className={`btn ${filter === s ? 'btn-primary' : 'btn-secondary'} btn-sm`}>
                            {s} {s !== 'All' && <span style={{ opacity: 0.7 }}>({rides.filter(r => r.status === s).length})</span>}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="loading-screen"><div className="spinner" /></div>
                ) : filtered.length === 0 ? (
                    <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🚗</div>
                        <p style={{ color: 'var(--text-secondary)' }}>No rides found for "{filter}"</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {filtered.map(r => (
                            <div key={r._id} className="ride-card" onClick={() => navigate(`/owner/rides/${r._id}`)} style={{ cursor: 'pointer' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ fontSize: '1.5rem' }}>{typeEmoji[r.vehicleType] || '🚗'}</span>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{r.vehicleType}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {new Date(r.scheduledAt).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span className={`badge badge-${statusColor[r.status] || 'muted'}`}>{r.status}</span>
                                        {r.finalAmount && (
                                            <div style={{ marginTop: 4, fontWeight: 700, color: 'var(--accent-teal)', fontSize: '1rem' }}>₹{r.finalAmount}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="ride-route">
                                    <div className="route-dots">
                                        <div className="route-dot-pickup" />
                                        <div className="route-line" />
                                        <div className="route-dot-drop" />
                                    </div>
                                    <div className="route-labels">
                                        <div>
                                            <div className="route-label-text">Pickup</div>
                                            <div className="route-label-value">{r.pickupLocation?.address || `${r.pickupLocation?.lat?.toFixed(4)}, ${r.pickupLocation?.lng?.toFixed(4)}`}</div>
                                        </div>
                                        <div>
                                            <div className="route-label-text">Drop</div>
                                            <div className="route-label-value">{r.dropLocation?.address || `${r.dropLocation?.lat?.toFixed(4)}, ${r.dropLocation?.lng?.toFixed(4)}`}</div>
                                        </div>
                                    </div>
                                </div>

                                {r.driverId && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                                        <span style={{ fontSize: '1.1rem' }}>🧑‍✈️</span>
                                        <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                                            Driver: <strong style={{ color: 'var(--text-primary)' }}>{r.driverId?.name || 'Assigned'}</strong>
                                            {r.driverId?.phone && <span style={{ marginLeft: 8 }}>📞 {r.driverId.phone}</span>}
                                        </span>
                                    </div>
                                )}

                                {r.status === 'Active' && (
                                    <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }}
                                        onClick={(e) => { e.stopPropagation(); navigate(`/owner/rides/${r._id}`); }}>
                                        🟢 Track Live
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
