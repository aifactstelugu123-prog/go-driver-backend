import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../../components/Sidebar';
import { getOwnerProfile, getOwnerRides, getVehicles, acceptTnC } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function OwnerDashboard() {
    const { user, socket } = useAuth();
    const navigate = useNavigate();
    const [rides, setRides] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rideAlert, setRideAlert] = useState(null); // {driverName, phone, orderId}

    // T&C state
    const [showTnC, setShowTnC] = useState(false);
    const [agreedToTnC, setAgreedToTnC] = useState(false);
    const [savingTnC, setSavingTnC] = useState(false);

    useEffect(() => {
        Promise.all([getOwnerProfile(), getOwnerRides(), getVehicles()])
            .then(([p, r, v]) => {
                setRides(r.data.orders || []);
                setVehicles(v.data.vehicles || []);
                if (p.data.owner && !p.data.owner.acceptedTnC) {
                    setShowTnC(true);
                }
            })
            .finally(() => setLoading(false));
    }, []);

    // Socket: listen for ride accepted by driver
    useEffect(() => {
        if (!socket) return;

        socket.on('ride:accepted', ({ orderId, driver }) => {
            // Play a short beep
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = 'sine'; osc.frequency.value = 880;
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                osc.start(); osc.stop(ctx.currentTime + 0.5);
            } catch { }
            setRideAlert({ orderId, driverName: driver?.name, phone: driver?.phone });
            // Auto-dismiss after 10s
            setTimeout(() => setRideAlert(null), 10000);
        });

        return () => {
            socket.off('ride:accepted');
        };
    }, [socket]);

    const stats = {
        total: rides.length,
        active: rides.filter(r => ['Active', 'Searching', 'Accepted'].includes(r.status)).length,
        completed: rides.filter(r => r.status === 'Completed').length,
        vehicles: vehicles.length,
    };

    const statusColor = { Searching: 'warning', Accepted: 'info', Active: 'success', Completed: 'teal', Cancelled: 'danger' };
    const recent = rides.slice(0, 5);

    const handleAcceptTnC = async () => {
        if (!agreedToTnC) return;
        setSavingTnC(true);
        try {
            await acceptTnC();
            setShowTnC(false);
        } catch (e) {
            alert(e.response?.data?.message || 'Failed to accept terms.');
        }
        setSavingTnC(false);
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {/* T&C Blocking Overlay */}
                {showTnC && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <div className="glass-card" style={{ maxWidth: 500, width: '100%', padding: 40, background: 'var(--bg-secondary)', border: '2px solid var(--accent-teal)' }}>
                            <h2 style={{ color: 'var(--text-primary)', marginBottom: 16 }}>Terms & Conditions</h2>
                            <div style={{ maxHeight: 300, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 8, marginBottom: 20, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                <p>Welcome to Driver-as-a-Service (DaaS).</p>
                                <br />
                                <p><strong>1. Owner Responsibilities:</strong> You agree that your vehicle is legally registered, insured, and deeply maintained. You must hold valid RC and PUC documents.</p>
                                <br />
                                <p><strong>2. Driver Safety:</strong> You agree not to compel the assigned driver to perform illegal acts or drive recklessly.</p>
                                <br />
                                <p><strong>3. Payments:</strong> You agree to compensate the driver according to the system-calculated estimates. Fraudulent disputes may lead to account termination.</p>
                                <br />
                                <p><strong>4. Termination:</strong> DaaS reserves the right to suspend or terminate your account for violations of these terms, poor ratings from drivers, or safety concerns.</p>
                            </div>
                            <div className="form-checkbox-group" style={{ marginBottom: 24, padding: 8, background: 'rgba(0,212,170,0.05)', borderRadius: 8, border: '1px solid rgba(0,212,170,0.2)' }}>
                                <input type="checkbox" id="ownerTnc" className="form-checkbox" checked={agreedToTnC} onChange={(e) => setAgreedToTnC(e.target.checked)} />
                                <label htmlFor="ownerTnc" className="form-checkbox-label" style={{ userSelect: 'none' }}>
                                    I have read and agree to the Owner Terms and Conditions and Privacy Policy.
                                </label>
                            </div>
                            <button className="btn btn-primary btn-lg" onClick={handleAcceptTnC} disabled={!agreedToTnC || savingTnC} style={{ width: '100%', justifyContent: 'center' }}>
                                {savingTnC ? '⏳ Saving...' : '✅ Accept & Continue'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Driver accepted ride notification banner */}
                {rideAlert && (
                    <div style={{
                        position: 'fixed', top: 20, right: 20, zIndex: 9999,
                        background: 'linear-gradient(135deg,#10b981,#059669)',
                        borderRadius: 16, padding: '16px 20px', minWidth: 300,
                        boxShadow: '0 8px 32px rgba(16,185,129,0.4)',
                        animation: 'slide-in-right 0.4s ease-out',
                        color: '#fff',
                    }}>
                        <style>{`@keyframes slide-in-right { from { transform: translateX(120%); opacity:0; } to { transform: translateX(0); opacity:1; } }`}</style>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                            <span style={{ fontSize: '1.8rem' }}>🚗</span>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1rem' }}>Driver Assigned!</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{rideAlert.driverName} · 📞 {rideAlert.phone}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => { navigate(`/owner/rides/${rideAlert.orderId}`); setRideAlert(null); }}
                                style={{ flex: 1, padding: '8px', borderRadius: 8, border: '2px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                                Track Ride →
                            </button>
                            <button onClick={() => setRideAlert(null)}
                                style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer' }}>
                                ✕
                            </button>
                        </div>
                    </div>
                )}
                <div className="page-header">
                    <h1>Welcome back, {user?.name}! 👋</h1>
                    <p>Manage your vehicles and book professional drivers</p>
                </div>

                {loading ? (
                    <div className="loading-screen"><div className="spinner" /></div>
                ) : (
                    <>
                        {/* Stats */}
                        <div className="grid-4" style={{ marginBottom: 28 }}>
                            {[
                                { label: 'Total Rides', value: stats.total, icon: '🚗', color: '#00d4aa' },
                                { label: 'Active Rides', value: stats.active, icon: '🟢', color: '#10b981' },
                                { label: 'Completed', value: stats.completed, icon: '✅', color: '#3b82f6' },
                                { label: 'My Vehicles', value: stats.vehicles, icon: '🚙', color: '#8b5cf6' },
                            ].map((s) => (
                                <div key={s.label} className="stat-card">
                                    <div className="stat-icon" style={{ background: `${s.color}20` }}>{s.icon}</div>
                                    <div className="stat-info">
                                        <h3 style={{ color: s.color }}>{s.value}</h3>
                                        <p>{s.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Quick Actions */}
                        <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                            <h3 style={{ marginBottom: 16 }}>Quick Actions</h3>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                <button id="book-driver-btn" className="btn btn-primary btn-lg" onClick={() => navigate('/owner/create-ride')}>
                                    ➕ Book a Driver
                                </button>
                                <button className="btn btn-secondary" onClick={() => navigate('/owner/vehicles')}>
                                    🚗 Manage Vehicles
                                </button>
                                <button className="btn btn-secondary" onClick={() => navigate('/owner/rides')}>
                                    📋 View All Rides
                                </button>
                            </div>
                        </div>

                        {/* Active Rides */}
                        {stats.active > 0 && (
                            <div className="glass-card" style={{ padding: 24, marginBottom: 24, borderColor: 'rgba(0,212,170,0.3)' }}>
                                <h3 style={{ marginBottom: 16, color: 'var(--accent-teal)' }}>🟢 Active Rides</h3>
                                {rides.filter(r => ['Active', 'Accepting', 'Searching'].includes(r.status)).map(ride => (
                                    <div key={ride._id} className="ride-card" onClick={() => navigate(`/owner/rides/${ride._id}`)} style={{ cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <span className={`badge badge-${statusColor[ride.status] || 'muted'}`}>{ride.status}</span>
                                                <div style={{ marginTop: 8, fontSize: '0.88rem' }}>
                                                    <span style={{ color: 'var(--text-secondary)' }}>🚗 {ride.vehicleType}</span>
                                                    <span style={{ margin: '0 8px', color: 'var(--border)' }}>|</span>
                                                    <span style={{ color: 'var(--text-secondary)' }}>₹{ride.hourlyRate}/hr</span>
                                                </div>
                                            </div>
                                            <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/owner/rides/${ride._id}`); }}>
                                                Track →
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Recent Rides */}
                        <div className="glass-card" style={{ padding: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3>Recent Rides</h3>
                                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/owner/rides')}>View All</button>
                            </div>
                            {recent.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🚗</div>
                                    <p>No rides yet. <button className="btn btn-primary btn-sm" onClick={() => navigate('/owner/create-ride')}>Book your first driver!</button></p>
                                </div>
                            ) : (
                                <div className="table-wrapper">
                                    <table className="data-table">
                                        <thead><tr><th>Status</th><th>Vehicle Type</th><th>Pickup</th><th>Drop</th><th>Fare</th></tr></thead>
                                        <tbody>
                                            {recent.map(r => (
                                                <tr key={r._id} onClick={() => navigate(`/owner/rides/${r._id}`)} style={{ cursor: 'pointer' }}>
                                                    <td><span className={`badge badge-${statusColor[r.status] || 'muted'}`}>{r.status}</span></td>
                                                    <td>{r.vehicleType}</td>
                                                    <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.pickupLocation?.address || `${r.pickupLocation?.lat}, ${r.pickupLocation?.lng}`}</td>
                                                    <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.dropLocation?.address || `${r.dropLocation?.lat}, ${r.dropLocation?.lng}`}</td>
                                                    <td style={{ color: 'var(--accent-teal)', fontWeight: 600 }}>
                                                        {r.finalAmount ? `₹${r.finalAmount}` : r.hourlyRate ? `₹${r.hourlyRate}/hr` : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
