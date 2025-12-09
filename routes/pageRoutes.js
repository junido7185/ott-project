const express = require("express");
const router = express.Router();
const { 
    renderMainPage, 
    renderMyListPage, 
    renderSelectOttPage,
    renderSearchPage,      // [추가]
    renderMyReviewsPage    // [추가]
} = require("../controllers/pageController");


router.route("/").get(renderMainPage); // GET /
router.route("/select").get(renderSelectOttPage); // [추가] GET /select
router.route("/my-list").get(renderMyListPage); // GET /my-list
router.route("/search").get(renderSearchPage);          // [추가]
router.route("/my-reviews").get(renderMyReviewsPage);  // [추가]

module.exports = router;