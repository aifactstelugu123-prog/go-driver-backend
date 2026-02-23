import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Sidebar from '../../components/Sidebar';
import { getRideById, startRide, endRide } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function DriverActiveRide() {
    const { id } = useParams();
    const { user, socket } = useAuth();
    const navigate = useNavigate();
    const [ride, setRide] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentLoc, setCurrentLoc] = useState(null);
    const [speedAlert, setSpeedAlert] = useState(false);
    const [currentSpeed, setCurrentSpeed] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [fareResult, setFareResult] = useState(null);
    const watchIdRef = useRef(null);
    const prevLocRef = useRef(null);
    const prevTimeRef = useRef(null);

    useEffect(() => {
        getRideById(id).then(r => setRide(r.data.order)).finally(() => setLoading(false));
    }, [id]);

    // GPS Tracking & Socket Listeners
    useEffect(() => {
        if (!socket || !user) return;

        socket.on('speed:warning', ({ message }) => {
            setSpeedAlert(true);
            setTimeout(() => setSpeedAlert(false), 5000);
        });

        socket.on('ride:turnaround', ({ turnaroundTime }) => {
            setRide(prev => prev ? { ...prev, isReturnLeg: true, turnaroundTime } : prev);
            alert('🔄 Turnaround point reached! Please head back to original pickup location.');
        });

        if (navigator.geolocation) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude: lat, longitude: lng } = pos.coords;
                    setCurrentLoc({ lat, lng });

                    // Calculate speed using Haversine
                    let speed = 0;
                    if (prevLocRef.current && prevTimeRef.current) {
                        const R = 6371000;
                        const dLat = (lat - prevLocRef.current.lat) * Math.PI / 180;
                        const dLng = (lng - prevLocRef.current.lng) * Math.PI / 180;
                        const a = Math.sin(dLat / 2) ** 2 + Math.cos(prevLocRef.current.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
                        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // meters
                        const timeDiff = (Date.now() - prevTimeRef.current) / 1000; // seconds
                        speed = Math.round((dist / timeDiff) * 3.6); // km/h
                    }
                    setCurrentSpeed(speed);
                    prevLocRef.current = { lat, lng };
                    prevTimeRef.current = Date.now();

                    socket.emit('driver:location', { driverId: user.id, orderId: id, lat, lng, speed });
                },
                (err) => console.warn('GPS error:', err),
                { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
            );
        }

        return () => {
            socket.off('speed:warning');
            socket.off('ride:turnaround');
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        };
    }, [socket, user, id]);

    const handleStart = async () => {
        if (!currentLoc) return alert('GPS location not available yet. Please wait.');
        setProcessing(true);
        try {
            const { data } = await startRide(id, { lat: currentLoc.lat, lng: currentLoc.lng });
            setRide(data.order);
        } catch (e) {
            alert(e.response?.data?.message || 'Failed to start ride.');
        }
        setProcessing(false);
    };

    const handleEnd = async () => {
        if (!currentLoc) return;
        setProcessing(true);
        try {
            const { data } = await endRide(id, { lat: currentLoc.lat, lng: currentLoc.lng });
            setRide(data.order);
            if (data.order.status === 'Completed') {
                setFareResult(data.fareBreakdown);
            }
        } catch (e) {
            alert(e.response?.data?.message || 'Failed to end ride.');
        }
        setProcessing(false);
    };

    if (loading) return <div className="app-layout"><Sidebar /><main className="main-content"><div className="loading-screen"><div className="spinner" /></div></main></div>;
    if (!ride) return <div className="app-layout"><Sidebar /><main className="main-content"><p style={{ padding: 24 }}>Ride not found.</p></main></div>;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {/* Speed Alert Banner */}
                {speedAlert && (
                    <div className="speed-alert">
                        ⚠️ You are exceeding the speed limit! Slow down immediately.
                    </div>
                )}

                <div className="page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/driver')}>← Dashboard</button>
                        <div>
                            <h1>Active Ride 🚗</h1>
                            <p>Order: #{id.slice(-8).toUpperCase()}</p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Live GPS Status */}
                        <div className="glass-card" style={{ padding: 20, borderColor: currentSpeed > 60 ? 'rgba(239,68,68,0.5)' : 'rgba(0,212,170,0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Live GPS</div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                        {currentLoc ? `${currentLoc.lat.toFixed(5)}, ${currentLoc.lng.toFixed(5)}` : '📍 Acquiring signal...'}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Speed</div>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: currentSpeed > 60 ? '#ef4444' : '#10b981' }}>
                                        {currentSpeed} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>km/h</span>
                                    </div>
                                    {currentSpeed > 60 && <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600 }}>⚠️ MAX 60 km/h</div>}
                                </div>
                            </div>
                            {currentLoc && (
                                <div style={{ marginTop: 12, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.min((currentSpeed / 120) * 100, 100)}%`, background: currentSpeed > 60 ? '#ef4444' : '#10b981', borderRadius: 3, transition: 'all 0.5s' }} />
                                </div>
                            )}
                        </div>

                        {/* Route */}
                        <div className="glass-card" style={{ padding: 24 }}>
                            <h3 style={{ marginBottom: 16 }}>Route Details</h3>
                            <div className="ride-route">
                                <div className="route-dots">
                                    <div className="route-dot-pickup" />
                                    <div className="route-line" style={{ height: 40 }} />
                                    <div className="route-dot-drop" />
                                </div>
                                <div className="route-labels" style={{ flex: 1 }}>
                                    <div>
                                        <div className="route-label-text">📍 Pickup</div>
                                        <div className="route-label-value">{ride.pickupLocation?.address || `${ride.pickupLocation?.lat?.toFixed(4)}, ${ride.pickupLocation?.lng?.toFixed(4)}`}</div>
                                    </div>
                                    <div style={{ marginTop: 16 }}>
                                        <div className="route-label-text">🏁 Drop</div>
                                        <div className="route-label-value">{ride.dropLocation?.address || `${ride.dropLocation?.lat?.toFixed(4)}, ${ride.dropLocation?.lng?.toFixed(4)}`}</div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--border)', overflow: 'hidden', flexShrink: 0 }}>
                                    {ride.ownerId?.profilePhoto ? (
                                        <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${ride.ownerId.profilePhoto}`}
                                            alt="Owner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>👤</div>
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vehicle Owner</div>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ride.ownerId?.name || 'Loading...'}</div>
                                    {ride.ownerId?.rating && (
                                        <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>⭐ {ride.ownerId.rating.toFixed(1)}</div>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                                    <div style={{ color: 'var(--text-muted)' }}>{ride.vehicleType}</div>
                                    <div style={{ fontWeight: 600 }}>₹{ride.hourlyRate}/hr</div>
                                </div>
                            </div>
                        </div>

                        {/* Fare Result */}
                        {fareResult && (
                            <div className="glass-card" style={{ padding: 24, borderColor: 'rgba(0,212,170,0.4)' }}>
                                <h3 style={{ marginBottom: 16, color: 'var(--accent-teal)' }}>🎉 Ride Complete - Fare Breakdown</h3>
                                <div className="fare-row"><span className="fare-label">Duration</span><span className="fare-value">{fareResult.rideHours} hrs</span></div>
                                <div className="fare-row"><span className="fare-label">Hourly Rate</span><span className="fare-value">₹{fareResult.hourlyRate}/hr</span></div>
                                <div className="fare-row"><span className="fare-label">Base Fare</span><span className="fare-value">₹{fareResult.baseFare}</span></div>
                                {fareResult.returnCharges > 0 && <div className="fare-row"><span className="fare-label">Return Charges ({fareResult.returnDistance}km)</span><span className="fare-value">₹{fareResult.returnCharges}</span></div>}
                                <div className="fare-row"><span className="fare-label">Platform Commission (10%)</span><span className="fare-value" style={{ color: '#ef4444' }}>-₹{fareResult.platformCommission}</span></div>
                                <div className="fare-row" style={{ borderTop: '2px solid var(--accent-teal)', paddingTop: 12, marginTop: 4 }}>
                                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>Your Earnings</span>
                                    <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent-teal)' }}>₹{fareResult.driverEarnings}</span>
                                </div>
                                <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-teal)', marginTop: 16, textAlign: 'center' }}>
                                    Please say thanks to Owner
                                </p>
                                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }} onClick={() => navigate('/driver')}>
                                    ← Back to Dashboard
                                </button>
                            </div>
                        )}
                    </div>

                    {/* OTP Panel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="glass-card" style={{ padding: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600 }}>Ride Status</span>
                            <span style={{ fontWeight: 700, color: ride.status === 'Active' ? '#10b981' : '#3b82f6' }}>
                                ● {ride.status} {ride.isReturnLeg ? '(Returning)' : ''}
                            </span>
                        </div>

                        {ride.status === 'Accepted' && !fareResult && (
                            <div className="glass-card" style={{ padding: 22, borderColor: 'rgba(16,185,129,0.3)' }}>
                                <h3 style={{ marginBottom: 10 }}>🟢 Ready to Start?</h3>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
                                    Confirm that you are with the vehicle and ready to begin the ride.
                                </p>
                                <button id="start-ride-btn" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                                    onClick={handleStart} disabled={processing || !currentLoc}>
                                    {processing ? 'Starting...' : !currentLoc ? '📍 Waiting for GPS...' : '🚀 Start Ride'}
                                </button>
                            </div>
                        )}

                        {ride.status === 'Active' && !fareResult && (
                            <div className="glass-card" style={{ padding: 22, borderColor: 'rgba(245,158,11,0.3)' }}>
                                <h3 style={{ marginBottom: 10 }}>
                                    {ride.isRoundTrip && !ride.isReturnLeg ? '🏁 Arrived at Turnaround?' : '🏁 Arrived at Destination?'}
                                </h3>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
                                    {ride.isRoundTrip && !ride.isReturnLeg
                                        ? 'Click the button once you reach the turnaround point.'
                                        : 'Click the button once you reach the final destination.'}
                                </p>
                                <button id="end-ride-btn" className="btn btn-warning" style={{ width: '100%', justifyContent: 'center' }}
                                    onClick={handleEnd} disabled={processing || !currentLoc}>
                                    {processing ? 'Processing...' : (ride.isRoundTrip && !ride.isReturnLeg ? '🔄 Reached Turnaround' : '🏁 Complete Ride')}
                                </button>
                            </div>
                        )}

                        <div className="glass-card" style={{ padding: 16 }}>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                                <strong style={{ color: 'var(--text-secondary)' }}>⚠️ Speed Rules</strong><br />
                                Max allowed: <strong style={{ color: '#10b981' }}>60 km/h</strong><br />
                                Exceeding limit will:<br />
                                • Warn the vehicle owner<br />
                                • Alert admin dashboard<br />
                                • Record violation on your profile
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
