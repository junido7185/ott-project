const asyncHandler = require("express-async-handler");
const Video = require("../models/Video"); // Video 모델
const User = require("../models/User"); // User 모델

// .env 파일에서 API 키 불러오기
const TMDB_API_KEY = process.env.TMDB_API_KEY;

// [!!] 장르 맵 캐시용 변수
let genreMapCache = null;

// [!!] 장르 목록 API를 호출해 { 28: "액션", 12: "모험" } 형태의 객체를 만드는 함수
const getGenreMap = async () => {
    // 이미 캐시된 맵이 있으면 API 호출 없이 즉시 반환
    if (genreMapCache) {
        return genreMapCache;
    }

    try {
        const url = `https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}&language=ko-KR`;
        const response = await fetch(url);
        const data = await response.json();
        
        // [{id: 28, name: "액션"}, ...] -> {28: "액션", ...}
        const genreMap = data.genres.reduce((acc, genre) => {
            acc[genre.id] = genre.name;
            return acc;
        }, {});

        genreMapCache = genreMap; // 맵을 캐시에 저장
        return genreMap;
    } catch (err) {
        console.error("장르 맵 생성 실패:", err);
        return {}; // 에러 시 빈 객체 반환
    }
};

// @desc    (관리자용) 새 비디오/콘텐츠 추가
// @route   POST /api/videos
const createVideo = asyncHandler(async (req, res) => {
    const { title, description, posterImageUrl, ottPlatform, genre } = req.body;

    if (!title || !description || !posterImageUrl || !ottPlatform) {
        return res.status(400).send("필수값이 입력되지 않았습니다.");
    }

    const video = await Video.create({
        title,
        description,
        posterImageUrl,
        ottPlatform,
        genre
    });

    res.status(201).json(video); // 201: 생성됨
});

// @desc    다음 스와이프 비디오 1개 가져오기
// @route   GET /api/videos/next
const getNextVideo = asyncHandler(async (req, res) => {
    // 세션 체크
    if (!req.session.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
    }
    
    const userId = req.session.user.id; // 세션 ID 사용
    const user = await User.findById(userId);

    // [추가] 쿼리에서 OTT 필터 가져오기
    const selectedOtt = req.query.ott;

    const seenVideos = [
        ...user.likedVideos, 
        ...user.passedVideos
    ];

    // [수정] OTT 필터 적용
    const query = { _id: { $nin: seenVideos } };
    if (selectedOtt) {
        query.ottPlatform = selectedOtt;
    }

    const nextVideo = await Video.findOne(query);

    if (!nextVideo) {
        return res.status(404).json({ message: "더 이상 볼 비디오가 없습니다." });
    }

    res.status(200).json(nextVideo);
});

// @desc    (관리자용) TMDb에서 영화 검색 후 DB에 임포트
// @route   POST /api/admin/import
const importVideoFromTmdb = asyncHandler(async (req, res) => {
    
    // 1. 관리자가 Thunder Client로 보낸 요청(title)을 받음
    const { title, ottPlatform, genre } = req.body;

    if (!title) {
        return res.status(400).send("가져올 영화 제목(title)은 필수입니다.");
    }

    // 2. Node.js의 fetch를 사용해 TMDb 검색 API 호출
    // (encodeURIComponent는 "오징어 게임" -> "오징어%20게임" 처럼 URL 인코딩)
    const tmdbUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&api_key=${TMDB_API_KEY}&language=ko-KR`;

    const tmdbResponse = await fetch(tmdbUrl);
    const tmdbData = await tmdbResponse.json();

    if (!tmdbData.results || tmdbData.results.length === 0) {
        return res.status(404).send("TMDb에서 해당 영화를 찾지 못했습니다.");
    }

    // 3. TMDb 검색 결과 중 첫 번째 항목(가장 정확)을 사용
    const movie = tmdbData.results[0];

    // 4. 우리 DB 스키마 형식에 맞게 데이터를 "가공"
    const videoData = {
        title: movie.title,
        description: movie.overview, // TMDb의 'overview'를 우리 'description'으로
        posterImageUrl: `http://image.tmdb.org/t/p/w500${movie.poster_path}`, // TMDb 포스터 URL 조합
        ottPlatform: ottPlatform || "Unknown", // 관리자가 입력 안했으면 "Unknown"
        genre: genre || movie.genre_ids.join(',') // TMDb의 장르 ID를 쓰거나 관리자 입력값 사용
    };

    // 5. 가공된 데이터로 우리 DB에 저장
    const newVideo = await Video.create(videoData);

    res.status(201).json(newVideo);
});

