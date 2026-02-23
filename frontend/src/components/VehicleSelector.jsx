import { useState, useEffect } from 'react';
import { VEHICLE_MAKES, getMakesByType, getModels, getVariants, YEARS } from '../data/indianVehicles';

const VEHICLE_TYPES = ['Car', 'SUV', 'Luxury', 'Mini Truck', 'Heavy Vehicle'];

// Type → DB type mapping
const TYPE_MAP = {
    'Car': 'Car', 'SUV': 'Car', 'Luxury': 'Car',
    'Mini Truck': 'Mini Truck', 'Heavy Vehicle': 'Heavy Vehicle',
};

export default function VehicleSelector({ value, onChange, vehicleType }) {
    const [makes, setMakes] = useState([]);
    const [models, setModels] = useState([]);
    const [variants, setVariants] = useState([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const dbType = TYPE_MAP[vehicleType] || 'Car';
        const allMakes = Object.entries(VEHICLE_MAKES)
            .filter(([, v]) => v.type === dbType || v.type === 'Car')
            .map(([make]) => make);
        setMakes(allMakes);
        setModels([]);
        setVariants([]);
        onChange({ ...value, make: '', model: '', variant: '', year: '' });
    }, [vehicleType]);

    useEffect(() => {
        if (value?.make) {
            setModels(getModels(value.make));
            setVariants([]);
        }
    }, [value?.make]);

    useEffect(() => {
        if (value?.make && value?.model) {
            setVariants(getVariants(value.make, value.model));
        }
    }, [value?.model]);

    const filteredMakes = search
        ? makes.filter(m => m.toLowerCase().includes(search.toLowerCase()))
        : makes;

    const set = (field, val) => onChange({ ...value, [field]: val });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Make search + select */}
            <div className="form-group">
                <label className="form-label">🏭 Make (Brand)</label>
                <input
                    className="form-input"
                    placeholder="Search brand... (e.g. Maruti, Tata, BMW)"
                    value={search || value?.make || ''}
                    onChange={e => {
                        setSearch(e.target.value);
                        set('make', '');
                    }}
                    list="make-list"
                    style={{ marginBottom: 0 }}
                />
                <datalist id="make-list">
                    {filteredMakes.map(m => <option key={m} value={m} />)}
                </datalist>
                {/* Show as pills when searching */}
                {search && filteredMakes.slice(0, 8).map(m => (
                    <button key={m} type="button"
                        onClick={() => { setSearch(''); set('make', m); }}
                        style={{
                            display: 'inline-block', margin: '4px 4px 0 0', padding: '4px 10px',
                            borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer',
                            background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)',
                            color: 'var(--accent-teal)',
                        }}>
                        {m}
                    </button>
                ))}
            </div>

            {/* Model */}
            {value?.make && models.length > 0 && (
                <div className="form-group">
                    <label className="form-label">🚗 Model</label>
                    <select className="form-input" value={value.model || ''} onChange={e => set('model', e.target.value)}>
                        <option value="">— Select Model —</option>
                        {models.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            )}

            {/* Variant (optional) */}
            {value?.model && variants.length > 0 && (
                <div className="form-group">
                    <label className="form-label">⭐ Variant</label>
                    <select className="form-input" value={value.variant || ''} onChange={e => set('variant', e.target.value)}>
                        <option value="">— Select Variant —</option>
                        {variants.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>
            )}

            {/* Year */}
            <div className="form-group">
                <label className="form-label">📅 Year of Manufacture</label>
                <select className="form-input" value={value?.year || ''} onChange={e => set('year', e.target.value)}>
                    <option value="">— Select Year —</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>
    );
}
