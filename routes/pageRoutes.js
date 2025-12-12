const express = require("express");
const router = express.Router();
const { 
    renderMainPage, 
    renderMyListPage, 
    renderSelectOttPage,
    renderSearchPage,
    renderMyReviewsPage,
    renderSetNicknamePage  // [추가]
} = require("../controllers/pageController");


router.route("/main").get(renderMainPage); // [수정] GET /main
router.route("/select-ott").get(renderSelectOttPage); // GET /select-ott
router.route("/my-list").get(renderMyListPage); // GET /my-list
router.route("/search").get(renderSearchPage);
router.route("/my-reviews").get(renderMyReviewsPage);
router.route("/set-nickname").get(renderSetNicknamePage);

module.exports = router;