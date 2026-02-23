import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { getWallet, createWalletRecharge, verifyWalletRecharge } from '../../services/api';

const QUICK_AMOUNTS = [100, 250, 500, 1000, 2000, 5000];

export default function OwnerWallet() {
    const navigate = useNavigate();
    const [wallet, setWallet] = useState({ walletBalance: 0, transactions: [] });
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState('');
    const [paying, setPaying] = useState(false);
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');
    const [showTopup, setShowTopup] = useState(false);
    const [topupAmount, setTopupAmount] = useState('');
    const [topupStep, setTopupStep] = useState('amount'); // amount, apps, processing, success

    const loadWallet = () =>
        getWallet().then(r => setWallet(r.data)).finally(() => setLoading(false));

    useEffect(() => { loadWallet(); }, []);

    const handleRecharge = async (customAmt) => {
        const amt = parseFloat(customAmt || amount);
        if (!amt || amt < 10) return setError('Minimum recharge is ₹10.');

        setPaying(true); setError(''); setMsg('');
        if (customAmt) setTopupStep('processing');

        try {
            const { data } = await createWalletRecharge({ amount: amt });

            const options = {
                key: data.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: amt * 100,
                currency: 'INR',
                name: 'Go Driver',
                description: 'Wallet Recharge',
                order_id: data.razorpayOrderId,
                handler: async (response) => {
                    if (customAmt) setTopupStep('processing');
                    try {
                        const res = await verifyWalletRecharge({
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            amount: amt,
                        });
                        if (customAmt) {
                            setTopupStep('success');
                        } else {
                            setMsg(res.data.message);
                            setAmount('');
                        }
                        loadWallet();
                    } catch {
                        setError('Payment verification failed. Contact support.');
                        if (customAmt) setTopupStep('amount');
                    }
                },
                prefill: {},
                theme: { color: '#00d4aa' },
                modal: { ondismiss: () => customAmt && setTopupStep('amount') }
            };

            const loadRZP = () => {
                if (window.Razorpay) {
                    const rzp = new window.Razorpay(options);
                    rzp.open();
                } else {
                    const script = document.createElement('script');
                    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                    script.onload = () => { const rzp = new window.Razorpay(options); rzp.open(); };
                    document.body.appendChild(script);
                }
            };
            loadRZP();
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to initiate payment.');
            if (customAmt) setTopupStep('amount');
        }
        setPaying(false);
    };


    const txColor = { credit: '#10b981', debit: '#ef4444' };
    const txIcon = { credit: '⬆️', debit: '⬇️' };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>My Wallet 💰</h1>
                    <p>Add money via UPI, Card, or Net Banking — pay for rides instantly</p>
                </div>

                {/* Balance Card */}
                <div className="glass-card" style={{
                    padding: 32, marginBottom: 24, textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(0,212,170,0.12), rgba(139,92,246,0.08))',
                    borderColor: 'rgba(0,212,170,0.35)',
                }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Available Balance</div>
                    <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--accent-teal)', lineHeight: 1 }}>
                        ₹{wallet.walletBalance?.toFixed(2) || '0.00'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => { setTopupStep('amount'); setShowTopup(true); }} style={{ borderRadius: 20, padding: '8px 24px' }}>
                            ➕ Add Cash (UPI)
                        </button>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 12 }}>Go Driver Wallet</div>
                </div>

                {/* Top-up Modal */}
                {showTopup && (
                    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <div className="glass-card" style={{ maxWidth: 420, width: '100%', padding: 32, position: 'relative', overflow: 'hidden' }}>
                            <button onClick={() => setShowTopup(false)} style={{ position: 'absolute', right: 20, top: 20, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>

                            {topupStep === 'amount' && (
                                <div className="fade-in">
                                    <h2 style={{ marginBottom: 8, fontSize: '1.5rem' }}>Add Cash 💰</h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>Top up your wallet via Razorpay</p>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                                        {QUICK_AMOUNTS.map(amt => (
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

                                    <button className="btn btn-primary" onClick={() => handleRecharge(topupAmount)} disabled={!topupAmount || topupAmount < 10 || paying} style={{ width: '100%', padding: 18, fontSize: '1.1rem', justifyContent: 'center' }}>
                                        {paying ? <div className="spinner" style={{ width: 20, height: 20 }} /> : 'Continue to Pay'}
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
                                    <button className="btn btn-primary" onClick={() => { setShowTopup(false); loadWallet(); }} style={{ width: '100%', justifyContent: 'center' }}>Done</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    {/* Recharge Panel */}
                    <div className="glass-card" style={{ padding: 28 }}>
                        <h3 style={{ marginBottom: 20 }}>➕ Add Money</h3>

                        {msg && <div style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid var(--accent-teal)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--accent-teal)', fontSize: '0.85rem' }}>✅ {msg}</div>}
                        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: '0.85rem' }}>{error}</div>}

                        {/* Quick amount buttons */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 10 }}>Quick Add</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                {QUICK_AMOUNTS.map(a => (
                                    <button key={a} type="button"
                                        onClick={() => setAmount(a.toString())}
                                        style={{
                                            padding: '10px 8px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600,
                                            border: `2px solid ${amount == a ? 'var(--accent-teal)' : 'var(--border)'}`,
                                            background: amount == a ? 'rgba(0,212,170,0.12)' : 'var(--bg-card)',
                                            color: amount == a ? 'var(--accent-teal)' : 'var(--text-secondary)',
                                            cursor: 'pointer', transition: 'all 0.2s',
                                        }}>
                                        ₹{a}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom amount */}
                        <div className="form-group" style={{ marginBottom: 20 }}>
                            <label className="form-label">Or Enter Custom Amount</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-teal)', fontWeight: 700, fontSize: '1rem' }}>₹</span>
                                <input className="form-input" type="number" min="10" placeholder="Enter amount"
                                    value={amount} onChange={e => setAmount(e.target.value)}
                                    style={{ paddingLeft: 30, fontSize: '1.1rem', fontWeight: 600 }} />
                            </div>
                        </div>

                        {/* Payment Methods Info */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                            {['UPI', 'Card', 'Net Banking', 'Wallets'].map(m => (
                                <span key={m} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 6, fontSize: '0.75rem', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                                    {m === 'UPI' ? '📱' : m === 'Card' ? '💳' : m === 'Net Banking' ? '🏦' : '👛'} {m}
                                </span>
                            ))}
                        </div>

                        <button id="recharge-btn" className="btn btn-primary btn-lg" onClick={handleRecharge}
                            disabled={paying || !amount || parseFloat(amount) < 10}
                            style={{ width: '100%', justifyContent: 'center' }}>
                            {paying ? 'Opening Payment...' : `💳 Add ₹${amount || '___'} to Wallet`}
                        </button>

                        <p style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                            🔒 Secure payment via Razorpay. Instant credit after payment.
                        </p>
                    </div>

                    {/* Transaction History */}
                    <div className="glass-card" style={{ padding: 28 }}>
                        <h3 style={{ marginBottom: 20 }}>📋 Transaction History</h3>
                        {loading ? (
                            <div className="loading-screen"><div className="spinner" /></div>
                        ) : wallet.transactions?.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>💳</div>
                                <p>No transactions yet.<br />Add money to get started!</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
                                {wallet.transactions.map((tx, i) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '12px 14px', background: 'rgba(255,255,255,0.03)',
                                        borderRadius: 10, border: `1px solid ${tx.type === 'credit' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: '1.3rem' }}>{txIcon[tx.type]}</span>
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{tx.description}</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                    {new Date(tx.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: '1rem', color: txColor[tx.type] }}>
                                            {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
