import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { getTrainingModules, getTrainingModule, getWeeklyTraining, submitQuiz, submitQuizComplete } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const categoryEmoji = { 'Traffic Signals': '🚦', 'Safety Rules': '🛡️', 'Night Driving': '🌙', 'Highway Driving': '🛣️', 'Customer Behaviour': '🤝' };

const getEmbedUrl = (url) => {
    if (!url) return '';
    let videoId = '';

    if (url.includes('youtube.com/embed/')) {
        videoId = url.split('youtube.com/embed/')[1].split('?')[0];
    } else if (url.includes('v=')) {
        videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
    }

    return videoId
        ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`
        : url;
};

export default function DriverTraining() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null); // active module
    const [quizMode, setQuizMode] = useState(false);
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [lang, setLang] = useState('English');
    const [weeklyModule, setWeeklyModule] = useState(null);
    const [weeklyCleared, setWeeklyCleared] = useState(false);
    const [weekCode, setWeekCode] = useState('');

    useEffect(() => {
        setLoading(true);
        Promise.all([
            getTrainingModules(),
            getWeeklyTraining()
        ]).then(([r, w]) => {
            setModules(r.data.modules || []);
            setWeeklyModule(w.data.module);
            setWeeklyCleared(w.data.isCleared);
            setWeekCode(w.data.weekCode);
        }).finally(() => setLoading(false));
    }, [lang]);

    const filteredModules = modules.filter(m => m.language === lang);

    const openModule = async (mod) => {
        const { data } = await getTrainingModule(mod._id);
        setSelected(data.module);
        setQuizMode(false);
        setAnswers({});
        setResult(null);
    };

    const handleSubmitQuiz = async () => {
        const ans = selected.quiz.map((_, i) => answers[i] ?? -1);
        setSubmitting(true);
        try {
            const { data } = await submitQuiz(selected._id, { answers: ans });
            setResult(data);
            if (data.passed) {
                await submitQuizComplete({ moduleId: selected._id, passed: true });
                setModules(prev => prev.map(m => m._id === selected._id ? { ...m, passed: true } : m));
            }
        } catch (e) {
            alert('Failed to submit quiz.');
        }
        setSubmitting(false);
    };

    if (selected) {
        return (
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                    <div style={{ marginBottom: 20 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setSelected(null); setResult(null); setQuizMode(false); }}>← Back to Modules</button>
                    </div>

                    {!quizMode ? (
                        /* Video Lesson View */
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
                            <div>
                                <div style={{ marginBottom: 12 }}>
                                    <span className="badge badge-teal">{categoryEmoji[selected.category]} {selected.category}</span>
                                </div>
                                <h1 style={{ marginBottom: 8 }}>{selected.title}</h1>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>{selected.description}</p>

                                {selected.videoUrl ? (
                                    <div style={{ marginBottom: 20, borderRadius: 12, overflow: 'hidden', background: '#000', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                                        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                                            <iframe
                                                src={getEmbedUrl(selected.videoUrl)}
                                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                                title={selected.title}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.1), rgba(139,92,246,0.1))', borderRadius: 16, padding: 60, textAlign: 'center', marginBottom: 20 }}>
                                        <div style={{ fontSize: '4rem', marginBottom: 12 }}>{categoryEmoji[selected.category]}</div>
                                        <p style={{ color: 'var(--text-secondary)' }}>AI Training Video — {selected.title}</p>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>Video content will load from the configured URL</p>
                                    </div>
                                )}

                                <button id="start-quiz-btn" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setQuizMode(true)}>
                                    📝 Start Quiz → {selected.quiz?.length || 0} Questions
                                </button>
                            </div>

                            <div className="glass-card" style={{ padding: 20, height: 'fit-content' }}>
                                <h3 style={{ marginBottom: 14 }}>Module Info</h3>
                                {[
                                    { label: 'Category', value: selected.category },
                                    { label: 'Duration', value: selected.duration ? `${selected.duration} min` : 'Self-paced' },
                                    { label: 'Questions', value: selected.quiz?.length || 0 },
                                    { label: 'Pass Mark', value: `${selected.passMark}%` },
                                ].map(({ label, value }) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                                        <span style={{ fontWeight: 600 }}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : result ? (
                        /* Result View */
                        <div className="glass-card" style={{ padding: 40, textAlign: 'center', maxWidth: 500, margin: '0 auto' }}>
                            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>{result.passed ? '🏆' : '😔'}</div>
                            <h2 style={{ marginBottom: 8, color: result.passed ? 'var(--accent-teal)' : '#ef4444' }}>
                                {result.passed ? 'Quiz Passed!' : 'Try Again'}
                            </h2>
                            <div style={{ fontSize: '3rem', fontWeight: 800, color: result.passed ? 'var(--accent-teal)' : '#ef4444', marginBottom: 8 }}>
                                {result.score}%
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 24 }}>
                                Pass mark: {result.passMark}% | {result.passed ? 'Module completed! 🎉' : `You need ${result.passMark - result.score}% more to pass.`}
                            </p>
                            {result.passed && <span className="badge badge-teal" style={{ fontSize: '0.9rem', padding: '6px 16px', marginBottom: 20 }}>✅ Module Completed</span>}
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                {!result.passed && (
                                    <button className="btn btn-primary" onClick={() => { setResult(null); setAnswers({}); }}>
                                        🔄 Retry Quiz
                                    </button>
                                )}
                                <button className="btn btn-secondary" onClick={() => { setSelected(null); setResult(null); setQuizMode(false); }}>
                                    ← Back to Modules
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Quiz Mode */
                        <div style={{ maxWidth: 640, margin: '0 auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h2>📝 {selected.title} — Quiz</h2>
                                <span className="badge badge-teal">{Object.keys(answers).length}/{selected.quiz?.length || 0} answered</span>
                            </div>

                            {selected.quiz?.map((q, qi) => (
                                <div key={qi} className="glass-card" style={{ padding: 20, marginBottom: 14 }}>
                                    <div style={{ fontWeight: 600, marginBottom: 14, fontSize: '0.95rem' }}>
                                        <span style={{ color: 'var(--accent-teal)', marginRight: 8 }}>Q{qi + 1}.</span>{q.question}
                                    </div>
                                    {q.symbolUrl && (
                                        <div style={{ textAlign: 'center', marginBottom: 16, background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <img
                                                src={q.symbolUrl.startsWith('http') || q.symbolUrl.startsWith('/signs/') ? q.symbolUrl : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${q.symbolUrl}`}
                                                alt="Traffic Sign"
                                                style={{ height: 120, width: 'auto', maxWidth: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}
                                            />
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {q.options?.map((opt, oi) => (
                                            <div key={oi} className={`quiz-option ${answers[qi] === oi ? 'selected' : ''}`}
                                                onClick={() => setAnswers(a => ({ ...a, [qi]: oi }))}>
                                                <span style={{ color: 'var(--text-muted)', marginRight: 10 }}>{String.fromCharCode(65 + oi)}.</span>{opt}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <button id="submit-quiz-btn" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
                                onClick={handleSubmitQuiz} disabled={submitting || Object.keys(answers).length < (selected.quiz?.length || 0)}>
                                {submitting ? 'Submitting...' : `✅ Submit Quiz (${Object.keys(answers).length}/${selected.quiz?.length || 0} answered)`}
                            </button>
                        </div>
                    )}
                </main>
            </div>
        );
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>Go Driver Academy 🎓</h1>
                    <p>Complete all modules and earn your high-performance badge</p>
                </div>

                <div className="glass-card" style={{ padding: 20, marginBottom: 24, background: 'linear-gradient(135deg, rgba(0,212,170,0.08), rgba(139,92,246,0.08))', borderColor: 'rgba(0,212,170,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 4 }}>🏆 Verified Driver Badge</div>
                            <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>Complete all training modules and pass each quiz to earn the badge</div>
                        </div>
                        <span className="badge badge-teal" style={{ fontSize: '1rem', padding: '8px 16px' }}>🎓 {modules.filter(m => m.passed).length}/{modules.length}</span>
                    </div>
                    <div className="progress-bar" style={{ marginTop: 14 }}>
                        <div className="progress-fill" style={{ width: `${modules.length ? (modules.filter(m => m.passed).length / modules.length) * 100 : 0}%` }} />
                    </div>
                </div>

                {/* Language Selector */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    {['English', 'Telugu', 'Hindi'].map(l => (
                        <button key={l} onClick={() => setLang(l)}
                            className={`btn btn-sm ${lang === l ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ borderRadius: 20, padding: '6px 16px' }}>
                            {l === 'English' ? '🇬🇧 English' : l === 'Telugu' ? '🇮🇳 తెలుగు' : '🇮🇳 हिन्दी'}
                        </button>
                    ))}
                </div>

                {/* Weekly Challenge Section */}
                {weeklyModule && (
                    <div className="glass-card" style={{ padding: 20, marginBottom: 20, border: weeklyCleared ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(245,158,11,0.4)', background: weeklyCleared ? 'rgba(16,185,129,0.03)' : 'rgba(245,158,11,0.03)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: '1.2rem' }}>{weeklyCleared ? '✅' : '⚠️'}</span>
                                    <h3 style={{ margin: 0 }}>Weekly Professional Challenge</h3>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{weekCode} • Refresh your road knowledge weekly</div>
                            </div>
                            {weeklyCleared ? (
                                <span className="badge badge-teal">CLEARED</span>
                            ) : (
                                <button className="btn btn-sm btn-primary" onClick={() => openModule(weeklyModule)}>Attempt Quiz</button>
                            )}
                        </div>
                        {!weeklyCleared && (
                            <div style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: 8 }}>
                                🚨 <strong>New Update:</strong> This week focuses on advanced defensive driving and passenger safety. Complete to maintain your ranking.
                            </div>
                        )}
                    </div>
                )}

                {loading ? (
                    <div className="loading-screen"><div className="spinner" /></div>
                ) : filteredModules.length === 0 ? (
                    <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>📚</div>
                        <p style={{ color: 'var(--text-secondary)' }}>No training modules available in {lang} yet. Check back soon!</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {filteredModules.map(mod => (
                            <div key={mod._id} className="module-card" onClick={() => openModule(mod)}>
                                <div className="module-thumb" style={{ background: mod.passed ? 'linear-gradient(135deg, #10b981, #059669)' : undefined }}>
                                    {mod.passed ? '✅' : categoryEmoji[mod.category] || '📖'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div className="module-category">{mod.category}</div>
                                    <h4 className="module-info">{mod.title}</h4>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{mod.description?.slice(0, 80) || `Learn about ${mod.category}`}{mod.description?.length > 80 ? '...' : ''}</p>
                                    <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {mod.duration && <span>⏱️ {mod.duration} min</span>}
                                        <span>❓ {mod.quiz?.length || 0} questions</span>
                                        <span>📊 Pass: {mod.passMark}%</span>
                                    </div>
                                </div>
                                {mod.passed ? (
                                    <span className="badge badge-success">✅ Passed</span>
                                ) : (
                                    <span className="badge badge-muted">Start →</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
