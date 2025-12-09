const express = require("express");
const router = express.Router();
const { 
    createVideo, 
    getNextVideo,
    importVideoFromTmdb,
    seedDatabase
} = require("../controllers/videoController");
const { createUser, likeVideo, passVideo, getLikedVideos } = require("../controllers/userController");
const { createReview, getReviewsByVideo } = require("../controllers/reviewController"); // [추가]

// --- Video Routes ---
router.route("/videos").post(createVideo);
router.route("/admin/import").post(importVideoFromTmdb);
router.route("/admin/seed").post(seedDatabase);
router.route("/videos/next").get(getNextVideo);

// --- User Routes ---
router.route("/users").post(createUser);
router.route("/users/:userId/like/:videoId").post(likeVideo);
router.route("/users/:userId/pass/:videoId").post(passVideo);
router.route("/users/:userId/my-list").get(getLikedVideos);

// --- Review Routes (새로 추가) ---
router.route("/reviews").post(createReview);
router.route("/reviews/:videoId").get(getReviewsByVideo);

module.exports = router;