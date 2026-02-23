import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Sidebar from '../../components/Sidebar';
import { getOwnerRideById, generateStartOtp, generateEndOtp } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ActiveRide() {
    const { id } = useParams();
    const { user, socket } = useAuth();
    const navigate = useNavigate();
    const [ride, setRide] = useState(null);
    const [loading, setLoading] = useState(true);
    const [speedAlert, setSpeedAlert] = useState(null);
    const [driverLoc, setDriverLoc] = useState(null);
    const [driverAcceptedToast, setDriverAcceptedToast] = useState(false);

    useEffect(() => {
        getOwnerRideById(id).then(r => setRide(r.data.order)).finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (!socket || !user) return;

        socket.on('driver:location', ({ lat, lng, speed }) => {
            setDriverLoc({ lat, lng, speed });
        });
        socket.on('speed:violation', ({ speed, message }) => {
            setSpeedAlert({ speed, message });
            setTimeout(() => setSpeedAlert(null), 8000);
        });
        socket.on('ride:accepted', ({ driver }) => {
            setRide(prev => prev ? { ...prev, status: 'Accepted', driverId: driver } : prev);
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
            setDriverAcceptedToast(true);
            setTimeout(() => setDriverAcceptedToast(false), 8000);
        });
        socket.on('ride:started', () => {
            setRide(prev => prev ? { ...prev, status: 'Active' } : prev);
        });
        socket.on('ride:completed', ({ fareData }) => {
            setRide(prev => prev ? { ...prev, status: 'Completed', ...fareData } : prev);
        });
        socket.on('ride:driver_reached', ({ message }) => {
            setSpeedAlert({ message, isInfo: true });
            setTimeout(() => setSpeedAlert(null), 5000);
        });
        socket.on('ride:turnaround', ({ orderId }) => {
            setRide(prev => prev ? { ...prev, isReturnLeg: true } : prev);
            setSpeedAlert({ message: '🔄 Driver reached turnaround point. Heading back to you!', isInfo: true });
            setTimeout(() => setSpeedAlert(null), 8000);
        });
        return () => {
            socket.off('driver:location');
            socket.off('speed:violation');
            socket.off('ride:accepted');
            socket.off('ride:started');
            socket.off('ride:completed');
            socket.off('ride:driver_reached');
            socket.off('ride:turnaround');
        };
    }, [socket, user]);


    if (loading) return <div className="app-layout"><Sidebar /><main className="main-content"><div className="loading-screen"><div className="spinner" /></div></main></div>;
    if (!ride) return <div className="app-layout"><Sidebar /><main className="main-content"><p>Order not found.</p></main></div>;

    const statusColor = { Searching: '#f59e0b', Accepted: '#3b82f6', Active: '#10b981', Completed: '#00d4aa', Cancelled: '#ef4444' };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {/* Speed Alert */}
                {speedAlert && (
                    <div className="speed-alert">
                        ⚠️ {speedAlert.message}
                    </div>
                )}

                {/* Driver Accepted Toast */}
                {driverAcceptedToast && (
                    <div style={{
                        position: 'fixed', top: 20, right: 20, zIndex: 9999,
                        background: 'linear-gradient(135deg,#10b981,#059669)',
                        borderRadius: 16, padding: '16px 20px', minWidth: 280,
                        boxShadow: '0 8px 32px rgba(16,185,129,0.4)',
                        animation: 'slide-in-right 0.4s ease-out',
                        color: '#fff',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                            <span style={{ fontSize: '1.8rem' }}>🚗</span>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1rem' }}>Driver Assigned!</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Your driver will arrive shortly.</div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={() => navigate('/owner/rides')} className="btn btn-secondary btn-sm">← Back</button>
                        <div>
                            <h1>Ride Details</h1>
                            <p>Order #{id.slice(-8).toUpperCase()}</p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
                    {/* Main Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Status Card */}
                        <div className="glass-card" style={{ padding: 24, borderColor: `${statusColor[ride.status]}40` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Status</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: statusColor[ride.status] }}>
                                        ● {ride.status} {ride.isReturnLeg ? '(Returning)' : ''}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Vehicle Type</div>
                                    <div style={{ fontWeight: 600 }}>{ride.vehicleType}</div>
                                    {ride.hourlyRate && <div style={{ color: 'var(--accent-teal)', fontSize: '0.85rem' }}>₹{ride.hourlyRate}/hr</div>}
                                </div>
                            </div>
                        </div>

                        {/* Route */}
                        <div className="glass-card" style={{ padding: 24 }}>
                            <h3 style={{ marginBottom: 16 }}>Route</h3>
                            <div className="ride-route">
                                <div className="route-dots">
                                    <div className="route-dot-pickup" />
                                    <div className="route-line" style={{ height: 40 }} />
                                    <div className="route-dot-drop" />
                                </div>
                                <div className="route-labels" style={{ flex: 1 }}>
                                    <div>
                                        <div className="route-label-text">{ride.isRoundTrip ? '📍 Home (Pickup/Final)' : '📍 Pickup'}</div>
                                        <div className="route-label-value">{ride.pickupLocation?.address || `${ride.pickupLocation?.lat}, ${ride.pickupLocation?.lng}`}</div>
                                    </div>
                                    <div style={{ marginTop: 16 }}>
                                        <div className="route-label-text">{ride.isRoundTrip ? '🏁 Turnaround (Destination)' : '🏁 Drop'}</div>
                                        <div className="route-label-value">{ride.dropLocation?.address || `${ride.dropLocation?.lat}, ${ride.dropLocation?.lng}`}</div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                📅 Scheduled: {new Date(ride.scheduledAt).toLocaleString('en-IN')}
                            </div>
                        </div>

                        {/* Driver Info */}
                        {ride.driverId && (
                            <div className="glass-card" style={{ padding: 24 }}>
                                <h3 style={{ marginBottom: 16 }}>🧑‍✈️ Assigned Driver</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ position: 'relative' }}>
                                        {ride.driverId?.profilePhoto ? (
                                            <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${ride.driverId.profilePhoto}`} alt="Driver"
                                                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-teal)' }} />
                                        ) : (
                                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #00d4aa, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.4rem' }}>
                                                {ride.driverId?.name?.[0] || 'D'}
                                            </div>
                                        )}
                                        {ride.driverId?.trainingBadge && (
                                            <div style={{ position: 'absolute', bottom: -2, right: -2, background: '#10b981', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', border: '2px solid var(--bg-card)' }} title="Verified Driver">
                                                ✅
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{ride.driverId?.name}</div>
                                            {ride.driverId?.rating && (
                                                <div style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600 }}>⭐ {ride.driverId.rating.toFixed(1)}</div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <span>📞</span> {ride.driverId?.phone}
                                            </div>
                                            {ride.driverId?.trainingBadge && (
                                                <div style={{ background: 'rgba(0,212,170,0.1)', color: 'var(--accent-teal)', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Badge Earned
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {driverLoc && (
                                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(0,212,170,0.08)', borderRadius: 8, fontSize: '0.83rem' }}>
                                        <span style={{ color: 'var(--accent-teal)' }}>🟢 Live:</span> Lat {driverLoc.lat?.toFixed(5)}, Lng {driverLoc.lng?.toFixed(5)}
                                        {driverLoc.speed && (
                                            <span style={{ marginLeft: 10, color: driverLoc.speed > 60 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                                                {driverLoc.speed > 60 ? '⚠️' : '✅'} {driverLoc.speed} km/h
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Fare Card - Completed */}
                        {ride.status === 'Completed' && (
                            <div className="glass-card" style={{ padding: 24, borderColor: 'rgba(0,212,170,0.3)' }}>
                                <h3 style={{ marginBottom: 16 }}>💰 Fare Breakdown</h3>
                                <div className="fare-row"><span className="fare-label">Duration</span><span className="fare-value">{ride.rideHours} hrs</span></div>
                                <div className="fare-row"><span className="fare-label">Hourly Rate</span><span className="fare-value">₹{ride.hourlyRate}/hr</span></div>
                                <div className="fare-row"><span className="fare-label">Base Fare</span><span className="fare-value">₹{ride.baseFare}</span></div>
                                {ride.returnCharges > 0 && <div className="fare-row"><span className="fare-label">Return Charges ({ride.returnDistance} km)</span><span className="fare-value">₹{ride.returnCharges}</span></div>}
                                <div className="fare-row"><span className="fare-label">Total Amount</span><span className="fare-value">₹{ride.finalAmount}</span></div>
                                <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(0,212,170,0.08)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Drop verification: <strong style={{ color: 'var(--accent-teal)' }}>{ride.dropVerification}</strong>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* OTP Panel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Status Info Panel */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="glass-card" style={{ padding: 24, textAlign: 'center', borderStyle: 'dashed' }}>
                                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🛡️</div>
                                <h4 style={{ marginBottom: 4 }}>OTP Verification Removed</h4>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    Per your request, OTPs are no longer required. The driver leads the ride status updates.
                                </p>
                            </div>

                            {ride.status === 'Searching' && (
                                <div className="glass-card" style={{ padding: 24, textAlign: 'center', borderColor: 'rgba(245,158,11,0.3)' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔍</div>
                                    <h3 style={{ marginBottom: 8 }}>Searching for Drivers</h3>
                                    <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                                        We're finding verified drivers near your pickup location. This usually takes under a minute.
                                    </p>
                                    <div className="spinner" style={{ margin: '16px auto 0' }} />
                                </div>
                            )}

                            {ride.status === 'Completed' && (
                                <div className="glass-card" style={{ padding: 24, textAlign: 'center', borderColor: 'rgba(0,212,170,0.3)' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✅</div>
                                    <h3 style={{ color: 'var(--accent-teal)' }}>Ride Completed!</h3>
                                    <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 12 }}>
                                        Thank you for riding
                                    </p>
                                    <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                                        Your ride has been completed successfully.
                                    </p>
                                    <button className="btn btn-secondary" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}
                                        onClick={() => navigate('/owner/create-ride', {
                                            state: {
                                                pickupAddress: ride.dropLocation?.address,
                                                pickupLat: ride.dropLocation?.lat,
                                                pickupLng: ride.dropLocation?.lng,
                                                dropAddress: ride.pickupLocation?.address,
                                                dropLat: ride.pickupLocation?.lat,
                                                dropLng: ride.pickupLocation?.lng,
                                                vehicleType: ride.vehicleType
                                            }
                                        })}>
                                        🔄 Add Return Journey
                                    </button>
                                    <button className="btn btn-primary" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={() => navigate('/owner/create-ride')}>
                                        ➕ Book New Ride
                                    </button>
                                </div>
                            )}

                            <div className="glass-card" style={{ padding: 16 }}>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                                    <strong style={{ color: 'var(--text-secondary)' }}>🛡️ Safety</strong><br />
                                    Max speed allowed: <strong>60 km/h</strong><br />
                                    You'll be notified instantly if driver exceeds limit.<br />
                                    All GPS data is logged for security.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
