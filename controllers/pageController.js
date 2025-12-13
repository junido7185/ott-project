const asyncHandler = require("express-async-handler");
const Video = require("../models/Video");
const User = require("../models/User");

// OTT 선택 페이지 렌더링
const renderSelectOttPage = asyncHandler(async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    // 1. 유저 정보와 좋아요한 비디오 가져오기
    const user = await User.findById(req.session.user.id).populate('likedVideos');
    
    let favoriteGenre = null;

    // 2. 장르 통계 내기
    if (user.likedVideos && user.likedVideos.length > 0) {
        const genreCounts = {};
        
        user.likedVideos.forEach(video => {
            if (video.genre) {
                // "액션, 모험" 처럼 되어있을 수 있으므로 쪼갬
                const genres = video.genre.split(',').map(g => g.trim());
                genres.forEach(g => {
                    genreCounts[g] = (genreCounts[g] || 0) + 1;
                });
            }
        });

        // 3. 가장 많이 나온 장르 찾기
        const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
        if (sortedGenres.length > 0) {
            favoriteGenre = sortedGenres[0][0]; // 예: "액션"
        }
    }

    // 4. 뷰에 데이터 전달
    res.render("select", { 
        user: user,
        favoriteGenre: favoriteGenre 
    });
});

// 메인 페이지 렌더링
const renderMainPage = asyncHandler(async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    const userId = req.session.user.id;
    const user = await User.findById(userId);
    const selectedOtt = req.query.ott;    
    const selectedGenre = req.query.genre;

    if (selectedOtt) {
        req.session.lastOtt = selectedOtt;
    }

    const seenVideos = [...user.likedVideos, ...user.passedVideos];
    const query = { _id: { $nin: seenVideos } };

    if (selectedOtt) {
        query.ottPlatform = selectedOtt;
    }
    // 장르 필터링 (부분 일치 검색)
    if (selectedGenre) {
        // DB에 "액션, 모험" 등으로 저장되어 있으므로 regex 사용
        query.genre = { $regex: selectedGenre, $options: 'i' };
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
        user: user,
        lastOtt: req.session.lastOtt || null 
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