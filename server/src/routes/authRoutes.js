const express = require("express");
const authenticate = require("../middleware/authenticate");
const { register, login, getCurrentUser } = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, getCurrentUser);

module.exports = router;
