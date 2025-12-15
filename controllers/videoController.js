const asyncHandler = require("express-async-handler");
const Video = require("../models/Video"); // Video 모델
const User = require("../models/User"); // User 모델

// .env 파일에서 API 키 불러오기
const TMDB_API_KEY = process.env.TMDB_API_KEY;

// 장르 맵 캐시용 변수
let genreMapCache = null;

// 장르 목록 API를 호출해 { 28: "액션", 12: "모험" } 형태의 객체를 만드는 함수
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

    // 쿼리에서 OTT 필터 가져오기
    const selectedOtt = req.query.ott;
    const selectedGenre = req.query.genre;

    const seenVideos = [
        ...user.likedVideos, 
        ...user.passedVideos
    ];

    // OTT 필터 적용
    const query = { _id: { $nin: seenVideos } };
    if (selectedOtt) {
        query.ottPlatform = selectedOtt;
    }
    // 장르 필터링
    if (selectedGenre) {
        query.genre = { $regex: selectedGenre, $options: 'i' };
    }

    // 랜덤하게 하나 뽑기 (count -> skip 방식)
    const count = await Video.countDocuments(query);
    if (count === 0) {
        return res.status(404).json({ message: "해당 조건의 볼 비디오가 없습니다." });
    }
    
    const random = Math.floor(Math.random() * count);
    const nextVideo = await Video.findOne(query).skip(random);

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

// @desc    (관리자용) 각 OTT별로 100개씩 데이터 시딩
// @route   POST /api/admin/seed
const seedDatabase = asyncHandler(async (req, res) => {
    
    const genreMap = await getGenreMap();

    // [설정] OTT별 목표 개수 (기본 100개)
    // 쿼리로 ?limit=50 처럼 조절 가능
    const limitPerProvider = parseInt(req.query.limit) || 100; 


    const targetProviders = [
        { id: 8, name: "Netflix" },
        { id: 97, name: "Watcha" },
        { id: 119, name: "Tving" },
        { id: 356, name: "Wavve" }
    ];

    let totalProcessed = 0;

    // 1. OTT별 루프
    for (const provider of targetProviders) {
        console.log(`[${provider.name}] 시딩 시작... (목표: ${limitPerProvider}개)`);

        let currentProviderCount = 0;
        let currentPage = 1; // 1페이지부터 시작

        // 2. 목표 개수를 채울 때까지 페이지를 넘기며 반복 (최대 50페이지 안전장치)
        while (currentProviderCount < limitPerProvider && currentPage < 50) {
            
            const tmdbUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=ko-KR&page=${currentPage}&with_watch_providers=${provider.id}&watch_region=KR&sort_by=popularity.desc`;

            try {
                const response = await fetch(tmdbUrl);
                const data = await response.json();

                if (!data.results || data.results.length === 0) break; // 데이터 없으면 중단

                // 3. 페이지 내의 영화 목록 반복
                for (const movie of data.results) {
                    // 목표 달성 시 즉시 중단
                    if (currentProviderCount >= limitPerProvider) break;

                    if (!movie.overview || !movie.poster_path) continue; 

                    const genreNames = movie.genre_ids
                        .map(id => genreMap[id] || "기타")
                        .join(', ');

                    const videoData = {
                        tmdbId: movie.id,
                        title: movie.title,
                        description: movie.overview,
                        posterImageUrl: `http://image.tmdb.org/t/p/w500${movie.poster_path}`,
                        ottPlatform: provider.name,
                        genre: genreNames,
                        rating: movie.vote_average
                    };

                    await Video.updateOne(
                        { tmdbId: movie.id },
                        videoData,
                        { upsert: true }
                    );

                    currentProviderCount++;
                    totalProcessed++;
                }
                
                console.log(`  - ${provider.name} : ${currentPage}페이지 완료 (현재 ${currentProviderCount}/${limitPerProvider})`);
                currentPage++; // 다음 페이지로

            } catch (err) {
                console.error(`API 호출 에러 (${provider.name}):`, err);
                break; 
            }
        }
        console.log(`[${provider.name}] 완료. 총 ${currentProviderCount}개 저장됨.\n`);
    }

   
    res.status(201).json({
        message: `대규모 데이터 시딩 완료!`,
        details: `총 ${totalProcessed}개의 데이터가 처리되었습니다. (각 OTT별 최대 ${limitPerProvider}개)`,
        providers: targetProviders.map(p => p.name)
    });
});

// @desc    영화 검색
// @route   GET /api/videos/search?q=검색어
const searchVideos = asyncHandler(async (req, res) => {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
        return res.status(400).json({ message: "검색어를 입력하세요." });
    }

    // 제목으로 검색 (대소문자 구분 없이)
    const videos = await Video.find({
        title: { $regex: q, $options: 'i' }
    }).limit(20);

    res.status(200).json(videos);
});

// module.exports에 seedDatabase가 포함되어 있는지 확인
module.exports = { 
    createVideo, 
    getNextVideo,
    importVideoFromTmdb,
    seedDatabase,
    searchVideos
};