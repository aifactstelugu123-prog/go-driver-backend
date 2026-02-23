import { useState, useRef } from 'react';

/**
 * BankDetailsForm — Reusable component
 * - IFSC: auto-fetches bank name, branch, city from Razorpay free IFSC API
 * - UPI ID: format validation on blur
 * - Account number: masked input with confirmation
 */
export default function BankDetailsForm({ value, onChange, showAccountNumber = true }) {
    const [ifscInfo, setIfscInfo] = useState(null);
    const [ifscLoading, setIfscLoading] = useState(false);
    const [ifscError, setIfscError] = useState('');
    const [upiStatus, setUpiStatus] = useState(''); // 'valid' | 'invalid' | ''
    const [showAccNum, setShowAccNum] = useState(false);
    const ifscTimer = useRef(null);

    const set = (field, val) => onChange({ ...value, [field]: val });

    // ── IFSC auto-fetch ────────────────────────────────────────────
    const handleIfsc = (raw) => {
        const ifsc = raw.toUpperCase().replace(/\s/g, '');
        set('ifscCode', ifsc);
        setIfscError('');
        setIfscInfo(null);
        clearTimeout(ifscTimer.current);
        if (ifsc.length === 11) {
            ifscTimer.current = setTimeout(() => fetchIfsc(ifsc), 500);
        }
    };

    const fetchIfsc = async (ifsc) => {
        setIfscLoading(true);
        try {
            const res = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
            if (!res.ok) { setIfscError('❌ Invalid IFSC code'); setIfscLoading(false); return; }
            const data = await res.json();
            setIfscInfo(data);
            // Auto-fill bank name
            set('bankName', data.BANK || data.bank || '');
            setIfscError('');
        } catch {
            setIfscError('⚠️ IFSC lookup failed. Enter bank name manually.');
        }
        setIfscLoading(false);
    };

    // ── UPI format validation ──────────────────────────────────────
    const validateUpi = (upi) => {
        if (!upi) { setUpiStatus(''); return; }
        const valid = /^[\w.\-]{3,}@[a-zA-Z]{3,}$/.test(upi);
        setUpiStatus(valid ? 'valid' : 'invalid');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Account Holder Name */}
            <div className="form-group">
                <label className="form-label">👤 Account Holder Name *</label>
                <input className="form-input"
                    placeholder="Exactly as in bank passbook"
                    value={value?.accountHolderName || ''}
                    onChange={e => set('accountHolderName', e.target.value)} />
            </div>

            {/* Account Number */}
            {showAccountNumber && (
                <div className="form-group">
                    <label className="form-label">🔢 Account Number *</label>
                    <div style={{ position: 'relative' }}>
                        <input className="form-input"
                            type={showAccNum ? 'text' : 'password'}
                            placeholder="Enter full account number"
                            value={value?.accountNumber || ''}
                            onChange={e => set('accountNumber', e.target.value.replace(/\D/g, ''))}
                            style={{ paddingRight: 44, fontFamily: 'monospace', letterSpacing: '0.12em' }} />
                        <button type="button" onClick={() => setShowAccNum(s => !s)}
                            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                            {showAccNum ? '🙈' : '👁️'}
                        </button>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        🔒 Stored with AES-256 encryption
                    </div>
                </div>
            )}

            {/* IFSC */}
            <div className="form-group">
                <label className="form-label">🏦 IFSC Code *</label>
                <div style={{ position: 'relative' }}>
                    <input className="form-input"
                        placeholder="e.g. SBIN0001234 — auto-fetches bank details"
                        value={value?.ifscCode || ''}
                        onChange={e => handleIfsc(e.target.value)}
                        maxLength={11}
                        style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.06em', paddingRight: 44 }} />
                    {ifscLoading && (
                        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                            <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                        </div>
                    )}
                    {!ifscLoading && ifscInfo && (
                        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontSize: '1.1rem' }}>✅</div>
                    )}
                </div>
                {ifscError && <div style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: 5 }}>{ifscError}</div>}

                {/* IFSC auto-fill result */}
                {ifscInfo && (
                    <div style={{
                        marginTop: 8, padding: '10px 14px', borderRadius: 10,
                        background: 'rgba(0,212,170,0.07)', border: '1px solid rgba(0,212,170,0.2)',
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '0.8rem' }}>
                            <div><span style={{ color: 'var(--text-muted)' }}>Bank: </span><strong style={{ color: 'var(--accent-teal)' }}>{ifscInfo.BANK}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Branch: </span>{ifscInfo.BRANCH}</div>
                            <div><span style={{ color: 'var(--text-muted)' }}>City: </span>{ifscInfo.CITY}</div>
                            <div><span style={{ color: 'var(--text-muted)' }}>State: </span>{ifscInfo.STATE}</div>
                            {ifscInfo.ADDRESS && <div style={{ gridColumn: '1/-1', color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 2 }}>📍 {ifscInfo.ADDRESS}</div>}
                            <div><span style={{ color: 'var(--text-muted)' }}>MICR: </span>{ifscInfo.MICR || '—'}</div>
                            <div><span style={{ color: 'var(--text-muted)' }}>RTGS: </span>{ifscInfo.RTGS ? '✅' : '❌'}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bank Name — auto-filled from IFSC */}
            <div className="form-group">
                <label className="form-label">🏛️ Bank Name *</label>
                <input className="form-input"
                    placeholder="Auto-filled from IFSC, or enter manually"
                    value={value?.bankName || ''}
                    onChange={e => set('bankName', e.target.value)} />
            </div>

            {/* UPI ID */}
            <div className="form-group">
                <label className="form-label">📱 UPI ID <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <div style={{ position: 'relative' }}>
                    <input className="form-input"
                        placeholder="e.g. yourname@okaxis or 9999999999@paytm"
                        value={value?.upiId || ''}
                        onChange={e => { set('upiId', e.target.value); setUpiStatus(''); }}
                        onBlur={e => validateUpi(e.target.value)}
                        style={{ paddingRight: 44 }} />
                    {upiStatus && (
                        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem' }}>
                            {upiStatus === 'valid' ? '✅' : '❌'}
                        </div>
                    )}
                </div>
                {upiStatus === 'valid' && <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: 4 }}>✅ Valid UPI ID format</div>}
                {upiStatus === 'invalid' && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 4 }}>❌ Invalid format. Use: name@bank (e.g. john@okhdfc)</div>}
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {['@okaxis', '@okhdfc', '@okhdfcbank', '@oksbi', '@paytm', '@ybl', '@ibl', '@upi'].map(handle => (
                        <button key={handle} type="button"
                            onClick={() => { const base = (value?.upiId || '').split('@')[0]; set('upiId', base + handle); validateUpi(base + handle); }}
                            style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                            {handle}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
