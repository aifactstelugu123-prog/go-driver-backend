import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../../components/Sidebar';
import RideAlertModal from '../../components/RideAlertModal';
import { getDriverProfile, getSubscriptionStatus, claimFreeTrial, acceptRide, setDriverOnline, setDriverOffline, acceptTnC } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function DriverDashboard() {
    const { user, socket } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [subStatus, setSubStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [incomingRide, setIncomingRide] = useState(null);
    const [rideTimer, setRideTimer] = useState(30);
    const [isOnline, setIsOnline] = useState(false);
    const [accepting, setAccepting] = useState(false);

    // T&C state
    const [showTnC, setShowTnC] = useState(false);
    const [agreedToTnC, setAgreedToTnC] = useState(false);
    const [savingTnC, setSavingTnC] = useState(false);

    const timerRef = useRef(null);

    useEffect(() => {
        Promise.all([getDriverProfile(), getSubscriptionStatus()])
            .then(([p, s]) => {
                setProfile(p.data.driver);
                setSubStatus(s.data);
                setIsOnline(p.data.driver?.isOnline);
                if (p.data.driver && !p.data.driver.acceptedTnC) {
                    setShowTnC(true);
                }
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!socket) return;

        // New ride assignment — shows RideAlertModal with alarm
        socket.on('ride:new_assignment', (rideData) => {
            setIncomingRide(rideData);
        });

        socket.on('speed:warning', ({ message }) => {
            alert(`⚠️ ${message}`);
        });

        return () => {
            socket.off('ride:new_assignment');
            socket.off('speed:warning');
            clearInterval(timerRef.current);
        };
    }, [socket]);

    const handleToggleOnline = async () => {
        try {
            if (isOnline) {
                await setDriverOffline();
                setIsOnline(false);
            } else {
                await setDriverOnline();
                setIsOnline(true);
            }
        } catch (e) {
            alert(e.response?.data?.message || 'Failed to update status.');
        }
    };

    const handleAccept = async () => {
        if (!incomingRide) return;
        setAccepting(true);
        try {
            const { data } = await acceptRide(incomingRide.orderId);
            clearInterval(timerRef.current);
            setIncomingRide(null);
            navigate(`/driver/ride/${incomingRide.orderId}`);
        } catch (e) {
            alert(e.response?.data?.message || 'Could not accept ride.');
        }
        setAccepting(false);
    };

    const handleClaimTrial = async () => {
        try {
            await claimFreeTrial();
            const s = await getSubscriptionStatus();
            setSubStatus(s.data);
        } catch (e) {
            alert(e.response?.data?.message || 'Failed.');
        }
    };

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

    const [isReading, setIsReading] = useState(false);

    const playAudio = (lang) => {
        window.speechSynthesis.cancel();
        let text = '';
        if (lang === 'te') {
            text = "వినండి. డ్రైవర్ నియమాలు. ఒకటి: డ్యూటీలో ఉన్నప్పుడు తప్పనిసరిగా యూనిఫామ్ మరియు సీట్ బెల్ట్ ధరించాలి. " +
                "రెండు: ట్రాఫిక్ రూల్స్ పాటిస్తూ నడపాలి. ఒకవేళ రూల్స్ బ్రేక్ చేసి ఫైన్ పడితే పూర్తిగా మీదే బాధ్యత. " +
                "మూడు: యాప్ కు కట్టాల్సిన కమిషన్ లేదా సబ్స్క్రిప్షన్ ఫీజు కరెక్ట్ గా కట్టాలి. " +
                "నాలుగు: కస్టమర్లతో మరియు ఓనర్లతో మర్యాదగా ప్రవర్తించాలి. జాగ్రత్తగా డ్రైవ్ చేయాలి.";
        } else if (lang === 'hi') {
            text = "ध्यान दें। ड्राइवर नियम। पहला: ड्यूटी के दौरान यूनिफार्म और सीट बेल्ट अनिवार्य है। " +
                "दूसरा: ट्रैफिक नियमों का कड़ाई से पालन करें। अगर आपके कारण कोई फाईन या चालान आता है, तो वह आपको ही भरना होगा। " +
                "तीसरा: ऐप का कमीशन या सब्सक्रिप्शन फीस समय पर जमा करें। " +
                "चौथा: ग्राहकों और मालिकों के साथ सम्मान से पेश आएं। सुरक्षित ड्राइव करें।";
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'te' ? 'te-IN' : 'hi-IN';
        utterance.rate = 0.9;
        utterance.onstart = () => setIsReading(true);
        utterance.onend = () => setIsReading(false);
        utterance.onerror = () => setIsReading(false);
        window.speechSynthesis.speak(utterance);
    };

    const stopAudio = () => {
        window.speechSynthesis.cancel();
        setIsReading(false);
    };

    const subPercentage = subStatus?.rideLimit > 0 ? Math.round((subStatus.ridesAssigned / subStatus.rideLimit) * 100) : 0;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {/* T&C Blocking Overlay */}
                {showTnC && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <div className="glass-card" style={{ maxWidth: 500, width: '100%', padding: 40, background: 'var(--bg-secondary)', border: '2px solid var(--accent-teal)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <h2 style={{ color: 'var(--text-primary)' }}>Terms & Conditions</h2>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {isReading ? (
                                        <button className="btn btn-secondary btn-sm" onClick={stopAudio} style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'rgba(239,68,68,0.2)', color: '#ef4444', borderColor: '#ef4444' }}>⏹️ Stop Audio</button>
                                    ) : (
                                        <>
                                            <button className="btn btn-secondary btn-sm" onClick={() => playAudio('te')} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>🔊 తెలుగు</button>
                                            <button className="btn btn-secondary btn-sm" onClick={() => playAudio('hi')} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>🔊 हिंदी</button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div style={{ maxHeight: 300, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 8, marginBottom: 20, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                <p>Welcome to <strong>Go Driver</strong>. Please read our mandatory guidelines carefully before starting.</p>
                                <br />
                                <p><strong>1. Driver Dress Code & Safety:</strong> You MUST wear a proper uniform while on duty. Wearing your seatbelt is strictly mandatory at all times. Safety is our top priority.</p>
                                <br />
                                <p><strong>2. Traffic Rules & Penalties:</strong> You must strictly follow all Indian traffic rules, signals, and speed limits. ⚠️ <strong>Note:</strong> If you violate any traffic rule during a ride (e.g., jumping a signal, over-speeding) and a challan/fine is issued, <strong>YOU (the driver) are entirely responsible for paying that fine.</strong> The owner will not bear the cost of your negligence.</p>
                                <br />
                                <p><strong>3. Payments & Earnings:</strong> You will earn the base hourly fare/block fare directly from the owner/customer. However, a small percent commission (as defined by the platform) may be deducted for using this service, or you must maintain an active subscription plan to receive unlimited ride alerts. Return journey charges (if applicable) are paid directly to you.</p>
                                <br />
                                <p><strong>4. Professional Conduct:</strong> Treat the vehicle with utmost care and be polite to the owners. Any damage caused by reckless driving will be investigated and may lead to immediate termination and legal action.</p>
                            </div>
                            <div className="form-checkbox-group" style={{ marginBottom: 24, padding: 8, background: 'rgba(0,212,170,0.05)', borderRadius: 8, border: '1px solid rgba(0,212,170,0.2)' }}>
                                <input type="checkbox" id="driverTnc" className="form-checkbox" checked={agreedToTnC} onChange={(e) => setAgreedToTnC(e.target.checked)} />
                                <label htmlFor="driverTnc" className="form-checkbox-label" style={{ userSelect: 'none' }}>
                                    I have read and agree to the Driver Terms and Conditions and Privacy Policy.
                                </label>
                            </div>
                            <button className="btn btn-primary btn-lg" onClick={handleAcceptTnC} disabled={!agreedToTnC || savingTnC} style={{ width: '100%', justifyContent: 'center' }}>
                                {savingTnC ? '⏳ Saving...' : '✅ Accept & Continue'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Full-screen Ride Alert Modal with alarm + vibration */}
                {incomingRide && (
                    <RideAlertModal
                        ride={incomingRide}
                        onAccept={async (ride) => {
                            try {
                                await acceptRide(ride.orderId);
                                setIncomingRide(null);
                                navigate(`/driver/ride/${ride.orderId}`);
                            } catch (e) {
                                alert(e.response?.data?.message || 'Could not accept ride.');
                                setIncomingRide(null);
                            }
                        }}
                        onDecline={(reason) => {
                            setIncomingRide(null);
                        }}
                    />
                )}

                <div className="page-header">
                    <h1>Welcome, {profile?.name || 'Driver'} 🧑‍✈️</h1>
                    <p>Your driver dashboard — manage availability and subscriptions</p>
                </div>

                {loading ? (
                    <div className="loading-screen"><div className="spinner" /></div>
                ) : (
                    <>
                        {/* Status Bar */}
                        <div className="glass-card" style={{ padding: 20, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', align: 'center', gap: 12 }}>
                                <div style={{ width: 12, height: 12, borderRadius: '50%', background: isOnline ? '#10b981' : '#6b7280', boxShadow: isOnline ? '0 0 8px #10b981' : 'none', marginTop: 2 }} />
                                <div>
                                    <div style={{ fontWeight: 600 }}>{isOnline ? 'You are Online' : 'You are Offline'}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{isOnline ? 'Ready to receive ride requests' : 'Toggle to go online'}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                {!profile?.isApproved && <span className="badge badge-warning">⏳ Pending Approval</span>}
                                {profile?.isApproved && profile?.trainingBadge && <span className="badge badge-teal">✅ Verified Driver</span>}
                                <button id="toggle-online-btn" onClick={handleToggleOnline} disabled={!profile?.isApproved}
                                    className={`btn ${isOnline ? 'btn-secondary' : 'btn-primary'}`} style={{ minWidth: 120 }}>
                                    {isOnline ? '🔴 Go Offline' : '🟢 Go Online'}
                                </button>
                            </div>
                        </div>

                        <div className="grid-2" style={{ marginBottom: 20 }}>
                            {/* Subscription Status */}
                            <div className="glass-card" style={{ padding: 24 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                    <h3>💎 Subscription</h3>
                                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/driver/subscription')}>Manage</button>
                                </div>
                                {subStatus?.isActive ? (
                                    <>
                                        <div style={{ marginBottom: 10 }}>
                                            <span className="badge badge-success">{subStatus.planName}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Minimum Ride Opportunities Used</span>
                                            <span style={{ fontWeight: 600 }}>{subStatus.ridesAssigned} / {subStatus.rideLimit}</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: `${subPercentage}%` }} />
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                                            Expires: {subStatus.expiryDate ? new Date(subStatus.expiryDate).toLocaleDateString('en-IN') : '—'}
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', paddingTop: 8 }}>
                                        {!subStatus?.hasUsedFreeTrial && profile?.isApproved ? (
                                            <>
                                                <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                                                    Claim your <strong style={{ color: 'var(--accent-teal)' }}>free trial</strong> — 1 Minimum Ride Opportunity, valid 7 days!
                                                </p>
                                                <button id="claim-trial-btn" className="btn btn-primary" onClick={handleClaimTrial} style={{ width: '100%', justifyContent: 'center' }}>
                                                    🎁 Claim Free Trial
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: 12 }}>No active subscription</p>
                                                <button className="btn btn-primary" onClick={() => navigate('/driver/subscription')} style={{ width: '100%', justifyContent: 'center' }}>
                                                    💎 Buy Plan
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="glass-card" style={{ padding: 24 }}>
                                <h3 style={{ marginBottom: 16 }}>📊 My Stats</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {[
                                        { label: 'Total Rides Completed', value: profile?.totalRidesCompleted || 0, icon: '✅', color: '#10b981' },
                                        { label: 'Total Earnings', value: `₹${profile?.totalEarnings || 0}`, icon: '💰', color: 'var(--accent-teal)' },
                                        { label: 'Speed Violations', value: profile?.speedViolationCount || 0, icon: '⚠️', color: profile?.speedViolationCount > 0 ? '#ef4444' : '#6b7280' },
                                        { label: 'Training Badge', value: profile?.trainingBadge ? 'Earned ✅' : 'Not earned', icon: '🎓', color: profile?.trainingBadge ? 'var(--accent-teal)' : '#6b7280' },
                                    ].map(s => (
                                        <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                                            <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>{s.icon} {s.label}</span>
                                            <span style={{ fontWeight: 700, color: s.color, fontSize: '0.9rem' }}>{s.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="glass-card" style={{ padding: 20 }}>
                            <h3 style={{ marginBottom: 14 }}>Quick Actions</h3>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <button className="btn btn-secondary" onClick={() => navigate('/driver/subscription')}>💎 Subscription Plans</button>
                                <button className="btn btn-secondary" onClick={() => navigate('/driver/training')}>🎓 AI Training</button>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
