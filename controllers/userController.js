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
    const userId = req.session.user.id;

    if (!nickname) {
        return res.status(400).json({ message: "닉네임을 입력해주세요." });
    }

    const existing = await User.findOne({ nickname: nickname.trim() });
    if (existing && existing._id.toString() !== req.session.user.id) {
        return res.status(400).json({ message: "이미 사용 중인 닉네임입니다." });
    }

    // 1. DB 업데이트
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { nickname: nickname.trim() },
        { new: true } // 업데이트된 정보 반환
    );

    // 2. 세션 정보도 업데이트 (중요: 그래야 새로고침해도 유지됨)
    req.session.user.nickname = updatedUser.nickname;
    
    const updateResult = await Review.updateMany(
        { userId: userId },  // 이 사용자가 쓴 모든 리뷰를
        { username: updatedUser.nickname }  // 새 닉네임으로 변경
    );

    // 세션 저장 후 응답
    req.session.save(() => {
        res.status(200).json({ 
            message: "닉네임이 변경되었습니다.", 
            nickname: updatedUser.nickname, 
            updatedReviews: updateResult.modifiedCount
        });
    });
});

// 모든 함수를 export 하는거 잊지 않기
module.exports = { 
    createUser, 
    likeVideo, 
    passVideo, 
    getLikedVideos,
    setNickname
};