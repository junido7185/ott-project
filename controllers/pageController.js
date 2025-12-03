const asyncHandler = require("express-async-handler");
const Video = require("../models/Video");
const User = require("../models/User");

// [추가] OTT 선택 페이지 렌더링
const renderSelectOttPage = (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    res.render("select");
};

// @desc    메인 페이지 렌더링
// @route   GET /
const renderMainPage = asyncHandler(async (req, res) => {
    // 로그인 안 했으면 로그인 페이지로 튕김
    if (!req.session.user) {
        return res.redirect("/login");
    }

    const userId = req.session.user.id; // 세션에서 ID 가져오기
    const user = await User.findById(userId);

    // [추가] URL 쿼리에서 선택한 OTT 가져오기
    const selectedOtt = req.query.ott; // ?ott=Netflix

    const seenVideos = [...user.likedVideos, ...user.passedVideos];

    // [수정] OTT 필터 적용
    const query = { _id: { $nin: seenVideos } };
    if (selectedOtt) {
        query.ottPlatform = selectedOtt; // 선택한 OTT만 필터링
    }

    // 아직 보지 않은 비디오 중 1개 찾기
    const nextVideo = await Video.findOne(query);

    // 찾은 비디오 데이터를 'video'라는 키로 index.ejs 파일에 전달하여 렌더링
    res.render("index", {
        video: nextVideo, // nextVideo가 없으면 video 키에는 null이 전달됨
        user: user
    });
});

// @desc    "좋아요" 목록 페이지 렌더링 (3주차 추가 과제)
// @route   GET /my-list
const renderMyListPage = asyncHandler(async (req, res) => {
    if (!req.session.user) { // 로그인 체크
        return res.redirect("/login");
    }

    const userId = req.session.user.id;
    const user = await User.findById(userId).populate('likedVideos');

    res.render("my-list", {
        videos: user.likedVideos,
        user: user // 유저 객체 전달
    });
});

module.exports = { renderMainPage, renderMyListPage, renderSelectOttPage };