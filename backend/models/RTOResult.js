const mongoose = require('mongoose');

const rtoResultSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Generic ref to User (can be Driver or Owner)
            required: true
        },
        testId: {
            type: String,
            unique: true,
            required: true
        },
        correctAnswers: { type: Number, required: true },
        wrongAnswers: { type: Number, required: true },
        totalQuestions: { type: Number, default: 15 },
        result: {
            type: String,
            enum: ['PASS', 'FAIL'],
            required: true
        },
        date: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

module.exports = mongoose.model('RTOResult', rtoResultSchema);
