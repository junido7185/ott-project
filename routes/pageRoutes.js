const express = require("express");
const router = express.Router();
const { renderMainPage, renderMyListPage, renderSelectOttPage } = require("../controllers/pageController");

router.route("/").get(renderMainPage); // GET /
router.route("/select").get(renderSelectOttPage); // [추가] GET /select
router.route("/my-list").get(renderMyListPage); // GET /my-list

module.exports = router;