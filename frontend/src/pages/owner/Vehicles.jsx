import { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import VehicleSelector from '../../components/VehicleSelector';
import { getVehicles, addVehicle, deleteVehicle } from '../../services/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const VEHICLE_TYPES = ['Car', 'SUV', 'Luxury', 'Mini Truck', 'Heavy Vehicle'];
const typeEmoji = { Car: '🚗', SUV: '🚙', Luxury: '✨', 'Mini Truck': '🚐', 'Heavy Vehicle': '🚛' };

const BLANK = { vehicleNumber: '', vehicleType: 'Car', transmissionType: 'Manual', make: '', model: '', variant: '', year: '', color: '', fuelType: '' };

export default function Vehicles() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState(BLANK);
    const [rtoLoading, setRtoLoading] = useState(false);
    const [rtoMsg, setRtoMsg] = useState('');
    const rtoTimer = useRef(null);

    const load = () => getVehicles().then(r => setVehicles(r.data.vehicles || [])).finally(() => setLoading(false));
    useEffect(() => { load(); }, []);

    // ── RTO auto-fetch when vehicle number looks complete ──────────
    const handleRegChange = (val) => {
        const reg = val.toUpperCase().replace(/\s/g, '');
        setForm(f => ({ ...f, vehicleNumber: reg }));
        setRtoMsg('');
        clearTimeout(rtoTimer.current);
        // Typical Indian reg: 10 chars e.g. TN01AB1234
        if (reg.length >= 8) {
            rtoTimer.current = setTimeout(() => rtoLookup(reg), 800);
        }
    };

    const rtoLookup = async (reg) => {
        setRtoLoading(true);
        try {
            const res = await fetch(`${API_BASE}/owner/rto-lookup/${reg}`, { headers: authHeader() });
            const data = await res.json();
            if (data.success) {
                if (data.partial) {
                    setRtoMsg(`📍 State: ${data.state} — Enter details manually or set VEHICLE_INFO_API_KEY for full RTO data`);
                } else {
                    setForm(f => ({
                        ...f,
                        make: data.make || f.make,
                        model: data.model || f.model,
                        year: data.year || f.year,
                        color: data.color || f.color,
                        fuelType: data.fuelType || f.fuelType,
                    }));
                    setRtoMsg(`✅ RTO data fetched! Owner: ${data.ownerName || 'N/A'} | Reg: ${data.registrationDate || 'N/A'} | Insurance: ${data.insuranceExpiry || 'N/A'}`);
                }
            } else {
                setRtoMsg('⚠️ ' + (data.message || 'RTO lookup failed. Enter details manually.'));
            }
        } catch {
            setRtoMsg('⚠️ RTO lookup unavailable. Enter details manually.');
        }
        setRtoLoading(false);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setSaving(true); setError('');
        try {
            await addVehicle(form);
            setShowForm(false);
            setForm(BLANK);
            setRtoMsg('');
            load();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add vehicle.');
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove this vehicle?')) return;
        await deleteVehicle(id);
        setVehicles(v => v.filter(x => x._id !== id));
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>My Vehicles 🚗</h1>
                    <p>Enter vehicle number for auto-fill from RTO, or select make/model/year manually</p>
                </div>

                <div style={{ marginBottom: 20 }}>
                    <button id="add-vehicle-btn" className="btn btn-primary" onClick={() => { setShowForm(!showForm); setError(''); setRtoMsg(''); }}>
                        {showForm ? '✕ Cancel' : '➕ Add Vehicle'}
                    </button>
                </div>

                {showForm && (
                    <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
                        <h3 style={{ marginBottom: 20 }}>Add New Vehicle</h3>
                        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: '0.85rem' }}>{error}</div>}

                        <form onSubmit={handleAdd}>
                            {/* ── Vehicle Number with RTO Lookup ── */}
                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label className="form-label">🔍 Vehicle Registration Number *</label>
                                <div style={{ position: 'relative' }}>
                                    <input id="vehicle-number" className="form-input"
                                        placeholder="e.g. TS09EA1234 — auto-fills from RTO"
                                        value={form.vehicleNumber}
                                        onChange={e => handleRegChange(e.target.value)}
                                        style={{ paddingRight: 44, fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                                        required />
                                    {rtoLoading && (
                                        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                                            <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                        </div>
                                    )}
                                </div>
                                {rtoMsg && (
                                    <div style={{
                                        marginTop: 8, fontSize: '0.78rem', padding: '8px 12px', borderRadius: 8,
                                        background: rtoMsg.startsWith('✅') ? 'rgba(0,212,170,0.08)' : 'rgba(245,158,11,0.08)',
                                        border: `1px solid ${rtoMsg.startsWith('✅') ? 'rgba(0,212,170,0.25)' : 'rgba(245,158,11,0.25)'}`,
                                        color: rtoMsg.startsWith('✅') ? 'var(--accent-teal)' : '#f59e0b',
                                    }}>{rtoMsg}</div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                {/* Vehicle Type */}
                                <div className="form-group">
                                    <label className="form-label">Vehicle Type *</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                                        {VEHICLE_TYPES.map(t => (
                                            <button type="button" key={t} onClick={() => setForm(f => ({ ...f, vehicleType: t, make: '', model: '', variant: '' }))}
                                                style={{
                                                    padding: '8px 4px', borderRadius: 8, fontSize: '0.7rem', cursor: 'pointer', transition: 'all 0.2s',
                                                    border: `2px solid ${form.vehicleType === t ? 'var(--accent-teal)' : 'var(--border)'}`,
                                                    background: form.vehicleType === t ? 'rgba(0,212,170,0.12)' : 'var(--bg-card)',
                                                    color: form.vehicleType === t ? 'var(--accent-teal)' : 'var(--text-secondary)',
                                                    fontWeight: 600, textAlign: 'center',
                                                }}>
                                                {typeEmoji[t]}<br />{t === 'Heavy Vehicle' ? 'Heavy' : t === 'Mini Truck' ? 'Mini Truck' : t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Transmission + Color + Fuel */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div className="form-group">
                                        <label className="form-label">Transmission *</label>
                                        <select className="form-input" value={form.transmissionType} onChange={e => setForm(f => ({ ...f, transmissionType: e.target.value }))}>
                                            <option>Manual</option>
                                            <option>Automatic</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Color</label>
                                        <input className="form-input" placeholder="e.g. White, Silver" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Fuel Type</label>
                                        <select className="form-input" value={form.fuelType} onChange={e => setForm(f => ({ ...f, fuelType: e.target.value }))}>
                                            <option value="">— Select —</option>
                                            {['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid', 'LPG'].map(ft => <option key={ft}>{ft}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* ── Smart Vehicle Selector ── */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, border: '1px solid var(--border)', marginBottom: 20 }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 14, fontWeight: 600 }}>
                                    🚗 Make / Model / Year — auto-filled from RTO or select manually:
                                </div>
                                <VehicleSelector
                                    vehicleType={form.vehicleType}
                                    value={{ make: form.make, model: form.model, variant: form.variant, year: form.year }}
                                    onChange={sel => setForm(f => ({ ...f, make: sel.make || '', model: sel.model || '', variant: sel.variant || '', year: sel.year || '' }))}
                                />
                            </div>

                            {/* Summary preview */}
                            {(form.make || form.model || form.year) && (
                                <div style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: '0.85rem', color: 'var(--accent-teal)' }}>
                                    🚗 <strong>{form.vehicleNumber}</strong> — {form.make} {form.model} {form.variant} {form.year} {form.color} {form.fuelType}
                                </div>
                            )}

                            <button id="save-vehicle-btn" type="submit" className="btn btn-primary btn-lg" disabled={saving}
                                style={{ width: '100%', justifyContent: 'center' }}>
                                {saving ? 'Saving...' : '💾 Save Vehicle'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Vehicle List */}
                {loading ? (
                    <div className="loading-screen"><div className="spinner" /></div>
                ) : vehicles.length === 0 ? (
                    <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🚗</div>
                        <p style={{ color: 'var(--text-secondary)' }}>No vehicles added yet. Add your first vehicle!</p>
                    </div>
                ) : (
                    <div className="grid-2">
                        {vehicles.map((v) => (
                            <div key={v._id} className="glass-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ fontSize: '2.2rem' }}>{typeEmoji[v.vehicleType] || '🚗'}</div>
                                        <div>
                                            <h3 style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.05em' }}>{v.vehicleNumber}</h3>
                                            <span className="badge badge-teal">{v.vehicleType}</span>
                                            {v.transmissionType && <span className="badge" style={{ marginLeft: 6, background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>{v.transmissionType}</span>}
                                        </div>
                                    </div>
                                    <button onClick={() => handleDelete(v._id)} className="btn btn-danger btn-sm">🗑️</button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                    {v.make && <span>🏭 {v.make} {v.model}</span>}
                                    {v.variant && <span>⭐ {v.variant}</span>}
                                    {v.year && <span>📅 {v.year}</span>}
                                    {v.color && <span>🎨 {v.color}</span>}
                                    {v.fuelType && <span>⛽ {v.fuelType}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
