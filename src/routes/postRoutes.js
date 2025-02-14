const express = require("express");
const mongoose = require("mongoose");
const postController = require("../controllers/postController");
const asyncHandler = require("express-async-handler");
const verifyToken = require("../middlewares/verifyToken");
const optionalAuth = require("../middlewares/optionalAuth");
const validateRequiredFields = require("../middlewares/validateRequiredFields");

const upload = require("../utils/fileUpload");

const router = express.Router();

router.get("/interests", verifyToken, asyncHandler(postController.getPostsByInterests)); // Return Posts based on interests
router.post("/purchase-intent", verifyToken, asyncHandler(postController.addPurchaseIntent)); 

// Search for posts
router.get("/search", asyncHandler(postController.searchPosts)); // Define this BEFORE /:id

// Create a new post or get all posts
router
  .route("/")
  .post(
    verifyToken,
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "video", maxCount: 1 },
    ]),validateRequiredFields("post"),
    asyncHandler(postController.addPost)
  )
  .get(asyncHandler(postController.getPosts)); // Get all posts sorted by likes


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

  
  router.get("/:id/comments",postController.getPostComments);

// Toggle Like (Single route instead of separate like/unlike)
router.patch("/:id/toggleLike", verifyToken, asyncHandler(postController.toggleLike));

// Add and Remove comment
router.post("/:id/addComment", verifyToken, asyncHandler(postController.addComment)); // Add a comment
router.delete(
  "/:postId/removeComment/:commentId",
  verifyToken,
  asyncHandler(postController.removeComment)
); // Remove a comment

module.exports = router;