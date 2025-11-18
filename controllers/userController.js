const asyncHandler = require("express-async-handler");
const User = require("../models/User");

// (임시) 유저 생성 - 테스트용
const createUser = asyncHandler(async (req, res) => {
    const user = await User.create({ username: "testUser" });
    res.status(201).json(user);
});

// @desc    비디오 "좋아요" 처리
// @route   POST /api/users/:userId/like/:videoId
const likeVideo = asyncHandler(async (req, res) => {
    const { userId, videoId } = req.params;

    // $addToSet: 배열에 중복되지 않게 값을 추가 (이미 있으면 무시)
    const user = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { likedVideos: videoId } },
        { new: true } // 업데이트된 문서를 반환
    );

    if (!user) {
        return res.status(404).send("유저를 찾을 수 없습니다.");
    }
    res.status(200).json(user);
});

// @desc    비디오 "싫어요(Pass)" 처리
// @route   POST /api/users/:userId/pass/:videoId
const passVideo = asyncHandler(async (req, res) => {
    const { userId, videoId } = req.params;

    const user = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { passedVideos: videoId } },
        { new: true }
    );

    if (!user) {
        return res.status(404).send("유저를 찾을 수 없습니다.");
    }
    res.status(200).json(user);
});

// @desc    내가 "좋아요" 한 비디오 목록 보기
// @route   GET /api/users/:userId/my-list
const getLikedVideos = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    const user = await User.findById(userId).populate('likedVideos');
    // .populate('likedVideos'): ID만 저장된 배열을 실제 Video 객체 정보로 "채워넣기"
    
    if (!user) {
        return res.status(404).send("유저를 찾을 수 없습니다.");
    }
    res.status(200).json(user.likedVideos);
});


module.exports = { createUser, likeVideo, passVideo, getLikedVideos };