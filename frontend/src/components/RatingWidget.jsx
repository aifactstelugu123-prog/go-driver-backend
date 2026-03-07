import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authHeader = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function RatingWidget({ orderId, targetName, targetPhoto, ratedAlready, existingRating, onRated, label = 'Rate' }) {
    const [hovered, setHovered] = useState(0);
    const [selected, setSelected] = useState(existingRating || 0);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(!!ratedAlready);
    const [error, setError] = useState('');

    const handleRate = async (star) => {
        if (saved) return;
        setSelected(star);
        setSaving(true); setError('');
        try {
            const res = await fetch(`${API_BASE}/rides/${orderId}/rate`, {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify({ rating: star, note }),
            });
            const data = await res.json();
            if (data.success) {
                setSaved(true);
                if (onRated) onRated(star);
            } else {
                setError(data.message || 'Failed to save rating.');
            }
        } catch (e) {
            setError('Network error. Please try again.');
        }
        setSaving(false);
    };

    const photoSrc = targetPhoto ? (targetPhoto.startsWith('http') ? targetPhoto : `${API_BASE.replace('/api', '')}${targetPhoto}`) : null;

    return (
        <div style={{ padding: '20px 24px', borderRadius: 16, background: saved ? 'rgba(16,185,129,0.07)' : 'rgba(0,212,170,0.05)', border: `1px solid ${saved ? 'rgba(16,185,129,0.2)' : 'rgba(0,212,170,0.15)'}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: 'rgba(0,212,170,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent-teal)', fontSize: '1.1rem', flexShrink: 0 }}>
                    {photoSrc ? <img src={photoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (targetName || 'U')[0].toUpperCase()}
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{label} {targetName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{saved ? '✅ Rating saved' : 'Tap a star to rate'}</div>
                </div>
            </div>

            {/* Stars */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        disabled={saved || saving}
                        onClick={() => handleRate(star)}
                        onMouseEnter={() => !saved && setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        style={{
                            background: 'none', border: 'none', cursor: saved ? 'default' : 'pointer',
                            fontSize: '2rem', padding: '2px 4px',
                            filter: (hovered || selected) >= star ? 'none' : 'grayscale(1) opacity(0.3)',
                            color: (hovered || selected) >= star ? '#f59e0b' : '#888',
                            transform: hovered === star && !saved ? 'scale(1.2)' : 'scale(1)',
                            transition: 'all 0.15s',
                        }}
                    >★</button>
                ))}
                {(selected > 0 || saved) && (
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: saved ? '#10b981' : 'var(--accent-gold)', marginLeft: 6 }}>
                        {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][saved ? (existingRating || selected) : selected]}
                    </span>
                )}
                {saving && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 6 }}>Saving…</span>}
            </div>

            {/* Note input — only before saving */}
            {!saved && selected > 0 && (
                <div style={{ display: 'flex', gap: 8 }}>
                    <input
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Add a comment (optional)"
                        style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                    />
                </div>
            )}

            {/* Existing note */}
            {saved && (existingRating) && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>⭐ {existingRating}/5 rated</div>
            )}

            {error && <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>{error}</div>}
        </div>
    );
}
