const asyncHandler = require("express-async-handler");
const Video = require("../models/Video");
const User = require("../models/User");

// OTT 선택 페이지 렌더링
const renderSelectOttPage = (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    res.render("select");
};

// 메인 페이지 렌더링
const renderMainPage = asyncHandler(async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    const userId = req.session.user.id;
    const user = await User.findById(userId);

    const selectedOtt = req.query.ott;

    const seenVideos = [...user.likedVideos, ...user.passedVideos];

    const query = { _id: { $nin: seenVideos } };
    if (selectedOtt) {
        query.ottPlatform = selectedOtt;
    }

    const nextVideo = await Video.findOne(query);

    res.render("index", {
        video: nextVideo,
        user: user
    });
});

// "좋아요" 목록 페이지 렌더링
const renderMyListPage = asyncHandler(async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    const userId = req.session.user.id;
    const user = await User.findById(userId).populate('likedVideos');

    res.render("my-list", {
        videos: user.likedVideos,
        user: user
    });
});

// 검색 페이지 렌더링
const renderSearchPage = (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    res.render("search", { user: req.session.user });
};

// 내 리뷰 페이지 렌더링
const renderMyReviewsPage = (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    res.render("my-reviews", { user: req.session.user });
};

// 닉네임 설정 페이지 렌더링
const renderSetNicknamePage = (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    res.render("set-nickname", { user: req.session.user });
};

module.exports = { 
    renderMainPage, 
    renderMyListPage, 
    renderSelectOttPage,
    renderSearchPage,
    renderMyReviewsPage,
    renderSetNicknamePage
};