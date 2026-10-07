const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const {
  getMyProfile,
  updateMyProfile,
  changePassword,
  listManagedUsers,
  createStaff,
  updateManagedUser,
  updateManagedUserStatus,
} = require("../controllers/userController");

const router = express.Router();

router.use(authenticate);
router.get("/me", getMyProfile);
router.patch("/me", updateMyProfile);
router.patch("/me/password", changePassword);
router.get("/", authorize("admin"), listManagedUsers);
router.post("/staff", authorize("admin"), createStaff);
router.patch("/:id", authorize("admin"), updateManagedUser);
router.patch("/:id/status", authorize("admin"), updateManagedUserStatus);

module.exports = router;
