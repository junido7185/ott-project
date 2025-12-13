const express = require("express");
const router = express.Router();

// VideoController에서 import
const { 
    createVideo, 
    getNextVideo,
    importVideoFromTmdb,
    seedDatabase,
    searchVideos
} = require("../controllers/videoController");

// UserController에서 import
const { 
    createUser, 
    likeVideo, 
    passVideo, 
    getLikedVideos, 
    setNickname
} = require("../controllers/userController");

// ReviewController에서 import
const { 
    createReview, 
    getReviewsByVideo, 
    getMyReviews, 
    updateReview, 
    deleteReview 
} = require("../controllers/reviewController");

// --- Video Routes ---
router.route("/videos").post(createVideo);
router.route("/admin/import").post(importVideoFromTmdb);
router.route("/admin/seed").post(seedDatabase);
router.route("/videos/next").get(getNextVideo);
router.route("/videos/search").get(searchVideos);

// --- User Routes ---
router.route("/users").post(createUser);
router.route("/users/set-nickname").post(setNickname);

router.route("/users/:userId/my-list").get(getLikedVideos);
router.route("/users/:userId/like/:videoId").post(likeVideo);
router.route("/users/:userId/pass/:videoId").post(passVideo);
router.route("/users/set-nickname").post(setNickname);

// --- Review Routes ---
router.route("/reviews").post(createReview);
router.route("/reviews/my").get(getMyReviews);
router.route("/reviews/:videoId").get(getReviewsByVideo);
router.route("/reviews/:reviewId").put(updateReview);
router.route("/reviews/:reviewId").delete(deleteReview);

module.exports = router;