const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: { type: String, required: true },
    image: {
      url: {
        type: String,
      },
      public_id: {
        type: String,
      },
    },
    video: {
      url: {
        type: String,
      },
      public_id: {
        type: String,
      },
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Store references to User who liked the post
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment", // Reference to Comment model
      },
    ],
    viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Tracks views
    purchaseIntent: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        intent: { type: String, enum: ["yes", "no", "not sure"] },
      },
    ],
    rating: {
      type: Number,
      required: true,
      min: [1, "Rating must be between 1 and 5."],
      max: [5, "Rating must be between 1 and 5."],
    },
    businessOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessOwner", // Reference to the BusinessOwner model
      //   required: true,
    },
    categories: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    ],
  },
  {
    timestamps: true,
  }
);

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