// @desc    (관리자용) TMDb "Discover"로 여러 OTT 콘텐츠 시딩
// @route   POST /api/admin/seed
const seedDatabase = asyncHandler(async (req, res) => {
    
    // 1. 장르 맵 가져오기 (숫자 -> 텍스트 변환용)
    const genreMap = await getGenreMap();

    // 2. 랜덤 페이지 선택 (1~10페이지 중 랜덤, 범위는 자유롭게 조절 가능)
    const randomPage = Math.floor(Math.random() * 10) + 1;

    // 3. [확장] 긁어올 OTT 목록 정의 (Netflix, Watcha, Tving, Wavve)
    const targetProviders = [
        { id: 8, name: "Netflix" },
        { id: 97, name: "Watcha" },
        { id: 119, name: "Tving" },
        { id: 356, name: "Wavve" }
    ];

    let totalImported = 0;
    let totalUpdated = 0;

    // 4. 각 OTT별로 API 호출 (반복문 시작)
    for (const provider of targetProviders) {
        // API 호출 URL 구성 (provider.id를 동적으로 삽입)
        const tmdbUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=ko-KR&page=${randomPage}&with_watch_providers=${provider.id}&watch_region=KR&sort_by=popularity.desc`;
        
        try {
            const response = await fetch(tmdbUrl);
            const data = await response.json();

            if (!data.results) continue; // 결과가 없으면 다음 OTT로 넘어감

            for (const movie of data.results) {
                // [기존 로직 유지] 필터링: 설명이나 포스터가 없는 영화는 건너뛰기
                if (!movie.overview || !movie.poster_path) {
                    continue; 
                }

                // [기존 로직 유지] 장르 ID 배열을 텍스트 문자열로 변환
                const genreNames = movie.genre_ids
                    .map(id => genreMap[id] || "기타")
                    .join(', ');

                // [기존 로직 유지 + 확장] 데이터 가공
                const videoData = {
                    tmdbId: movie.id,
                    title: movie.title,
                    description: movie.overview,
                    posterImageUrl: `http://image.tmdb.org/t/p/w500${movie.poster_path}`,
                    ottPlatform: provider.name, // [중요] 현재 루프의 OTT 이름(Netflix, Tving 등) 저장
                    genre: genreNames
                };

                // [기존 로직 유지] Mongoose "Upsert" (중복 방지: 있으면 수정, 없으면 추가)
                const result = await Video.updateOne(
                    { tmdbId: movie.id },
                    videoData,
                    { upsert: true }
                );

                if (result.upsertedCount > 0) totalImported++;
                else if (result.modifiedCount > 0) updatedCount++;
            }
        } catch (err) {
            console.error(`${provider.name} 데이터 시딩 중 에러:`, err);
            // 한 OTT에서 에러가 나도 나머지는 계속 진행하도록 continue 처리
            continue;
        }
    }

    // 5. 최종 결과 응답
    res.status(201).json({
        message: `데이터 시딩 완료! (페이지: ${randomPage})`,
        details: `총 ${totalImported}개 추가됨, ${totalUpdated}개 업데이트됨`,
        providers: targetProviders.map(p => p.name) // 어떤 OTT를 긁었는지 정보 제공
    });
});

// module.exports에 seedDatabase가 포함되어 있는지 확인
module.exports = { 
    createVideo, 
    getNextVideo,
    importVideoFromTmdb,
    seedDatabase
};