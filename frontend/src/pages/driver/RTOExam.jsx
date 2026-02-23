import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function RTOExam() {
    const [status, setStatus] = useState('intro'); // intro, loading, quiz, result
    const [testData, setTestData] = useState({ testId: '', questions: [], limit: 30, passMark: 11, attemptsUsed: 0 });
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(1800); // 30 mins
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [lang, setLang] = useState('English');
    const [statusInfo, setStatusInfo] = useState({ attemptsUsed: 0, maxAttempts: 3 });

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch(`${API_BASE}/rto/status`, { headers: authHeader() });
                const data = await res.json();
                if (data.success) {
                    setStatusInfo({ attemptsUsed: data.attemptsUsed, maxAttempts: data.maxAttempts });
                }
            } catch (err) { console.error('Failed to fetch status'); }
        };
        fetchStatus();
    }, []);

    const startTest = async () => {
        setStatus('loading');
        try {
            const res = await fetch(`${API_BASE}/rto/test?lang=${lang}`, { headers: authHeader() });
            const data = await res.json();
            if (data.success) {
                setTestData(data);
                setTimeLeft(data.limit * 60);
                setStatus('quiz');
            } else {
                setError(data.message || 'Failed to start test.');
                setStatus('intro');
            }
        } catch (err) {
            setError('Connection error.');
            setStatus('intro');
        }
    };

    const submitTest = async (finalAnswers) => {
        setStatus('loading');
        try {
            const res = await fetch(`${API_BASE}/rto/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({
                    testId: testData.testId,
                    answers: finalAnswers || answers
                })
            });
            const data = await res.json();
            if (data.success) {
                setResult(data.result);
                setStatus('result');
            } else {
                setError(data.message);
                setStatus('intro');
            }
        } catch (err) {
            setError('Submission failed.');
            setStatus('intro');
        }
    };

    // Timer logic
    useEffect(() => {
        if (status !== 'quiz') return;
        if (timeLeft <= 0) {
            submitTest();
            return;
        }
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [status, timeLeft]);

    const handleAnswer = (optionIdx) => {
        const q = testData.questions[currentIdx];
        const newAnswers = { ...answers, [q._id]: optionIdx };
        setAnswers(newAnswers);

        if (currentIdx < testData.questions.length - 1) {
            setCurrentIdx(prev => prev + 1);
        } else {
            submitTest(newAnswers);
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>Go Driver Exam 📝</h1>
                    <p>Standardized testing system for driver quality & knowledge</p>
                </div>

                {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: 12, borderRadius: 8, marginBottom: 16, border: '1px solid rgba(239,68,68,0.2)' }}>⚠️ {error}</div>}

                {/* ─── INTRO SCREEN ─── */}
                {status === 'intro' && (
                    <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto', padding: 32 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ margin: 0 }}>Go Driver Exam Guidelines</h2>
                            <div style={{
                                padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border)', fontSize: '0.85rem'
                            }}>
                                Attempt: <strong>{statusInfo.attemptsUsed} / {statusInfo.maxAttempts}</strong>
                            </div>
                        </div>

                        {/* Language Selector */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
                            {['English', 'Telugu'].map(l => (
                                <button key={l} onClick={() => setLang(l)}
                                    className={`btn btn-sm ${lang === l ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ borderRadius: 20, padding: '8px 24px', flex: 1 }}>
                                    {l === 'English' ? '🇬🇧 English' : '🇮🇳 తెలుగు'}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                            <div className="rule-item">⏱️ Time: 30 Minutes</div>
                            <div className="rule-item">📋 Questions: 15</div>
                            <div className="rule-item">✅ Pass Mark: 11</div>
                            <div className="rule-item">🚫 No Back Navigation</div>
                            <div className="rule-item">📵 No Tab Switching</div>
                            <div className="rule-item">📈 Real-time Results</div>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={startTest}
                            disabled={statusInfo.attemptsUsed >= statusInfo.maxAttempts}
                            style={{ width: '100%', padding: '16px', fontSize: '1.1rem', opacity: statusInfo.attemptsUsed >= statusInfo.maxAttempts ? 0.5 : 1 }}
                        >
                            {statusInfo.attemptsUsed >= statusInfo.maxAttempts ? 'Attempts Exhausted ⛔' : 'Begin Go Driver Exam 🚀'}
                        </button>
                    </div>
                )}

                {/* ─── LOADING SCREEN ─── */}
                {status === 'loading' && (
                    <div className="loading-screen">
                        <div className="spinner" />
                        <p>Preparing your exam paper...</p>
                    </div>
                )}

                {/* ─── QUIZ INTERFACE ─── */}
                {status === 'quiz' && testData.questions[currentIdx] && (
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        {/* Header: Progress & Timer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-teal)' }}>
                                Question {currentIdx + 1} / {testData.questions.length}
                            </div>
                            <div style={{
                                background: timeLeft < 60 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                                color: timeLeft < 60 ? '#ef4444' : 'inherit',
                                padding: '8px 16px', borderRadius: 20, fontWeight: 700, fontSize: '1.1rem',
                                border: `1px solid ${timeLeft < 60 ? '#ef4444' : 'var(--border)'}`
                            }}>
                                ⏱️ {formatTime(timeLeft)}
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ height: 6, background: 'var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 30 }}>
                            <div style={{
                                height: '100%',
                                width: `${((currentIdx + 1) / testData.questions.length) * 100}%`,
                                background: 'var(--accent-teal)',
                                transition: 'width 0.3s'
                            }} />
                        </div>

                        <div className="glass-card" style={{ padding: 32 }}>
                            {testData.questions[currentIdx].imageUrl && (
                                <div style={{ textAlign: 'center', marginBottom: 24, background: '#fff', padding: 20, borderRadius: 12 }}>
                                    <img
                                        src={testData.questions[currentIdx].imageUrl.startsWith('http') || testData.questions[currentIdx].imageUrl.startsWith('/signs/') ? testData.questions[currentIdx].imageUrl : `${API_BASE.replace('/api', '')}${testData.questions[currentIdx].imageUrl}`}
                                        alt="Traffic Sign"
                                        style={{ maxHeight: 200, maxWidth: '100%' }}
                                    />
                                </div>
                            )}

                            <h3 style={{ fontSize: '1.4rem', marginBottom: 30, lineHeight: 1.4 }}>
                                {testData.questions[currentIdx].questionText}
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {testData.questions[currentIdx].options.map((opt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleAnswer(i)}
                                        className="btn btn-secondary"
                                        style={{
                                            justifyContent: 'flex-start',
                                            padding: '16px 20px',
                                            textAlign: 'left',
                                            fontSize: '1rem',
                                            border: '1px solid var(--border)'
                                        }}
                                    >
                                        <span style={{
                                            width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: 15,
                                            fontSize: '0.8rem', fontWeight: 800
                                        }}>
                                            {String.fromCharCode(65 + i)}
                                        </span>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── RESULT SCREEN ─── */}
                {status === 'result' && result && (
                    <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center', padding: '40px 32px' }}>
                        <div style={{
                            width: 100, height: 100, borderRadius: '50%',
                            background: result.status === 'PASS' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '3rem', margin: '0 auto 24px'
                        }}>
                            {result.status === 'PASS' ? '🎉' : '❌'}
                        </div>

                        <h2 style={{ fontSize: '2.5rem', color: result.status === 'PASS' ? '#10b981' : '#ef4444', marginBottom: 8 }}>
                            {result.status === 'PASS' ? 'PASSED!' : 'FAILED'}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 30 }}>
                            {result.status === 'PASS'
                                ? 'Congratulations! You are eligible for an LLR.'
                                : 'Better luck next time. Consistency is key!'}
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
                            <div className="glass-card" style={{ padding: 16, background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CORRECT</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{result.correct}</div>
                            </div>
                            <div className="glass-card" style={{ padding: 16, background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>WRONG</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{result.wrong}</div>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, textAlign: 'left', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span>Test ID:</span>
                                <span style={{ fontWeight: 700 }}>{result.testId}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Date:</span>
                                <span>{new Date(result.date).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <button className="btn btn-primary" onClick={() => setStatus('intro')} style={{ width: '100%', marginTop: 32 }}>
                            Try Again 🔄
                        </button>
                    </div>
                )}
            </main>

            <style>{`
                .rule-item {
                    background: rgba(255,255,255,0.03);
                    padding: 12px;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    border: 1px solid var(--border);
                }
            `}</style>
        </div>
    );
}
