const express = require("express");
const router = express.Router();
const { 
    getRegisterPage, registerUser, 
    getLoginPage, loginUser, 
    logoutUser 
} = require("../controllers/authController");

router.route("/register")
    .get(getRegisterPage)
    .post(registerUser);

router.route("/login")
    .get(getLoginPage)
    .post(loginUser);

router.get("/logout", logoutUser);

module.exports = router;