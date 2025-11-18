const express = require('express');
const dotenv = require('dotenv').config(); // .env 파일 로드
const path = require('path');
const dbConnect = require('./config/dbConnect');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const app = express();
const port = process.env.PORT || 3000;

// --- 템플릿 엔진 설정 ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); 

// --- 미들웨어 설정 ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- DB 연결 ---
dbConnect();

// --- 세션 미들웨어 설정 ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'mySecretKey', // .env에 SESSION_SECRET 추가 권장
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }), // 세션을 몽고DB에 저장
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 쿠키 유효기간 1일
}));

// 전역 변수 미들웨어 (모든 뷰에서 user 정보 사용 가능하게)
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// --- 라우트 설정 ---
app.use('/', require('./routes/authRoutes'));
app.use('/', require('./routes/pageRoutes.js'));
app.use('/api', require('./routes/apiRoutes.js')); 

// --- 서버 실행 ---
app.listen(port, () => {
    console.log(`${port}번 포트에서 서버 실행 중...`);
});