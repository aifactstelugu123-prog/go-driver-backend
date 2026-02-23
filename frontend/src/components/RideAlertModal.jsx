import { useEffect, useRef, useState } from 'react';

// ── Haversine formula — straight-line distance in km ─────────────
function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Web Audio API alarm — no external files needed ────────────────
function playAlarm(audioCtx) {
    if (!audioCtx) return;
    const frequencies = [880, 1100, 880, 1100];
    let time = audioCtx.currentTime;
    frequencies.forEach(freq => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
        osc.start(time);
        osc.stop(time + 0.3);
        time += 0.35;
    });
}

// ── Countdown timer: auto-dismiss ride if not responded ───────────
const AUTO_DISMISS_SECONDS = 60;

export default function RideAlertModal({ ride, onAccept, onDecline }) {
    const audioCtxRef = useRef(null);
    const alarmTimer = useRef(null);
    const countdownRef = useRef(null);
    const [countdown, setCountdown] = useState(AUTO_DISMISS_SECONDS);
    const [distance, setDistance] = useState(null);
    const [duration, setDuration] = useState(null);
    const [accepting, setAccepting] = useState(false);

    // ── Distance + Time calculation ──────────────────────────────
    useEffect(() => {
        if (!ride) return;
        const { pickupLocation, dropLocation } = ride;
        if (pickupLocation?.lat && dropLocation?.lat) {
            const km = haversine(
                pickupLocation.lat, pickupLocation.lng,
                dropLocation.lat, dropLocation.lng
            );
            setDistance(km.toFixed(1));
            // Average city speed estimate: 30 km/h
            const mins = Math.round((km / 30) * 60);
            setDuration(mins);
        }
    }, [ride]);

    // ── Alarm + vibration on mount ──────────────────────────────
    useEffect(() => {
        if (!ride) return;

        // Create audio context
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();

        // Play alarm immediately + repeat every 4s
        const triggerAlarm = () => {
            playAlarm(audioCtxRef.current);
            // Vibration pattern: beep-beep-beep
            if (navigator.vibrate) navigator.vibrate([300, 200, 300, 200, 300]);
        };
        triggerAlarm();
        alarmTimer.current = setInterval(triggerAlarm, 4000);

        // Countdown to auto-dismiss
        countdownRef.current = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) {
                    clearInterval(countdownRef.current);
                    onDecline && onDecline('timeout');
                    return 0;
                }
                return c - 1;
            });
        }, 1000);

        return () => {
            clearInterval(alarmTimer.current);
            clearInterval(countdownRef.current);
            audioCtxRef.current?.close();
        };
    }, [ride]);

    const stopAlarm = () => {
        clearInterval(alarmTimer.current);
        if (navigator.vibrate) navigator.vibrate(0); // stop vibration
    };

    const handleAccept = async () => {
        stopAlarm();
        setAccepting(true);
        onAccept && await onAccept(ride);
        setAccepting(false);
    };

    const handleDecline = () => {
        stopAlarm();
        onDecline && onDecline('declined');
    };

    if (!ride) return null;

    const urgency = countdown <= 15 ? '#ef4444' : countdown <= 30 ? '#f59e0b' : 'var(--accent-teal)';
    const pct = (countdown / AUTO_DISMISS_SECONDS) * 100;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pulse-bg 1s ease-in-out infinite alternate',
        }}>
            <style>{`
                @keyframes pulse-bg {
                    from { background: rgba(0,0,0,0.88); }
                    to { background: rgba(239,68,68,0.15); }
                }
                @keyframes ring-pulse {
                    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
                    50% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(239,68,68,0); }
                }
                @keyframes slide-up {
                    from { transform: translateY(40px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>

            <div style={{
                width: '90%', maxWidth: 420,
                background: 'var(--bg-card)', borderRadius: 24,
                border: '2px solid rgba(239,68,68,0.5)',
                overflow: 'hidden',
                animation: 'slide-up 0.3s ease-out',
                boxShadow: '0 30px 80px rgba(239,68,68,0.3)',
            }}>
                {/* Countdown progress bar */}
                <div style={{ height: 4, background: 'var(--border)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: urgency, transition: 'width 1s linear, background 0.5s' }} />
                </div>

                <div style={{ padding: '28px 28px 24px' }}>
                    {/* Alert header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%',
                            background: 'rgba(239,68,68,0.15)', border: '3px solid #ef4444',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '2rem', flexShrink: 0,
                            animation: 'ring-pulse 1.2s ease-in-out infinite',
                        }}>
                            {ride.ownerPhoto ? (
                                <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${ride.ownerPhoto}`}
                                    alt="Owner"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            ) : (
                                '🚨'
                            )}
                        </div>
                        <div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>{ride.ownerName || 'New Ride'}</div>
                            {ride.ownerRating && (
                                <div style={{ fontSize: '0.85rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ fontSize: '1rem' }}>⭐</span> {ride.ownerRating.toFixed(1)} Rating
                                </div>
                            )}
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                Auto-declines in <span style={{ color: urgency, fontWeight: 700 }}>{countdown}s</span>
                            </div>
                        </div>
                    </div>

                    {/* Ride details */}
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '16px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>

                        {/* Distance + Time chip row */}
                        {distance && (
                            <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
                                <div style={{ flex: 1, background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.25)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-teal)' }}>{distance} km</div>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>📍 Distance</div>
                                </div>
                                <div style={{ flex: 1, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6' }}>{duration} min</div>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>⏱️ Est. Time</div>
                                </div>
                                {ride.fare && (
                                    <div style={{ flex: 1, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>₹{ride.fare}</div>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>💰 Fare</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Route */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '1.1rem', marginTop: 1 }}>📍</span>
                                <div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pickup</div>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{ride.pickupAddress || `${ride.pickupLocation?.lat?.toFixed(4)}, ${ride.pickupLocation?.lng?.toFixed(4)}`}</div>
                                </div>
                            </div>
                            <div style={{ width: 2, height: 16, background: 'var(--border)', marginLeft: 18 }} />
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '1.1rem', marginTop: 1 }}>🏁</span>
                                <div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Drop</div>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{ride.dropAddress || `${ride.dropLocation?.lat?.toFixed(4)}, ${ride.dropLocation?.lng?.toFixed(4)}`}</div>
                                </div>
                            </div>
                        </div>

                        {/* Details row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.8rem', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                            {ride.ownerName && <div><span style={{ color: 'var(--text-muted)' }}>Owner: </span><strong>{ride.ownerName}</strong></div>}
                            {ride.vehicleType && <div><span style={{ color: 'var(--text-muted)' }}>Vehicle: </span><strong>{ride.vehicleType}</strong></div>}
                            {ride.scheduledDate && <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--text-muted)' }}>Schedule: </span><strong>{new Date(ride.scheduledDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</strong></div>}
                            {ride.notes && <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--text-muted)' }}>Notes: </span>{ride.notes}</div>}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={handleDecline}
                            style={{
                                flex: 1, padding: '14px', borderRadius: 12, border: '2px solid rgba(239,68,68,0.4)',
                                background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                                fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}>
                            ✖ Decline
                        </button>
                        <button onClick={handleAccept} disabled={accepting}
                            style={{
                                flex: 2, padding: '14px', borderRadius: 12, border: 'none',
                                background: accepting ? 'rgba(0,212,170,0.5)' : 'linear-gradient(135deg, #00d4aa, #00a882)',
                                color: '#000', fontSize: '1rem', fontWeight: 800, cursor: accepting ? 'wait' : 'pointer',
                                transition: 'all 0.15s',
                            }}>
                            {accepting ? '⏳ Accepting...' : '✅ Accept Ride'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
