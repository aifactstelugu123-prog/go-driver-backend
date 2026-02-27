import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import Sidebar from '../../components/Sidebar';
import LocationInput from '../../components/LocationInput';
import { createRide, getVehicles, getHourlyRates } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const VEHICLE_TYPES = ['Car', 'SUV', 'Luxury', 'Mini Truck', 'Heavy Vehicle'];

export default function CreateRide() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, socket } = useAuth();
    const initialState = location.state || {};

    const [vehicles, setVehicles] = useState([]);
    const [rates, setRates] = useState({});
    const [vehicleType, setVehicleType] = useState(initialState.vehicleType || 'Car');
    const [vehicleId, setVehicleId] = useState('');
    const [pickup, setPickup] = useState({
        address: initialState.pickupAddress || '',
        lat: initialState.pickupLat || '',
        lng: initialState.pickupLng || ''
    });
    const [drop, setDrop] = useState({
        address: initialState.dropAddress || '',
        lat: initialState.dropLat || '',
        lng: initialState.dropLng || ''
    });
    const [scheduledAt, setScheduledAt] = useState('');
    const [isRoundTrip, setIsRoundTrip] = useState(initialState.isRoundTrip || false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        Promise.all([getVehicles(), getHourlyRates()]).then(([v, r]) => {
            setVehicles(v.data.vehicles || []);
            setRates(r.data.rates || {});
        });
        const d = new Date();
        d.setHours(d.getHours() + 1, 0, 0, 0);
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setScheduledAt(local);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!pickup.lat || !drop.lat) return setError('Please select valid pickup and drop locations from suggestions.');
        setLoading(true); setError('');
        try {
            const { data } = await createRide({
                vehicleType, vehicleId,
                pickupLat: pickup.lat, pickupLng: pickup.lng, pickupAddress: pickup.address,
                dropLat: drop.lat, dropLng: drop.lng, dropAddress: drop.address,
                scheduledAt,
                isRoundTrip,
            });
            setSuccess(`✅ Ride created! Searching for drivers... Hourly rate: ₹${data.hourlyRate}/hr`);



            setTimeout(() => navigate('/owner/rides'), 2500);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create ride.');
        }
        setLoading(false);
    };

    const hourlyRate = rates[vehicleType] || '—';
    const matchedVehicles = vehicles.filter(v => v.vehicleType === vehicleType);

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>Book a Driver ➕</h1>
                    <p>Type a location name to search — suggestions appear automatically</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
                    <div className="glass-card" style={{ padding: 28 }}>
                        {error && (
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: '0.85rem' }}>
                                {error}
                            </div>
                        )}
                        {success && (
                            <div style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid var(--accent-teal)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: 'var(--accent-teal)' }}>
                                {success}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {/* Vehicle Type */}
                            <div className="form-group" style={{ marginBottom: 20 }}>
                                <label className="form-label">Vehicle Type *</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                                    {VEHICLE_TYPES.map(t => (
                                        <button type="button" key={t} onClick={() => { setVehicleType(t); setVehicleId(''); }}
                                            style={{
                                                padding: '10px 6px', borderRadius: 10,
                                                border: `2px solid ${vehicleType === t ? 'var(--accent-teal)' : 'var(--border)'}`,
                                                background: vehicleType === t ? 'rgba(0,212,170,0.12)' : 'var(--bg-card)',
                                                color: vehicleType === t ? 'var(--accent-teal)' : 'var(--text-secondary)',
                                                fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                                            }}>
                                            {t === 'Car' ? '🚗' : t === 'SUV' ? '🚙' : t === 'Luxury' ? '✨' : t === 'Mini Truck' ? '🚐' : '🚛'}<br />{t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Select specific vehicle */}
                            {matchedVehicles.length > 0 && (
                                <div className="form-group" style={{ marginBottom: 20 }}>
                                    <label className="form-label">Select Your {vehicleType}</label>
                                    <select className="form-input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                                        <option value="">— Any of my {vehicleType}s —</option>
                                        {matchedVehicles.map(v => (
                                            <option key={v._id} value={v._id}>{v.vehicleNumber} — {v.make} {v.model}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Pickup Location */}
                            <div style={{ marginBottom: 20 }}>
                                <LocationInput
                                    label={isRoundTrip ? "Starting Point (Home)" : "Pickup Location"}
                                    icon="📍"
                                    color="0, 212, 170"
                                    value={pickup}
                                    onChange={(val) => setPickup(val)}
                                    onSelect={(val) => setPickup(val)}
                                />
                            </div>

                            {/* Drop Location */}
                            <div style={{ marginBottom: 20 }}>
                                <LocationInput
                                    label={isRoundTrip ? "Turnaround Point (Destination)" : "Drop Location"}
                                    icon="🏁"
                                    color="245, 158, 11"
                                    value={drop}
                                    onChange={(val) => setDrop(val)}
                                    onSelect={(val) => setDrop(val)}
                                />
                            </div>

                            {/* Round Trip Toggle */}
                            <div className="form-group" style={{ marginBottom: 20 }}>
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{ fontSize: '1.2rem' }}>🔄</span>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Round Trip</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Multi-leg journey (Home → Dest → Home)</div>
                                        </div>
                                    </div>
                                    <input type="checkbox" style={{ width: 20, height: 20, accentColor: 'var(--accent-teal)' }}
                                        checked={isRoundTrip} onChange={e => setIsRoundTrip(e.target.checked)} />
                                </label>
                            </div>

                            {/* Scheduled Time */}
                            <div className="form-group" style={{ marginBottom: 24 }}>
                                <label className="form-label">📅 Schedule Date & Time *</label>
                                <input className="form-input" type="datetime-local" value={scheduledAt}
                                    onChange={(e) => setScheduledAt(e.target.value)} required />
                            </div>

                            <button id="create-ride-btn" type="submit" className="btn btn-primary btn-lg"
                                disabled={loading || !pickup.lat || !drop.lat}
                                style={{ width: '100%', justifyContent: 'center' }}>
                                {loading ? '🔍 Searching for drivers...'
                                    : !pickup.lat || !drop.lat ? '📍 Select Locations First'
                                        : '🚀 Create Ride & Find Driver'}
                            </button>
                        </form>
                    </div>

                    {/* Fare + Info Panel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="glass-card" style={{ padding: 24 }}>
                            <h3 style={{ marginBottom: 16 }}>💰 Fare Estimate</h3>
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                                    {vehicleType === 'Heavy Vehicle' ? 'Block Rate' : 'Hourly Rate'}
                                </div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-teal)' }}>
                                    {vehicleType === 'Heavy Vehicle' ? '₹1200' : `₹${hourlyRate}`}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    {vehicleType === 'Heavy Vehicle' ? 'per 8 hours (₹150/hr after)' : 'per hour'}
                                </div>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                                <p>✅ {vehicleType === 'Heavy Vehicle' ? 'Billed in 8-hour blocks' : 'Billed by actual ride duration'}</p>
                                <p>✅ Minimum billing: {vehicleType === 'Heavy Vehicle' ? '₹1200' : '1 hour'}</p>
                                <p>⚠️ Return charges may apply</p>
                                <p>💡 10% platform commission included</p>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: 24 }}>
                            <h3 style={{ marginBottom: 12 }}>📋 All Rates</h3>
                            {Object.entries(rates).map(([type, rate]) => (
                                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{type}</span>
                                    <span style={{ fontWeight: 600, color: vehicleType === type ? 'var(--accent-teal)' : 'var(--text-primary)' }}>
                                        {type === 'Heavy Vehicle' ? '₹1200/8hrs' : `₹${rate}/hr`}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="glass-card" style={{ padding: 20, borderColor: 'rgba(0,212,170,0.2)' }}>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                                <strong style={{ color: 'var(--accent-teal)' }}>🔒 How it works:</strong><br />
                                1. Type location → select suggestion<br />
                                2. Create ride → Driver found<br />
                                3. Start OTP → Ride begins<br />
                                4. End OTP → Fare calculated
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
