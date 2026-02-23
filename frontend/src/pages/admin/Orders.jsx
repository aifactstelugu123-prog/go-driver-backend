import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { getAdminOrders } from '../../services/api';

const statusColor = { Searching: 'warning', Accepted: 'info', Active: 'success', Completed: 'teal', Cancelled: 'danger' };

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    const load = (s) => {
        setLoading(true);
        getAdminOrders(s ? { status: s } : {}).then(r => setOrders(r.data.orders || [])).finally(() => setLoading(false));
    };

    useEffect(() => { load(filter); }, [filter]);

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>Order Management 📋</h1>
                    <p>Monitor all rides across the platform</p>
                </div>

                {/* Filter */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                    {['', 'Searching', 'Accepted', 'Active', 'Completed', 'Cancelled'].map(s => (
                        <button key={s || 'all'} onClick={() => setFilter(s)} className={`btn ${filter === s ? 'btn-primary' : 'btn-secondary'} btn-sm`}>
                            {s || 'All Orders'}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="loading-screen"><div className="spinner" /></div>
                ) : (
                    <div className="glass-card" style={{ padding: 0 }}>
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Status</th><th>Owner</th><th>Driver</th><th>Vehicle Type</th><th>Pickup</th><th>Drop</th><th>Scheduled</th><th>Fare</th></tr>
                                </thead>
                                <tbody>
                                    {orders.length === 0 ? (
                                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No orders found</td></tr>
                                    ) : orders.map(o => (
                                        <tr key={o._id}>
                                            <td><span className={`badge badge-${statusColor[o.status] || 'muted'}`}>{o.status}</span></td>
                                            <td>
                                                <div style={{ fontSize: '0.85rem' }}>{o.ownerId?.name || '—'}</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{o.ownerId?.phone}</div>
                                            </td>
                                            <td>
                                                {o.driverId ? (
                                                    <div>
                                                        <div style={{ fontSize: '0.85rem' }}>{o.driverId?.name}</div>
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{o.driverId?.phone}</div>
                                                        {o.driverId?.currentLocation && o.status === 'Active' && (
                                                            <div style={{ fontSize: '0.68rem', color: 'var(--accent-teal)' }}>🟢 Live GPS</div>
                                                        )}
                                                    </div>
                                                ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>}
                                            </td>
                                            <td style={{ fontSize: '0.85rem' }}>{o.vehicleType}</td>
                                            <td style={{ fontSize: '0.82rem', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {o.pickupLocation?.address || `${o.pickupLocation?.lat?.toFixed(3)}, ${o.pickupLocation?.lng?.toFixed(3)}`}
                                            </td>
                                            <td style={{ fontSize: '0.82rem', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {o.dropLocation?.address || `${o.dropLocation?.lat?.toFixed(3)}, ${o.dropLocation?.lng?.toFixed(3)}`}
                                            </td>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {new Date(o.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}<br />
                                                {new Date(o.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td style={{ fontWeight: 600, color: 'var(--accent-teal)' }}>
                                                {o.finalAmount ? `₹${o.finalAmount}` : o.hourlyRate ? `₹${o.hourlyRate}/hr` : '—'}
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
