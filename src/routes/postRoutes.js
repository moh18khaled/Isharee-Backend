const express = require("express");
const mongoose = require("mongoose");
const postController = require("../controllers/postController");
const asyncHandler = require("express-async-handler");
const verifyToken = require("../middlewares/verifyToken");
const optionalAuth = require("../middlewares/optionalAuth");
const upload = require("../utils/fileUpload");

const router = express.Router();

// Create a new post or get all posts
router
  .route("/")
  .post(
    verifyToken,
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "video", maxCount: 1 },
    ]),
    asyncHandler(postController.addPost)
  )
  .get(asyncHandler(postController.getPosts)); // Get all posts sorted by likes

// Search for posts
router.get("/search", asyncHandler(postController.searchPosts)); // Define this BEFORE /:id

// Get, update, or delete a post by ID
router
  .route("/:id")
  .get(optionalAuth, asyncHandler(postController.getPost)) // Get post by ID
  .patch(
    verifyToken,
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "video", maxCount: 1 },
    ]),
    asyncHandler(postController.updatePost)
  )
  .delete(verifyToken, asyncHandler(postController.deletePost)); // Delete a post

// Like and Unlike a post
router.patch("/:id/like", verifyToken, asyncHandler(postController.likePost)); // Like a post
router.patch("/:id/unlike", verifyToken, asyncHandler(postController.unlikePost)); // Unlike a post

// Add and Remove comment
router.post("/:id/addComment", verifyToken, asyncHandler(postController.addComment)); // Add a comment
router.delete(
  "/:postId/removeComment/:commentId",
  verifyToken,
  asyncHandler(postController.removeComment)
); // Remove a comment

module.exports = router;