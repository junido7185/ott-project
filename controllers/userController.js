const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Review = require("../models/Review");

// (임시) 유저 생성 - 테스트용
const createUser = asyncHandler(async (req, res) => {
    const user = await User.create({ username: "testUser" });
    res.status(201).json(user);
});

// 비디오 "좋아요" 처리
const likeVideo = asyncHandler(async (req, res) => {
    const { userId, videoId } = req.params;

    const user = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { likedVideos: videoId } },
        { new: true }
    );

    if (!user) {
        return res.status(404).send("유저를 찾을 수 없습니다.");
    }
    res.status(200).json(user);
});

// 비디오 "싫어요(Pass)" 처리
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

// 내가 "좋아요" 한 비디오 목록 보기
const getLikedVideos = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    const user = await User.findById(userId).populate('likedVideos');
    
    if (!user) {
        return res.status(404).send("유저를 찾을 수 없습니다.");
    }
    res.status(200).json(user.likedVideos);
});

// 닉네임 설정
const setNickname = asyncHandler(async (req, res) => {
    const { nickname } = req.body;

    if (!req.session.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    if (!nickname || nickname.trim() === '') {
        return res.status(400).json({ message: "닉네임을 입력하세요." });
    }

    // 중복 체크
    const existing = await User.findOne({ nickname: nickname.trim() });
    if (existing && existing._id.toString() !== req.session.user.id) {
        return res.status(400).json({ message: "이미 사용 중인 닉네임입니다." });
    }

    const user = await User.findByIdAndUpdate(
        req.session.user.id,
        { nickname: nickname.trim() },
        { new: true }
    );

    // 세션 업데이트
    req.session.user.nickname = user.nickname;

    // 기존 리뷰의 username도 모두 업데이트
    await Review.updateMany(
        { userId: user._id },
        { username: user.nickname }
    );

    res.status(200).json({ message: "닉네임이 설정되었습니다.", nickname: user.nickname });
});

// 👇 여기가 중요! 모든 함수를 export 해야 합니다
module.exports = { 
    createUser, 
    likeVideo, 
    passVideo, 
    getLikedVideos,
    setNickname  // 이게 있어야 합니다!
};