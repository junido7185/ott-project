const express = require("express");
const router = express.Router();
const { 
    createVideo, 
    getNextVideo,
    importVideoFromTmdb,
    seedDatabase
} = require("../controllers/videoController");
const { createUser, likeVideo, passVideo, getLikedVideos } = require("../controllers/userController");

// --- Video Routes ---
// 관리자용 비디오 생성 (수동)
router.route("/videos").post(createVideo); // POST /api/videos
// 관리자용 비디오 임포트 (자동)
router.route("/admin/import").post(importVideoFromTmdb); // POST /api/admin/import
router.route("/admin/seed").post(seedDatabase);
// 사용자용 다음 비디오 가져오기
router.route("/videos/next").get(getNextVideo); // GET /api/videos/next

// --- User Routes ---
router.route("/users").post(createUser); // (테스트용) POST /api/users
router.route("/users/:userId/like/:videoId").post(likeVideo); // POST /api/users/:userId/like/:videoId
router.route("/users/:userId/pass/:videoId").post(passVideo); // POST /api/users/:userId/pass/:videoId
router.route("/users/:userId/my-list").get(getLikedVideos); // GET /api/users/:userId/my-list

module.exports = router;