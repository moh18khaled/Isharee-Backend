const express = require("express");
const asyncHandler = require("express-async-handler");
const userController = require("../controllers/userController");
const validateRequiredFields = require("../middlewares/validateRequiredFields");
const verifyToken = require("../middlewares/verifyToken");
const authorizeRoles = require("../middlewares/authorizeRoles");
const checkLoginStatus = require("../middlewares/checkLoginStatus");
const upload = require("../utils/fileUpload");

const router = express.Router();

router.post(
  "/signup",
  validateRequiredFields,
  asyncHandler(userController.signup)
);
router.post(
  "/login",
  checkLoginStatus, // Checks if the user is already logged in
  asyncHandler(userController.login)
);


router.use("/account", verifyToken);

router
  .route("/account")
  .get(asyncHandler(userController.getAccountData))
  .patch(
    upload.single("profilePicture"),
    asyncHandler(userController.updateAccount)
  )
.delete(asyncHandler(userController.deleteAccount));

router.patch(
  "/account/password",
  asyncHandler(userController.changePassword)
);

router.get("/logout", verifyToken, asyncHandler(userController.updateAccount));

router.post("/logout", verifyToken, asyncHandler(userController.logout));

module.exports = router;
