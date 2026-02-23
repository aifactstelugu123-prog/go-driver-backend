const mongoose = require('mongoose');

const quizQuestionSchema = new mongoose.Schema(
    {
        question: { type: String, required: true },
        symbolUrl: { type: String }, // For traffic sign images
        options: [{ type: String }],
        correctIndex: { type: Number, required: true }, // 0-indexed correct answer
    },
    { _id: false }
);

const trainingModuleSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        language: {
            type: String,
            enum: ['English', 'Telugu', 'Hindi'],
            default: 'English'
        },
        category: {
            type: String,
            enum: ['Traffic Signals', 'Safety Rules', 'Night Driving', 'Highway Driving', 'Customer Behaviour'],
            required: true,
        },
        description: { type: String },
        videoUrl: { type: String }, // YouTube embed or hosted URL
        thumbnailUrl: { type: String },
        duration: { type: Number }, // minutes
        quiz: [quizQuestionSchema],
        passMark: { type: Number, default: 70 }, // percentage
        order: { type: Number, default: 0 }, // display order
        isActive: { type: Boolean, default: true },
        isWeekly: { type: Boolean, default: false },
        weekCode: { type: String }, // e.g., "2024-W08" to track which week this belongs to
    },
    { timestamps: true }
);

module.exports = mongoose.model('TrainingModule', trainingModuleSchema);
