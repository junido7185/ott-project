// config/dbConnect.js
const mongoose = require("mongoose");

const dbConnect = async () => {
    try {
        // .env 파일의 MONGO_URI 값을 사용
        const connect = await mongoose.connect(process.env.MONGO_URI);
        
        console.log(`DB connected: ${connect.connection.host}`);
    } catch (err) {
        console.log(err);
        process.exit(1); // 연결 실패 시 앱 종료
    }
};

module.exports = dbConnect;