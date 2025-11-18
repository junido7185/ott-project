const mongoose = require("mongoose");

// 비디오/콘텐츠 정보에 대한 Schema
const videoSchema = new mongoose.Schema({
    // [!!] TMDb의 고유 ID를 저장할 필드
    tmdbId: {
        type: Number,
        required: true,
        unique: true // 이 ID는 유니크해야 함
    },
    title: {
        type: String,
        required: [true, "제목을 입력해주세요."]
    },
    description: {
        type: String,
        required: true
    },
    posterImageUrl: {
        type: String,
        required: true
    },
    ottPlatform: {
        type: String,
        required: true
    },
    genre: String
}, {
    timestamps: true
});

// 설계도를 기반으로 한 모델(Model) 생성
module.exports = mongoose.model('Video', videoSchema);