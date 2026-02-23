import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { getPlans, createSubscriptionOrder, verifySubscriptionPayment } from '../../services/api';

const planDetails = [
    { key: 'basic', name: 'Basic', price: 99, rides: 3, days: 30, color: '#3b82f6', emoji: '🥉' },
    { key: 'standard', name: 'Standard', price: 199, rides: 6, days: 30, color: '#8b5cf6', emoji: '🥈', popular: true },
    { key: 'premium', name: 'Premium', price: 499, rides: 15, days: 30, color: '#f59e0b', emoji: '🥇' },
];

export default function DriverSubscription() {
    const [selected, setSelected] = useState('standard');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const handleBuy = async () => {
        setLoading(true); setError(''); setSuccess('');
        try {
            const { data } = await createSubscriptionOrder({ plan: selected });
            const plan = planDetails.find(p => p.key === selected);

            const options = {
                key: data.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: data.amount * 100,
                currency: 'INR',
                name: 'DaaS Platform',
                description: `${plan.name} Plan — ${plan.rides} Minimum Ride Opportunities`,
                order_id: data.razorpayOrderId,
                handler: async (response) => {
                    try {
                        const res = await verifySubscriptionPayment({
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            plan: selected,
                        });
                        setSuccess(res.data.message);
                    } catch (e) {
                        setError('Payment verification failed. Contact support.');
                    }
                },
                prefill: { name: 'Driver', contact: '' },
                theme: { color: '#00d4aa' },
            };

            if (window.Razorpay) {
                const rzp = new window.Razorpay(options);
                rzp.open();
            } else {
                // Load Razorpay SDK dynamically
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.onload = () => { const rzp = new window.Razorpay(options); rzp.open(); };
                document.body.appendChild(script);
            }
        } catch (e) {
            setError(e.response?.data?.message || 'Payment initiation failed.');
        }
        setLoading(false);
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>Subscription Plans 💎</h1>
                    <p>Purchase Minimum Ride Opportunities to start accepting rides</p>
                </div>

                {/* Info Banner */}
                <div className="glass-card" style={{ padding: 20, marginBottom: 24, borderColor: 'rgba(0,212,170,0.3)' }}>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        <strong style={{ color: 'var(--accent-teal)' }}>ℹ️ What is a "Minimum Ride Opportunity"?</strong><br />
                        Each time a ride is assigned to you, one Minimum Ride Opportunity is consumed. This is not a ride guarantee — it's your access to be matched with rides. You keep your earnings once a ride is completed.
                    </div>
                </div>

                {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#ef4444' }}>{error}</div>}
                {success && <div style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid var(--accent-teal)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: 'var(--accent-teal)' }}>✅ {success}</div>}

                {/* Plan Cards */}
                <div className="grid-3" style={{ marginBottom: 28 }}>
                    {planDetails.map(p => (
                        <div key={p.key} className={`plan-card ${selected === p.key ? 'selected' : ''} ${p.popular ? 'popular' : ''}`}
                            onClick={() => setSelected(p.key)}
                            style={{ position: 'relative', borderColor: selected === p.key ? 'var(--accent-teal)' : p.popular ? p.color : 'var(--border)' }}>
                            {p.popular && (
                                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: p.color, color: '#000', padding: '3px 14px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>
                                    MOST POPULAR
                                </div>
                            )}
                            <div style={{ fontSize: '2rem', marginBottom: 8 }}>{p.emoji}</div>
                            <div className="plan-name">{p.name}</div>
                            <div className="plan-price" style={{ color: p.color }}>₹{p.price}<span>/plan</span></div>
                            <div className="plan-rides" style={{ marginTop: 12 }}>
                                <strong style={{ fontSize: '1.2rem', color: p.color }}>{p.rides}</strong><br />
                                Minimum Ride Opportunities
                            </div>
                            <div className="plan-days">Valid for {p.days} days</div>
                            {selected === p.key && (
                                <div style={{ marginTop: 12 }}>
                                    <span className="badge badge-teal">✓ Selected</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Comparison Table */}
                <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                    <h3 style={{ marginBottom: 16 }}>Plan Comparison</h3>
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr><th>Feature</th><th>Basic</th><th>Standard</th><th>Premium</th></tr>
                            </thead>
                            <tbody>
                                <tr><td>Price</td><td>₹99</td><td>₹199</td><td>₹499</td></tr>
                                <tr><td>Min. Ride Opportunities</td><td>3</td><td>6</td><td>15</td></tr>
                                <tr><td>Validity</td><td>30 days</td><td>30 days</td><td>30 days</td></tr>
                                <tr><td>Driver Earnings</td><td>90%</td><td>90%</td><td>90%</td></tr>
                                <tr><td>Price per Opportunity</td><td>₹33</td><td>₹33</td><td>₹33</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <button id="buy-plan-btn" className="btn btn-primary btn-lg" onClick={handleBuy} disabled={loading}
                    style={{ width: '100%', justifyContent: 'center', maxWidth: 400 }}>
                    {loading ? 'Processing...' : `💳 Pay ₹${planDetails.find(p => p.key === selected)?.price} — Buy ${planDetails.find(p => p.key === selected)?.name} Plan`}
                </button>

                <p style={{ marginTop: 16, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    🔒 Payments are securely processed via Razorpay. No subscription auto-renewal.
                </p>
            </main>
        </div>
    );
}
