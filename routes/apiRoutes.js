const express = require("express");
const router = express.Router();
const requireAdmin = require("../middleware/requireAdmin");

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
// 관리자 전용: x-admin-token 헤더 필요
router.route("/videos").post(requireAdmin, createVideo);
router.route("/admin/import").post(requireAdmin, importVideoFromTmdb);
router.route("/admin/seed").post(requireAdmin, seedDatabase);
router.route("/videos/next").get(getNextVideo);
router.route("/videos/search").get(searchVideos);

// --- User Routes ---
router.route("/users").post(requireAdmin, createUser); // (임시) 테스트용이므로 관리자만
router.route("/users/set-nickname").post(setNickname);

// URL의 :userId는 하위 호환용으로만 남겨두고 무시함 (실제 대상은 항상 로그인한 세션 유저)
router.route("/users/:userId/my-list").get(getLikedVideos);
router.route("/users/:userId/like/:videoId").post(likeVideo);
router.route("/users/:userId/pass/:videoId").post(passVideo);

// --- Review Routes ---
router.route("/reviews").post(createReview);
router.route("/reviews/my").get(getMyReviews);
router.route("/reviews/:videoId").get(getReviewsByVideo);
router.route("/reviews/:reviewId").put(updateReview);
router.route("/reviews/:reviewId").delete(deleteReview);

module.exports = router;