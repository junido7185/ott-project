const express = require('express');
const dotenv = require('dotenv').config();
const path = require('path');
const dbConnect = require('./config/dbConnect');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const app = express();
const port = process.env.PORT || 3000;

// 세션 시크릿이 없으면 서버를 띄우지 않음 (기본값으로 서명된 쿠키는 위조 가능)
if (!process.env.SESSION_SECRET) {
    console.error("SESSION_SECRET 환경변수가 설정되지 않았습니다. 서버를 시작하지 않습니다.");
    process.exit(1);
}

// 템플릿 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); 

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// DB 연결
dbConnect();

// 세션 미들웨어 설정
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// 전역 변수 미들웨어
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// 👇 이 부분만 남기고 나머지는 삭제!
app.get('/', (req, res) => {
    res.redirect('/login');
});

// 라우트 설정
app.use('/', require('./routes/authRoutes'));
app.use('/', require('./routes/pageRoutes'));
app.use('/api', require('./routes/apiRoutes')); 

// 서버 실행
app.listen(port, () => {
    console.log(`${port}번 포트에서 서버 실행 중...`);
});