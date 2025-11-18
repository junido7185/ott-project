const mongoose = require('mongoose');

// 사용자 정보 및 선호도에 대한 Schema
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "아이디는 필수입니다."],
        unique: true
    },
    password: { //비밀번호 필드
        type: String,
        required: [true, "비밀번호는 필수입니다."]
    },
    // "좋아요" 누른 비디오의 ID 목록을 배열로 저장
    likedVideos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video' // Video 모델을 참조
    }],
    // pass 누른 비디오의 ID 목록
    passedVideos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video'
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);