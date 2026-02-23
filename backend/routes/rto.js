const express = require('express');
const router = express.Router();
const RTOQuestion = require('../models/RTOQuestion');
const RTOResult = require('../models/RTOResult');
const { protect } = require('../middleware/auth');
const crypto = require('crypto');

// GET /api/rto/status — Get attempt status
router.get('/status', protect, async (req, res) => {
    try {
        const attemptCount = await RTOResult.countDocuments({ userId: req.user.id });
        res.json({ success: true, attemptsUsed: attemptCount, maxAttempts: 3 });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/rto/test — Start a new test
router.get('/test', protect, async (req, res) => {
    try {
        let { lang } = req.query;

        // Auto-detect language if not provided
        if (!lang) {
            const Driver = require('../models/Driver');
            const driver = await Driver.findById(req.user.id);
            // Simple check: If address contains common AP/Telangana cities or keywords
            const addr = driver?.address?.toLowerCase() || '';
            const teluguRegions = ['telangana', 'hyderabad', 'andhra', 'vijayawada', 'visakhapatnam', 'guntur', 'tirupati'];
            const isTeluguRegion = teluguRegions.some(region => addr.includes(region));
            lang = isTeluguRegion ? 'Telugu' : 'English';
        }

        // Enforce 3-attempt limit
        const attemptCount = await RTOResult.countDocuments({ userId: req.user.id });
        if (attemptCount >= 3) {
            return res.status(403).json({
                success: false,
                message: 'Maximum attempt limit (3) reached for this exam.'
            });
        }

        // Fetch 15 random questions for the specified language
        const questions = await RTOQuestion.aggregate([
            { $match: { language: lang } },
            { $sample: { size: 15 } }
        ]);

        if (questions.length < 15) {
            return res.status(400).json({
                success: false,
                message: `Insufficient questions in the ${lang} question bank. Please contact admin.`
            });
        }

        // Mask correct answers for the frontend
        const maskedQuestions = questions.map(q => ({
            _id: q._id,
            questionText: q.questionText,
            imageUrl: q.imageUrl,
            options: q.options,
            category: q.category
        }));

        // Generate a Test ID
        const testId = `RTO-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        res.json({
            success: true,
            testId,
            questions: maskedQuestions,
            limit: 30, // 30 minutes
            passMark: 11,
            attemptsUsed: attemptCount + 1
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/rto/submit — Submit test results
router.post('/submit', protect, async (req, res) => {
    try {
        const { testId, answers } = req.body; // { questionId: selectedIndex }

        const questionIds = Object.keys(answers);
        const questions = await RTOQuestion.find({ _id: { $in: questionIds } });

        let correctCount = 0;
        let wrongCount = 0;

        questions.forEach(q => {
            const selected = answers[q._id.toString()];
            if (selected === q.correctIndex) {
                correctCount++;
            } else {
                wrongCount++;
            }
        });

        // Any questions not answered are wrong/ignored
        const missed = 15 - questions.length;
        wrongCount += missed;

        const resultStatus = correctCount >= 11 ? 'PASS' : 'FAIL';

        const result = await RTOResult.create({
            userId: req.user.id,
            testId,
            correctAnswers: correctCount,
            wrongAnswers: wrongCount,
            result: resultStatus,
            date: new Date()
        });

        res.json({
            success: true,
            result: {
                testId: result.testId,
                correct: result.correctAnswers,
                wrong: result.wrongAnswers,
                status: result.result,
                date: result.date
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/rto/history — Get user's test history
router.get('/history', protect, async (req, res) => {
    try {
        const history = await RTOResult.find({ userId: req.user.id }).sort({ date: -1 });
        res.json({ success: true, history });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
