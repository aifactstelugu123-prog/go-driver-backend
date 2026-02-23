const mongoose = require('mongoose');

const rtoQuestionSchema = new mongoose.Schema(
    {
        questionText: { type: String, required: true, trim: true },
        imageUrl: { type: String }, // For traffic signs
        options: {
            type: [String],
            validate: [v => v.length === 3, 'RTO questions must have exactly 3 options'],
            required: true
        },
        correctIndex: { type: Number, required: true, min: 0, max: 2 },
        category: {
            type: String,
            enum: ['Sign', 'Rule', 'Situation'],
            required: true
        },
        language: {
            type: String,
            enum: ['English', 'Telugu', 'Hindi'],
            default: 'English'
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('RTOQuestion', rtoQuestionSchema);
