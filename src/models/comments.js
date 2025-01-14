const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;
