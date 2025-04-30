const express = require("express");
const asyncHandler = require("express-async-handler");
const userController = require("../controllers/userController");
const validateRequiredFields = require("../middlewares/validateRequiredFields");
const verifyToken = require("../middlewares/verifyToken");
const optionalAuth = require("../middlewares/optionalAuth");
const authorizeRoles = require("../middlewares/authorizeRoles");

const router = express.Router();

router.get("/signup-data", asyncHandler(userController.getSignupData));
router.post(
  "/signup",
  validateRequiredFields("user"),
  asyncHandler(userController.signup)
);
router.post(
  "/login",
  optionalAuth, // If the user is already logged in add add his id
  asyncHandler(userController.login)
);

router.post("/logout", verifyToken, asyncHandler(userController.logout));

router.get("/verify-email", asyncHandler(userController.verifyEmail));

router.post(
  "/reset-password",
  asyncHandler(userController.requestPasswordReset)
);
router.post(
  "/reset-password/confirm",
  asyncHandler(userController.confirmPasswordReset)
);

router.post(
  "/contact",
  validateRequiredFields("emailContent"),
  asyncHandler(userController.contactSupport)
);

router
  .route("/account")
  .get(verifyToken, asyncHandler(userController.getUserAccount))
  .patch(verifyToken, asyncHandler(userController.updateAccount))
  .delete(verifyToken, asyncHandler(userController.deleteAccount));

router
  .route("/ewallet")
  .get(verifyToken, asyncHandler(userController.getUserEwallet));

router.patch(
  "/account/password",
  verifyToken,
  asyncHandler(userController.changePassword)
);

router.use("/account/posts", verifyToken);

// User-specific posts routes
router.route("/account/posts").get(asyncHandler(userController.getPosts)); // Get user's posts

router
  .route("/account/posts/liked-posts")
  .get(verifyToken, asyncHandler(userController.getLikedPosts)); // Get posts liked by the user

router
  .route("/account/followers")
  .get(verifyToken, asyncHandler(userController.getFollowers));

router
  .route("/account/following")
  .get(verifyToken, asyncHandler(userController.getFollowing));

router.patch(
  "/:id/toggleFollow",
  verifyToken,
  asyncHandler(userController.toggleFollow)
);

router.get(
  "/account/:id",
  optionalAuth,
  asyncHandler(userController.getOtherUserAccount)
);

router.get(
  "/account/:id/followers",
  optionalAuth,
  asyncHandler(userController.getOtherUserFollowers)
);
router.get(
  "/account/:id/following",
  optionalAuth,
  asyncHandler(userController.getOtherUserFollowing)
);
router.get(
  "/account/:id/posts",
  optionalAuth,
  asyncHandler(userController.getOtherUserPosts)
);
router.get(
  "/account/:id/liked-posts",
  optionalAuth,
  asyncHandler(userController.getOtherUserLikedPosts)
);

// Get all notifications
router.get(
  "/notifications",
  verifyToken,
  asyncHandler(userController.getNotifications)
);

router.patch(
  "/notifications/:notificationId",
  verifyToken,
  asyncHandler(userController.markAsRead)
);

module.exports = router;
