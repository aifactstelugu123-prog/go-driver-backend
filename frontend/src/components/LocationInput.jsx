import { useState, useEffect, useRef } from 'react';

/**
 * LocationInput — type a place name, get live autocomplete suggestions
 * Uses OpenStreetMap Nominatim (free, no API key needed)
 */
export default function LocationInput({ label, icon, color, value, onChange, onSelect }) {
    const [query, setQuery] = useState(value?.address || '');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const debounceRef = useRef(null);
    const wrapperRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleChange = (val) => {
        setQuery(val);
        onChange && onChange({ address: val, lat: '', lng: '' });
        clearTimeout(debounceRef.current);

        if (val.length < 3) { setSuggestions([]); setOpen(false); return; }

        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=in&limit=6&addressdetails=1`,
                    { headers: { 'Accept-Language': 'en' } }
                );
                const data = await res.json();
                setSuggestions(data);
                setOpen(data.length > 0);
            } catch {
                setSuggestions([]);
            }
            setLoading(false);
        }, 400);
    };

    const handleSelect = (place) => {
        const address = place.display_name;
        const lat = parseFloat(place.lat).toFixed(6);
        const lng = parseFloat(place.lon).toFixed(6);
        setQuery(address);
        setSuggestions([]);
        setOpen(false);
        onSelect && onSelect({ address, lat, lng });
    };

    const handleGPS = () => {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude.toFixed(6);
            const lng = pos.coords.longitude.toFixed(6);
            setQuery('Current Location 📍');
            onSelect && onSelect({ address: 'Current Location', lat, lng });
        });
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative' }}>
            <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>
                {icon} {label}
            </label>
            <div style={{
                background: `rgba(${color}, 0.05)`, border: `1px solid rgba(${color}, 0.25)`,
                borderRadius: 12, padding: 14, transition: 'all 0.2s',
            }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                        className="form-input"
                        placeholder={`Type ${label.toLowerCase()} name...`}
                        value={query}
                        onChange={(e) => handleChange(e.target.value)}
                        onFocus={() => suggestions.length > 0 && setOpen(true)}
                        autoComplete="off"
                        style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleGPS}
                        title="Use my current location"
                        style={{ flexShrink: 0, padding: '10px 12px' }}>
                        🎯
                    </button>
                </div>

                {/* Selected coords display */}
                {value?.lat && (
                    <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>✅</span>
                        <span style={{ fontFamily: 'monospace' }}>{value.lat}, {value.lng}</span>
                    </div>
                )}
            </div>

            {/* Suggestions Dropdown */}
            {open && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                    background: '#1a2035', border: '1px solid rgba(0,212,170,0.3)',
                    borderRadius: 12, marginTop: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    maxHeight: 280, overflowY: 'auto',
                }}>
                    {loading && (
                        <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Searching...
                        </div>
                    )}
                    {!loading && suggestions.map((place, i) => {
                        const parts = place.display_name.split(', ');
                        const mainName = parts.slice(0, 2).join(', ');
                        const subName = parts.slice(2, 5).join(', ');
                        return (
                            <div key={i} onClick={() => handleSelect(place)}
                                style={{
                                    padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,170,0.08)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                    📍 {mainName}
                                </div>
                                {subName && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{subName}</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
