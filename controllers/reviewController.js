const asyncHandler = require("express-async-handler");
const Review = require("../models/Review");

// @desc    리뷰 작성
// @route   POST /api/reviews
const createReview = asyncHandler(async (req, res) => {
    const { videoId, rating, comment } = req.body;

    if (!req.session.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const review = await Review.create({
        videoId,
        userId: req.session.user.id,
        username: req.session.user.username,
        rating,
        comment
    });

    res.status(201).json(review);
});

// @desc    특정 비디오의 리뷰 가져오기
// @route   GET /api/reviews/:videoId
const getReviewsByVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    
    const reviews = await Review.find({ videoId }).sort({ createdAt: -1 });
    
    res.status(200).json(reviews);
});

module.exports = { createReview, getReviewsByVideo };