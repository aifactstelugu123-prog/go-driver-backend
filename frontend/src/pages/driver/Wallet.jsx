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

const loadRazorpay = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const statusColor = { pending: '#f59e0b', approved: '#3b82f6', rejected: '#ef4444', transferred: '#10b981' };
const statusIcon = { pending: '⏳', approved: '✅', rejected: '❌', transferred: '💸' };

export default function DriverWallet() {
    const [wallet, setWallet] = useState({ walletBalance: 0, transactions: [], bankDetails: null });
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('wallet'); // wallet | bank | payouts
    const [payoutAmount, setPayoutAmount] = useState('');
    const [bankForm, setBankForm] = useState({ accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '', upiId: '' });
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');
    const [showTopup, setShowTopup] = useState(false);
    const [topupAmount, setTopupAmount] = useState('');
    const [topupStep, setTopupStep] = useState('amount'); // amount, apps, processing, success

    const load = async () => {
        const [w, p] = await Promise.all([apiFetch('/driver-wallet'), apiFetch('/driver-wallet/payouts')]);
        if (w.success) setWallet(w);
        if (p.success) setPayouts(p.payouts || []);
        if (w.bankDetails) setBankForm({ ...w.bankDetails, accountNumber: '' });
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const showMsg = (m, isErr = false) => { isErr ? setError(m) : setMsg(m); setTimeout(() => { setMsg(''); setError(''); }, 4000); };

    const saveBankDetails = async () => {
        const r = await apiFetch('/driver-wallet/bank-details', 'POST', bankForm);
        if (r.success) { showMsg(r.message); load(); } else showMsg(r.message, true);
    };

    const requestPayout = async () => {
        if (!payoutAmount || payoutAmount < 100) return showMsg('Minimum payout is ₹100', true);
        const r = await apiFetch('/driver-wallet/request-payout', 'POST', { amount: parseFloat(payoutAmount) });
        if (r.success) { showMsg(r.message); setPayoutAmount(''); load(); } else showMsg(r.message, true);
    };

    const handleRazorpayPay = async () => {
        const resScript = await loadRazorpay();
        if (!resScript) return showMsg('Razorpay SDK failed to load. Are you online?', true);

        setLoading(true);
        try {
            const orderRes = await apiFetch('/driver-wallet/recharge', 'POST', { amount: parseFloat(topupAmount) });
            if (!orderRes.success) throw new Error(orderRes.message);

            const options = {
                key: orderRes.keyId,
                amount: orderRes.amount * 100,
                currency: 'INR',
                name: 'Go Driver',
                description: 'Wallet Top-up',
                order_id: orderRes.razorpayOrderId,
                handler: async (response) => {
                    setTopupStep('processing');
                    const verifyRes = await apiFetch('/driver-wallet/recharge/verify', 'POST', {
                        razorpayOrderId: response.razorpay_order_id,
                        razorpayPaymentId: response.razorpay_payment_id,
                        razorpaySignature: response.razorpay_signature,
                        amount: orderRes.amount,
                    });
                    if (verifyRes.success) {
                        setTopupStep('success');
                        load();
                    } else {
                        showMsg(verifyRes.message, true);
                        setTopupStep('amount');
                    }
                },
                prefill: { name: wallet.name, contact: wallet.phone },
                theme: { color: '#00d4aa' },
                modal: { ondismiss: () => setTopupStep('amount') }
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();
        } catch (err) {
            showMsg(err.message, true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>My Wallet 💳</h1>
                    <p>Your earnings are auto-credited here after every ride. Withdraw to your bank with admin approval.</p>
                </div>

                {/* Balance */}
                <div className="glass-card" style={{
                    padding: 32, marginBottom: 24, textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(0,212,170,0.12), rgba(139,92,246,0.08))',
                    borderColor: 'rgba(0,212,170,0.35)',
                }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 6 }}>Available Balance</div>
                    <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--accent-teal)', lineHeight: 1 }}>
                        ₹{wallet.walletBalance?.toFixed(2) || '0.00'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowTopup(true)} style={{ borderRadius: 20, padding: '8px 24px' }}>
                            ➕ Add Cash
                        </button>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 12 }}>
                        🔒 Secured & encrypted · Auto-credited after each ride
                    </div>
                </div>

                {/* Top-up Modal */}
                {showTopup && (
                    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <div className="glass-card" style={{ maxWidth: 420, width: '100%', padding: 32, position: 'relative', overflow: 'hidden' }}>
                            <button onClick={() => setShowTopup(false)} style={{ position: 'absolute', right: 20, top: 20, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>

                            {topupStep === 'amount' && (
                                <div className="fade-in">
                                    <h2 style={{ marginBottom: 8, fontSize: '1.5rem' }}>Add Cash 💰</h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>Top up your wallet instantly via UPI</p>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                                        {[100, 200, 500, 1000, 2000, 5000].map(amt => (
                                            <button key={amt} onClick={() => setTopupAmount(amt.toString())} style={{ padding: '12px 6px', borderRadius: 12, border: `1px solid ${topupAmount == amt ? 'var(--accent-teal)' : 'var(--border)'}`, background: topupAmount == amt ? 'rgba(0,212,170,0.1)' : 'rgba(255,255,255,0.02)', color: topupAmount == amt ? 'var(--accent-teal)' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s', cursor: 'pointer' }}>₹{amt}</button>
                                        ))}
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 28 }}>
                                        <label className="form-label">Custom Amount</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-teal)', fontWeight: 800, fontSize: '1.2rem' }}>₹</span>
                                            <input type="number" className="form-input" value={topupAmount} onChange={e => setTopupAmount(e.target.value)} placeholder="0.00" style={{ paddingLeft: 34, fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-teal)' }} />
                                        </div>
                                    </div>

                                    <button className="btn btn-primary" onClick={handleRazorpayPay} disabled={!topupAmount || topupAmount < 10 || loading} style={{ width: '100%', padding: 18, fontSize: '1.1rem', justifyContent: 'center' }}>
                                        {loading ? <div className="spinner" style={{ width: 20, height: 20 }} /> : 'Continue to Pay'}
                                    </button>
                                </div>
                            )}


                            {topupStep === 'processing' && (
                                <div className="fade-in" style={{ textAlign: 'center', padding: '40px 0' }}>
                                    <div className="spinner" style={{ width: 60, height: 60, margin: '0 auto 24px', borderTopColor: 'var(--accent-teal)' }} />
                                    <h3 style={{ marginBottom: 10 }}>Processing Payment</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Please do not close the window or go back.</p>
                                </div>
                            )}

                            {topupStep === 'success' && (
                                <div className="fade-in" style={{ textAlign: 'center', padding: '40px 0' }}>
                                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', margin: '0 auto 24px' }}>✓</div>
                                    <h2 style={{ marginBottom: 10, color: '#10b981' }}>Success!</h2>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>₹{topupAmount} has been added to your wallet.</p>
                                    <button className="btn btn-primary" onClick={() => { setShowTopup(false); load(); }} style={{ width: '100%', justifyContent: 'center' }}>Done</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    {[['wallet', '📊 Transactions'], ['bank', '🏦 Bank Details'], ['payouts', '💸 Payouts']].map(([key, label]) => (
                        <button key={key} onClick={() => setTab(key)} className={`btn ${tab === key ? 'btn-primary' : 'btn-secondary'} btn-sm`}>{label}</button>
                    ))}
                </div>

                {msg && <div style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid var(--accent-teal)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--accent-teal)', fontSize: '0.85rem' }}>✅ {msg}</div>}
                {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: '0.85rem' }}>{error}</div>}

                {/* TAB: Transactions */}
                {tab === 'wallet' && (
                    <div className="glass-card" style={{ padding: 24 }}>
                        <h3 style={{ marginBottom: 16 }}>📋 Transaction History</h3>
                        {loading ? <div className="loading-screen"><div className="spinner" /></div>
                            : wallet.transactions?.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>💰</div>
                                    <p>No transactions yet. Complete a ride to see earnings!</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {wallet.transactions.map((tx, i) => (
                                        <div key={i} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10,
                                            border: `1px solid ${tx.type === 'credit' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span style={{ fontSize: '1.3rem' }}>{tx.type === 'credit' ? '⬆️' : '⬇️'}</span>
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{tx.description}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                        {new Date(tx.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: '1rem', color: tx.type === 'credit' ? '#10b981' : '#ef4444' }}>
                                                {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                    </div>
                )}

                {/* TAB: Bank Details */}
                {tab === 'bank' && (
                    <div className="glass-card" style={{ padding: 28 }}>
                        <h3 style={{ marginBottom: 6 }}>🏦 Bank Account Details</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                            🔒 Your account number is stored with AES-256 encryption. Only you can request payouts.
                        </p>

                        {wallet.bankDetails && (
                            <div style={{ background: 'rgba(0,212,170,0.07)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--accent-teal)', fontWeight: 600, marginBottom: 8 }}>✅ Saved Bank Details</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.85rem' }}>
                                    <div><span style={{ color: 'var(--text-muted)' }}>Name: </span>{wallet.bankDetails.accountHolderName}</div>
                                    <div><span style={{ color: 'var(--text-muted)' }}>Account: </span><span style={{ fontFamily: 'monospace' }}>{wallet.bankDetails.accountNumberMasked}</span></div>
                                    <div><span style={{ color: 'var(--text-muted)' }}>IFSC: </span>{wallet.bankDetails.ifscCode}</div>
                                    <div><span style={{ color: 'var(--text-muted)' }}>Bank: </span>{wallet.bankDetails.bankName}</div>
                                    {wallet.bankDetails.upiId && <div><span style={{ color: 'var(--text-muted)' }}>UPI: </span>{wallet.bankDetails.upiId}</div>}
                                </div>
                            </div>
                        )}

                        <BankDetailsForm
                            value={bankForm}
                            onChange={setBankForm}
                            showAccountNumber={true}
                        />
                        <button className="btn btn-primary" onClick={saveBankDetails} style={{ justifyContent: 'center', marginTop: 16, width: '100%' }}>
                            🔒 Save Bank Details (Encrypted)
                        </button>
                    </div>
                )}

                {/* TAB: Payouts */}
                {tab === 'payouts' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Request payout */}
                        <div className="glass-card" style={{ padding: 24 }}>
                            <h3 style={{ marginBottom: 16 }}>💸 Request Payout</h3>
                            {!wallet.bankDetails ? (
                                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: 16, color: '#f59e0b', fontSize: '0.85rem' }}>
                                    ⚠️ Please add your bank details first (Bank Details tab) before requesting a payout.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Amount (min ₹100)</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-teal)', fontWeight: 700 }}>₹</span>
                                            <input className="form-input" type="number" min="100" max={wallet.walletBalance}
                                                placeholder="Enter amount" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)}
                                                style={{ paddingLeft: 28 }} />
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Available: ₹{wallet.walletBalance?.toFixed(2)}</div>
                                    </div>
                                    <button className="btn btn-primary" onClick={requestPayout} style={{ marginBottom: 0 }}>
                                        Request Withdrawal
                                    </button>
                                </div>
                            )}
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 12 }}>
                                💡 Admin reviews payout requests within 24–48 hours. Money transferred directly to your bank account.
                            </p>
                        </div>

                        {/* Payout history */}
                        <div className="glass-card" style={{ padding: 24 }}>
                            <h3 style={{ marginBottom: 16 }}>📋 Payout History</h3>
                            {payouts.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No payout requests yet.</div>
                            ) : payouts.map(p => (
                                <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>₹{p.amount} Withdrawal</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                            {new Date(p.requestedAt).toLocaleDateString('en-IN')} · {p.bankSnapshot?.bankName} ···{p.bankSnapshot?.accountNumberMasked?.slice(-4)}
                                        </div>
                                        {p.adminNote && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>Note: {p.adminNote}</div>}
                                    </div>
                                    <span className="badge" style={{ background: `${statusColor[p.status]}20`, color: statusColor[p.status] }}>
                                        {statusIcon[p.status]} {p.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
