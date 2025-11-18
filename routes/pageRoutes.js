const express = require("express");
const router = express.Router();
const { renderMainPage, renderMyListPage } = require("../controllers/pageController");

router.route("/").get(renderMainPage); // GET /
router.route("/my-list").get(renderMyListPage); // GET /my-list

module.exports = router;