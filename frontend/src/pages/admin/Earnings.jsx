import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import BankDetailsForm from '../../components/BankDetailsForm';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const apiFetch = async (url, method = 'GET', body) => {
    const res = await fetch(`${API_BASE}${url}`, {
        method, headers: { 'Content-Type': 'application/json', ...authHeader() },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return res.json();
};

export default function AdminEarnings() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bankForm, setBankForm] = useState({ accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '', upiId: '' });
    const [settlementForm, setSettlementForm] = useState({ amount: '', note: '' });
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');
    const [tab, setTab] = useState('overview');

    const load = async () => {
        const r = await apiFetch('/admin/earnings');
        if (r.success) {
            setData(r);
            if (r.bankDetails) setBankForm({ ...r.bankDetails });
        }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const showMsg = (m, isErr = false) => {
        isErr ? setError(m) : setMsg(m);
        setTimeout(() => { setMsg(''); setError(''); }, 4000);
    };

    const saveBankDetails = async () => {
        if (!bankForm.accountHolderName || !bankForm.accountNumber || !bankForm.ifscCode || !bankForm.bankName)
            return showMsg('All bank fields are required.', true);
        const r = await apiFetch('/admin/bank-details', 'POST', bankForm);
        r.success ? showMsg(r.message) : showMsg(r.message, true);
        load();
    };

    const markSettled = async () => {
        if (!settlementForm.amount || settlementForm.amount <= 0)
            return showMsg('Enter a valid amount.', true);
        const r = await apiFetch('/admin/mark-settled', 'POST', settlementForm);
        r.success ? showMsg(r.message) : showMsg(r.message, true);
        setSettlementForm({ amount: '', note: '' });
        load();
    };

    const e = data?.earnings;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>Platform Earnings 💼</h1>
                    <p>Track 10% commission from rides + subscription revenue. Manage admin bank account.</p>
                </div>

                {msg && <div style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid var(--accent-teal)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--accent-teal)', fontSize: '0.85rem' }}>✅ {msg}</div>}
                {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: '0.85rem' }}>{error}</div>}

                {/* Summary Cards */}
                {loading ? <div className="loading-screen"><div className="spinner" /></div> : (
                    <>
                        <div className="grid-4" style={{ marginBottom: 24 }}>
                            {[
                                { label: 'Total Earnings', value: `₹${e?.totalEarnings}`, icon: '💰', color: '#00d4aa', sub: 'Ride fee + subscriptions' },
                                { label: 'Ride Commission (10%)', value: `₹${e?.rideCommission}`, icon: '🚗', color: '#3b82f6', sub: `${e?.completedRides} completed rides` },
                                { label: 'Subscription Income', value: `₹${e?.subscriptionIncome}`, icon: '💎', color: '#8b5cf6', sub: 'Driver plan payments' },
                                { label: 'Pending Settlement', value: `₹${e?.pendingSettlement}`, icon: '⏳', color: '#f59e0b', sub: `Settled: ₹${e?.settledAmount}` },
                            ].map(s => (
                                <div key={s.label} className="stat-card" style={{ borderColor: `${s.color}25` }}>
                                    <div className="stat-icon" style={{ background: `${s.color}20`, fontSize: '1.6rem' }}>{s.icon}</div>
                                    <div className="stat-info">
                                        <h3 style={{ color: s.color, fontSize: '1.4rem' }}>{s.value}</h3>
                                        <p>{s.label}</p>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                            {[['overview', '📊 Overview'], ['bank', '🏦 Bank Details'], ['settle', '💸 Mark Settled']].map(([key, label]) => (
                                <button key={key} onClick={() => setTab(key)} className={`btn ${tab === key ? 'btn-primary' : 'btn-secondary'} btn-sm`}>{label}</button>
                            ))}
                        </div>

                        {/* Overview: Settlement History */}
                        {tab === 'overview' && (
                            <div className="glass-card" style={{ padding: 24 }}>
                                <h3 style={{ marginBottom: 16 }}>📋 Settlement History</h3>
                                {data?.settlements?.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                                        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📊</div>
                                        <p>No settlements recorded yet. Use "Mark Settled" when you transfer money to your bank.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {data.settlements.map((s, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(0,212,170,0.05)', borderRadius: 10, border: '1px solid rgba(0,212,170,0.15)' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{s.note}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                        {new Date(s.settledAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#10b981' }}>₹{s.amount}</div>
                                            </div>
                                        ))}
                                        <div style={{ textAlign: 'right', marginTop: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            Total settled: <strong style={{ color: 'var(--accent-teal)' }}>₹{e?.settledAmount}</strong>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Bank Details */}
                        {tab === 'bank' && (
                            <div className="glass-card" style={{ padding: 28, maxWidth: 560 }}>
                                <h3 style={{ marginBottom: 6 }}>🏦 Admin Bank Account</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                                    Platform earnings (ride commission + subscription revenue) should be transferred to this account.
                                </p>

                                {data?.bankDetails && (
                                    <div style={{ background: 'rgba(0,212,170,0.07)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-teal)', fontWeight: 600, marginBottom: 10 }}>✅ Currently Saved</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.84rem' }}>
                                            <div><span style={{ color: 'var(--text-muted)' }}>Name: </span>{data.bankDetails.accountHolderName}</div>
                                            <div><span style={{ color: 'var(--text-muted)' }}>Account: </span><span style={{ fontFamily: 'monospace' }}>{data.bankDetails.accountNumber?.slice(0, 4)}{'*'.repeat((data.bankDetails.accountNumber?.length || 8) - 8)}{data.bankDetails.accountNumber?.slice(-4)}</span></div>
                                            <div><span style={{ color: 'var(--text-muted)' }}>IFSC: </span>{data.bankDetails.ifscCode}</div>
                                            <div><span style={{ color: 'var(--text-muted)' }}>Bank: </span>{data.bankDetails.bankName}</div>
                                            {data.bankDetails.upiId && <div><span style={{ color: 'var(--text-muted)' }}>UPI: </span>{data.bankDetails.upiId}</div>}
                                        </div>
                                    </div>
                                )}

                                <BankDetailsForm
                                    value={bankForm}
                                    onChange={setBankForm}
                                    showAccountNumber={true}
                                />
                                <button className="btn btn-primary" onClick={saveBankDetails} style={{ justifyContent: 'center', marginTop: 16, width: '100%' }}>
                                    💾 Save Admin Bank Details
                                </button>
                            </div>
                        )}

                        {/* Mark Settled */}
                        {tab === 'settle' && (
                            <div className="glass-card" style={{ padding: 28, maxWidth: 480 }}>
                                <h3 style={{ marginBottom: 6 }}>💸 Mark as Settled</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                                    After transferring earnings to your bank, record it here to keep track of pending balance.
                                </p>
                                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Pending Settlement</div>
                                    <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f59e0b' }}>₹{e?.pendingSettlement}</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <div className="form-group">
                                        <label className="form-label">Amount Settled (₹)</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-teal)', fontWeight: 700 }}>₹</span>
                                            <input className="form-input" type="number" min="1" placeholder="Enter amount transferred"
                                                value={settlementForm.amount}
                                                onChange={e => setSettlementForm({ ...settlementForm, amount: e.target.value })}
                                                style={{ paddingLeft: 28 }} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Note (optional)</label>
                                        <input className="form-input" placeholder="e.g. Monthly transfer - Feb 2026"
                                            value={settlementForm.note}
                                            onChange={e => setSettlementForm({ ...settlementForm, note: e.target.value })} />
                                    </div>
                                    <button className="btn btn-primary" onClick={markSettled} style={{ justifyContent: 'center' }}>
                                        ✅ Mark as Settled
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
