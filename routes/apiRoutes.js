const express = require("express");
const router = express.Router();
const { 
    createVideo, 
    getNextVideo,
    importVideoFromTmdb,
    seedDatabase,
    searchVideos  // [추가]
} = require("../controllers/videoController");
const { createUser, likeVideo, passVideo, getLikedVideos } = require("../controllers/userController");
const { createReview, 
        getReviewsByVideo, 
        getMyReviews, 
        updateReview, 
        deleteReview 
} = require("../controllers/reviewController"); // [추가]

// --- Video Routes ---
router.route("/videos").post(createVideo);
router.route("/admin/import").post(importVideoFromTmdb);
router.route("/admin/seed").post(seedDatabase);
router.route("/videos/next").get(getNextVideo);
router.route("/videos/search").get(searchVideos); // [추가]

// --- User Routes ---
router.route("/users").post(createUser);
router.route("/users/:userId/like/:videoId").post(likeVideo);
router.route("/users/:userId/pass/:videoId").post(passVideo);
router.route("/users/:userId/my-list").get(getLikedVideos);

// --- Review Routes (새로 추가) ---
router.route("/reviews").post(createReview);
router.route("/reviews/my").get(getMyReviews);               // [추가]
router.route("/reviews/:videoId").get(getReviewsByVideo);
router.route("/reviews/:reviewId").put(updateReview);        // [추가]
router.route("/reviews/:reviewId").delete(deleteReview);     // [추가]

module.exports = router;