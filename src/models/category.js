const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true 
    },
    description: { 
      type: String, 
      default: null 
    },
    posts: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Post", // Reference to the Post model
        },
      ],
  },
  {
    timestamps: true,
  }
);

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
