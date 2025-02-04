const express = require("express");
const asyncHandler = require("express-async-handler");
const userController = require("../controllers/userController");
const validateRequiredFields = require("../middlewares/validateRequiredFields");
const verifyToken = require("../middlewares/verifyToken");
const optionalAuth = require("../middlewares/optionalAuth");
const authorizeRoles = require("../middlewares/authorizeRoles");
const upload = require("../utils/fileUpload");

const router = express.Router();

router.post(
  "/signup",
  validateRequiredFields,
  asyncHandler(userController.signup)
);
router.post(
  "/login",
  optionalAuth, // If the user is already logged in add add his id
  asyncHandler(userController.login)
);

router.get("/verify-email", asyncHandler(userController.verifyEmail));

router
  .route("/account")
  .get(verifyToken, asyncHandler(userController.getAccountData))
  .patch(
    verifyToken, 
    upload.single("profilePicture"),
    asyncHandler(userController.updateAccount)
  )
  .delete(verifyToken, asyncHandler(userController.deleteAccount));

router.patch(
  "/account/password",
  verifyToken,
  asyncHandler(userController.changePassword)
);

router.post("/logout", verifyToken, asyncHandler(userController.logout));

router.use("/account/posts", verifyToken);

// User-specific posts routes
router.route("/account/posts").get(asyncHandler(userController.getPosts)); // Get user's posts

router
  .route("/account/posts/liked-posts")
  .get(asyncHandler(userController.getLikedPosts)); // Get posts liked by the user

router
  .route("/account/followers")
  .get(verifyToken, asyncHandler(userController.getFollowers));

router
  .route("/account/following")
  .get(verifyToken, asyncHandler(userController.getFollowing));

router
  .route("/:id/follow")
  .patch(verifyToken, asyncHandler(userController.followUser));

router
  .route("/:id/unfollow")
  .patch(verifyToken, asyncHandler(userController.unFollowUser));

// Get all notifications
router.get("/notifications", verifyToken, userController.getNotifications);

router.patch("notifications/:notificationId", verifyToken, userController.markAsRead);

module.exports = router;
