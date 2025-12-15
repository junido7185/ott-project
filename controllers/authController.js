const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// @desc    회원가입 페이지 렌더링
// @route   GET /register
const getRegisterPage = (req, res) => {
    res.render("register");
};

// @desc    회원가입 처리
// @route   POST /register
const registerUser = asyncHandler(async (req, res) => {
    const { username, password, confirmPassword } = req.body; 

    if (!username || !password || !confirmPassword) {
        return res.status(400).send("모든 항목을 입력해주세요.");
    }

    // 비밀번호 일치 확인 로직
    if (password !== confirmPassword) {
        return res.status(400).send("비밀번호가 일치하지 않습니다.");
    }
    
    // 중복 체크
    const userExists = await User.findOne({ username });
    if (userExists) {
        return res.status(400).send("이미 존재하는 아이디입니다.");
    }

    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 유저 생성
    const user = await User.create({
        username,
        password: hashedPassword
    });

    if (user) {
        res.redirect("/login"); // 가입 성공 시 로그인 페이지로 이동
    } else {
        res.status(400).send("유저 생성 실패");
    }
});

// @desc    로그인 페이지 렌더링
// @route   GET /login
const getLoginPage = (req, res) => {
    res.render("login");
};

// @desc    로그인 처리
// @route   POST /login
const loginUser = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    // 유저가 존재하고, 비밀번호가 일치하면
    if (user && (await bcrypt.compare(password, user.password))) {
        // 세션에 유저 정보 저장
        req.session.user = {
            id: user._id,
            username: user.username,
            nickname: user.nickname || null  // [추가] 닉네임
        };
        
        // 로그인 성공 시 OTT 선택 페이지로 이동
        req.session.save(() => {
            res.redirect("/select-ott"); // 변경된 부분
        });
    } else {
        res.status(401).send("아이디 또는 비밀번호가 일치하지 않습니다.");
    }
});

// @desc    로그아웃
// @route   GET /logout
const logoutUser = (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
};

module.exports = { getRegisterPage, registerUser, getLoginPage, loginUser, logoutUser };