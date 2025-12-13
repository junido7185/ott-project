const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
    videoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 0.5,
        max: 5
    },
    comment: {
        type: String,
        required: true,
        maxlength: 200
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Review', reviewSchema);