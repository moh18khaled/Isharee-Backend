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
  },
  {
    timestamps: true,
  }
);
