const express = require('express');
const router = express.Router();
const TrainingModule = require('../models/TrainingModule');
const Driver = require('../models/Driver');
const { protect } = require('../middleware/auth');
const { ensureWeeklyModule, checkAndResetDriverWeeklyStatus, getWeekCode } = require('../services/weeklyTrainingService');

// GET /api/training/weekly — get current weekly challenge
router.get('/weekly', protect, async (req, res) => {
    try {
        if (req.user.role !== 'driver') return res.status(403).json({ success: false, message: 'Only drivers can access training.' });

        // 1. Reset status if week changed
        await checkAndResetDriverWeeklyStatus(req.user.id);

        // 2. Fetch/Generate module
        const driver = await Driver.findById(req.user.id);
        const language = driver.language || 'English'; // Assume driver has a language pref
        const module = await ensureWeeklyModule(language);

        // 3. Mask answers (Keep question, options, symbolUrl)
        const obj = module.toObject();
        obj.quiz = obj.quiz.map(q => ({
            question: q.question,
            options: q.options,
            symbolUrl: q.symbolUrl || q.imageUrl // Support both just in case
        }));

        res.json({ success: true, module: obj, isCleared: driver.weeklyTraining?.isCleared || false, weekCode: getWeekCode() });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
const { authorize } = require('../middleware/role');

// GET /api/training — list all active modules (driver/owner can view)
router.get('/', protect, async (req, res) => {
    try {
        const modules = await TrainingModule.find({ isActive: true }).sort({ order: 1 });
        // Don't expose correct answers
        const safe = modules.map((m) => {
            const obj = m.toObject();
            obj.quiz = obj.quiz.map(q => ({
                question: q.question,
                options: q.options,
                symbolUrl: q.symbolUrl || q.imageUrl
            }));
            return obj;
        });
        res.json({ success: true, modules: safe });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/training/:id — single module with quiz (no answers)
router.get('/:id', protect, async (req, res) => {
    try {
        const module = await TrainingModule.findById(req.params.id);
        if (!module) return res.status(404).json({ success: false, message: 'Module not found.' });
        const obj = module.toObject();
        obj.quiz = obj.quiz.map(q => ({
            question: q.question,
            options: q.options,
            symbolUrl: q.symbolUrl || q.imageUrl
        }));
        res.json({ success: true, module: obj });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/training/:id/submit — Submit quiz answers
router.post('/:id/submit', protect, authorize('driver'), async (req, res) => {
    try {
        const { answers } = req.body; // Array of selected indices
        const module = await TrainingModule.findById(req.params.id);
        if (!module) return res.status(404).json({ success: false, message: 'Module not found.' });

        let correct = 0;
        const results = module.quiz.map((q, i) => {
            const isCorrect = answers[i] === q.correctIndex;
            if (isCorrect) correct++;
            return { question: q.question, selected: answers[i], correctIndex: q.correctIndex, isCorrect };
        });

        const score = Math.round((correct / module.quiz.length) * 100);
        const passed = score >= module.passMark;

        if (passed) {
            const driver = await Driver.findById(req.user.id);
            if (module.isWeekly) {
                driver.weeklyTraining = {
                    lastPassedDate: new Date(),
                    isCleared: true
                };
            } else if (!driver.quizzesPassed.includes(module._id)) {
                driver.quizzesPassed.push(module._id);
            }

            // Recalculate badge (based on non-weekly modules)
            const staticModules = await TrainingModule.find({ isWeekly: false, isActive: true });
            if (driver.quizzesPassed.length >= staticModules.length) {
                driver.trainingBadge = true;
            }
            await driver.save();
        }

        res.json({ success: true, score, passed, passMark: module.passMark, results });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── ADMIN CRUD FOR MODULES ─────────────────────────────────

// POST /api/training — create module (admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const module = await TrainingModule.create(req.body);
        res.status(201).json({ success: true, module });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/training/:id — update module (admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const module = await TrainingModule.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.json({ success: true, module });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/training/:id — soft delete (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        await TrainingModule.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ success: true, message: 'Module removed.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
