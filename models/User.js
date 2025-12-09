const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "아이디를 입력해주세요."],
        unique: true
    },
    nickname: {  // [추가] 닉네임
        type: String,
        unique: true,
        sparse: true  // null 허용하면서 unique
    },
    password: {
        type: String,
        required: true
    },
    likedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
    passedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }]
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);