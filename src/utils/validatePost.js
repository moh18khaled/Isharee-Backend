const sendError = require("./sendError");
const Post = require("../models/post");
const mongoose = require("mongoose");

const validatePost = async (req, next) => {
  const { id } = req.params;

    // Check if the post ID is valid
  if (!mongoose.Types.ObjectId.isValid(id))
    return next(sendError(400, "invalidPostId"));

  const post = await Post.findById(id);
  if (!post) return next(sendError(404, "post"));

  return post;
};

module.exports = validatePost;
