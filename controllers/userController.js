const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const User = require("../models/User");
const Review = require("../models/Review");

// (임시) 유저 생성 - 테스트용
const createUser = asyncHandler(async (req, res) => {
    const user = await User.create({ username: "testUser" });
    res.status(201).json(user);
});

// 로그인한 세션 유저 ID (URL의 :userId는 신뢰하지 않음)
const getSessionUserId = (req) => (req.session.user ? req.session.user.id : null);

// 좋아요/패스 공통 처리: 세션 유저의 목록에만 추가하고, 최소한의 정보만 응답
const addToMyList = (field) => asyncHandler(async (req, res) => {
    const userId = getSessionUserId(req);
    if (!userId) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const { videoId } = req.params;
    if (!mongoose.isValidObjectId(videoId)) {
        return res.status(400).json({ message: "잘못된 비디오 ID입니다." });
    }

    const user = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { [field]: videoId } },
        { new: true }
    ).select("_id");

    if (!user) {
        return res.status(404).send("유저를 찾을 수 없습니다.");
    }
    // 유저 문서 전체(비밀번호 해시 포함)를 돌려주지 않음
    res.status(200).json({ videoId, [field === "likedVideos" ? "liked" : "passed"]: true });
});

// 비디오 "좋아요" 처리
const likeVideo = addToMyList("likedVideos");

// 비디오 "싫어요(Pass)" 처리
const passVideo = addToMyList("passedVideos");

// 내가 "좋아요" 한 비디오 목록 보기
const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = getSessionUserId(req);
    if (!userId) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const user = await User.findById(userId).populate('likedVideos');
    
    if (!user) {
        return res.status(404).send("유저를 찾을 수 없습니다.");
    }
    res.status(200).json(user.likedVideos);
});

// 닉네임 설정
const setNickname = asyncHandler(async (req, res) => {
    // 로그아웃 상태에서 호출하면 req.session.user가 없어 서버 에러가 나던 문제 방지
    if (!req.session.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const { nickname } = req.body;
    const userId = req.session.user.id;

    if (typeof nickname !== "string" || !nickname.trim()) {
        return res.status(400).json({ message: "닉네임을 입력해주세요." });
    }

    const existing = await User.findOne({ nickname: nickname.trim() });
    if (existing && existing._id.toString() !== String(userId)) {
        return res.status(400).json({ message: "이미 사용 중인 닉네임입니다." });
    }

    // DB 업데이트
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { nickname: nickname.trim() },
        { new: true } // 업데이트된 정보 반환
    );

    // 세션 정보도 업데이트 (중요: 그래야 새로고침해도 유지됨)
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