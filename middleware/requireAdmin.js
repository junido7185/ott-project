const crypto = require("crypto");

// 관리자 전용 API 보호 미들웨어
// - 서버에 ADMIN_TOKEN 환경변수가 없으면 관리자 API 자체를 막음 (503)
// - 요청 헤더 x-admin-token 이 ADMIN_TOKEN 과 일치해야 통과 (불일치 시 401)
const requireAdmin = (req, res, next) => {
    const adminToken = process.env.ADMIN_TOKEN;
    if (!adminToken) {
        return res.status(503).json({ message: "관리자 기능이 비활성화되어 있습니다. (ADMIN_TOKEN 미설정)" });
    }

    const given = req.get("x-admin-token") || "";
    const a = Buffer.from(given);
    const b = Buffer.from(adminToken);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ message: "관리자 인증이 필요합니다." });
    }
    next();
};

module.exports = requireAdmin;
