const asyncHandler = require("express-async-handler");
const Review = require("../models/Review");
const Video = require("../models/Video");  // [추가]

// @desc    리뷰 작성
// @route   POST /api/reviews
const createReview = asyncHandler(async (req, res) => {
    const { videoId, rating, comment } = req.body;

    if (!req.session.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const displayName = req.session.user.nickname || req.session.user.username;
    
    const review = await Review.create({
        videoId,
        userId: req.session.user.id,
        username: req.session.user.username,
        rating,
        comment
    });

    // [추가] 평균 평점 업데이트
    await updateVideoRating(videoId);

    res.status(201).json(review);
});

// @desc    특정 비디오의 리뷰 가져오기
// @route   GET /api/reviews/:videoId
const getReviewsByVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    
    const reviews = await Review.find({ videoId }).sort({ createdAt: -1 });
    
    res.status(200).json(reviews);
});

// @desc    내가 작성한 리뷰 목록
// @route   GET /api/reviews/my
const getMyReviews = asyncHandler(async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const reviews = await Review.find({ 
        userId: req.session.user.id 
    }).populate('videoId').sort({ createdAt: -1 });
    
    res.status(200).json(reviews);
});

// @desc    리뷰 수정
// @route   PUT /api/reviews/:reviewId
const updateReview = asyncHandler(async (req, res) => {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    if (!req.session.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const review = await Review.findOneAndUpdate(
        { _id: reviewId, userId: req.session.user.id },
        { rating, comment },
        { new: true }
    );

    if (!review) {
        return res.status(404).json({ message: "리뷰를 찾을 수 없습니다." });
    }

    // [추가] 평균 평점 업데이트
    await updateVideoRating(review.videoId);

    res.status(200).json(review);
});

// @desc    리뷰 삭제
// @route   DELETE /api/reviews/:reviewId
const deleteReview = asyncHandler(async (req, res) => {
    const { reviewId } = req.params;

    if (!req.session.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const review = await Review.findOneAndDelete({
        _id: reviewId,
        userId: req.session.user.id
    });

    if (!review) {
        return res.status(404).json({ message: "리뷰를 찾을 수 없습니다." });
    }

    // [추가] 평균 평점 업데이트
    await updateVideoRating(review.videoId);

    res.status(200).json({ message: "리뷰가 삭제되었습니다." });
});

// [추가] 평균 평점 계산 헬퍼 함수
async function updateVideoRating(videoId) {
    const reviews = await Review.find({ videoId });
    
    if (reviews.length === 0) {
        await Video.findByIdAndUpdate(videoId, {
            ourRating: 0,
            reviewCount: 0
        });
        return;
    }

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    
    await Video.findByIdAndUpdate(videoId, {
        ourRating: Math.round(avgRating * 10) / 10,  // 소수점 1자리
        reviewCount: reviews.length
    });
}

module.exports = { 
    createReview, 
    getReviewsByVideo,
    getMyReviews,      // [추가]
    updateReview,      // [추가]
    deleteReview       // [추가]
};
