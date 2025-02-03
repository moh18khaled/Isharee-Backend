const mongoose = require("mongoose");
const Post = require("../models/post");
const User = require("../models/user");
const Category = require("../models/category");
const Comment = require("../models/comments");
const fs = require("fs");
const sendError = require("../utils/sendError");
const validateUser = require("../utils/validateUser");
const validatePost = require("../utils/validatePost");
const cloudinaryUpload = require("../utils/cloudinaryUpload");
const cloudinaryDelete = require("../utils/cloudinaryDelete");

// Add new post
exports.addPost = async (req, res, next) => {
  const userId = req.user?.id;

  if (!userId) return next(sendError(404, "user"));

  const { title, content, categories } = req.body;

  // Fetch the categories by name
  const categoryDocs = await Category.find({
    name: { $in: categories }, // Look for categories where the name is in the categories array
  });

  if (categoryDocs.length !== categories.length) {
    return next(sendError(400, "invalidCategories"));
  }

  // Map category names to category IDs
  const categoryIds = categoryDocs.map((cat) => cat._id);

  // Ensure image file exists
  if (!req.files?.image || req.files.image.length === 0) {
    return next(sendError(400, "imageRequired"));
  }

  const imagePath = req.files.image[0].path; // Get the image path
  const imageResult = await cloudinaryUpload(imagePath, "postPicture", "image");

  const image = {
    url: imageResult.url,
    public_id: imageResult.public_id,
  };

  // Delete the local image file after upload
  fs.unlinkSync(imagePath);

  // Handle video upload (if a video file is present)
  let video = null;
  if (req.files.video) {
    const videoPath = req.files.video[0].path;
    const videoResult = await cloudinaryUpload(videoPath, "postVideo", "video");

    video = {
      url: videoResult.url,
      public_id: videoResult.public_id,
    };

    // Delete the local video file after upload
    fs.unlinkSync(videoPath);
  }

  // Create the post
  const post = new Post({
    title,
    author: userId,
    content,
    image,
    categories: categoryIds, // Use category IDs here
    ...(video && { video }), // Add video only if it exists
  });

  // Link post to categories
  categoryDocs.forEach((category) => category.posts.push(post._id));

  // Save the post and update user data in parallel
  const user = await User.findById(userId);
  if (!user) return next(sendError(404, "user"));

  user.posts.push(post._id);

  await Promise.all([post.save(), user.save(),...categoryDocs.map((category) => category.save()),
  ]);

  return res.status(200).json({
    message: "Post added successfully",
    data: {
      title,
      author: userId,
      content,
      image,
      video: video || null,
      categories: categoryIds,
    },
  });
};

// Get most liked posts (home page)
exports.getPosts = async (req, res, next) => {
  // Fetch all posts, sorted by createdAt (descending)
  const posts = await Post.find().populate("author", "username profilePicture");

  if (posts.length === 0) {
    return res.status(200).json({
      message: "No posts found.",
      posts: [],
    });
  }
  const sortedPosts = posts
    .map((post) => ({
      ...post.toObject(),
      likesCount: post.likes.length, // Calculate likes count
      likedBy: post.likes, // List of users who liked the post
    }))
    .sort((a, b) => b.likesCount - a.likesCount); // Sort by likesCount in descending order

  return res.status(200).json({
    message: "Posts retrieved successfully",
    posts: sortedPosts,
  });
};

// Get any post be id
exports.getPost = async (req, res, next) => {
  const userId = req.user?.id;
  const { id } = req.params;
  // Check if the post ID is valid
  if (!mongoose.Types.ObjectId.isValid(id))
    return next(sendError(400, "invalidPostId"));

  const post = await Post.findById(id)
    .populate("author", "username profilePicture")
    .populate("comments", "user text createdAt");
  if (!post) return next(sendError(404, "post"));

  // Convert to plain JavaScript object after population
  const plainPost = post.toObject();

  let isOwner = false;
  let isUser = false;
  let isLiked = false;

  if (userId) {
    const user = await User.findById(userId);
    if (user) {
      isUser = true;
      isOwner = post.author._id.toString() === user._id.toString(); // Is the author
      isLiked = post.likes.some((like) => like.equals(user.id)); // Check if the current user has liked the post
    }
  }

  if (!post) {
    return next(sendError(404, "post"));
  }

  // Check if the current user is the owner

  return res.status(200).json({
    message: "Post retrieved successfully",
    post: plainPost,
    isOwner,
    isUser,
    isLiked,
    likesCount: plainPost.likes.length, // Likes count
    commentsCount: plainPost.comments.length, // Comments count
  });
};

// Modify post
exports.updatePost = async (req, res, next) => {
  const user = await validateUser(req, next);
  const post = await validatePost(req, next);

  const { title, content, categories } = req.body; // Get updated post data

  // Ensure the logged-in user is the author of the post
  if (post.author.toString() !== user._id.toString()) {
    return next(sendError(403, "notAuthorized"));
  }

  // Fetch the categories by name
  const categoryDocs = await Category.find({
    name: { $in: categories }, // Look for categories where the name is in the categories array
  });

  if (categories) {
    if (categoryDocs.length !== categories.length) {
      return next(sendError(400, "invalidCategories"));
    }
    post.categories = categories;
  }

  // Update the post fields
  post.title = title || post.title;
  post.content = content || post.content;

  // Handle the image and video uploads if needed (similar to addPost)
  const image = req.files?.image;
  const video = req.files?.video;

  if (image) {
    const oldPublic_id = post.image.public_id;
    // Handle image upload (similar to addPost)
    const imageResult = await cloudinaryUpload(
      image[0].path,
      "postPicture",
      "image"
    );
    post.image.url = imageResult.url;
    post.image.public_id = imageResult.public_id;

    if (oldPublic_id !== process.env.DEFAULT_PROFILE_PICTURE_PUBLIC_ID) {
      await cloudinaryDelete(oldPublic_id); // Delete the old Picture
    }

    fs.unlinkSync(image[0].path);
  }

  if (video) {
    // Handle video upload (if a video file is present)
    const videoResult = await cloudinaryUpload(
      video[0].path,
      "postVideo",
      "video"
    );
    post.video.url = videoResult.url;
    post.video.public_id = videoResult.public_id;
    fs.unlinkSync(video[0].path);
  }

  // Save the updated post
  await post.save();

  return res.status(200).json({
    message: "Post updated successfully",
    post,
  });
};

// Like post
exports.likePost = async (req, res, next) => {
  const user = await validateUser(req, next);
  const post = await validatePost(req, next);

  if (post.likes.includes(user.id)) return next(sendError(400, "postIsLiked"));

  post.likes.push(user.id);
  user.likedPosts.push(post._id);
  await post.save();
  await user.save();

  res.status(200).json({
    message: "Post liked successfully",
    likesCount: post.likes.length,
    likedBy: post.likes,
  });
};

//  Unlike post
exports.unlikePost = async (req, res, next) => {
  const user = await validateUser(req, next);
  const post = await validatePost(req, next);

  if (!post.likes.includes(user.id))
    return next(sendError(400, "postIsUnLiked"));

  post.likes.pull(user.id);
  user.likedPosts.pull(post._id);

  await post.save();
  await user.save();

  res.status(200).json({
    message: "Post unliked successfully",
    likesCount: post.likes.length,
    likedBy: post.likes,
  });
};

// Add comment
exports.addComment = async (req, res, next) => {
  const user = await validateUser(req, next);
  const post = await validatePost(req, next);

  const { text } = req.body;

  const newComment = new Comment({
    text,
    postId: post._id,
    user: user._id,
  });

  // Add comment reference to post
  post.comments.push(newComment._id);
  await post.save();
  await newComment.save();

  res.status(200).json({
    message: "Comment added successfully",
    newComment,
  });
};

exports.removeComment = async (req, res, next) => {
  const user = await validateUser(req, next);
  const { postId, commentId } = req.params;

  // Validate ObjectIDs
  if (
    !mongoose.Types.ObjectId.isValid(postId) ||
    !mongoose.Types.ObjectId.isValid(commentId)
  ) {
    return next(sendError(400, "invalidId"));
  }

  // Find the post
  const post = await Post.findById(postId);
  if (!post) return next(sendError(404, "post"));

  // Find the comment
  const comment = await Comment.findById(commentId);
  if (!comment) return next(sendError(404, "comment"));

  // Ensure the comment belongs to the post
  if (!comment.postId.equals(post._id)) {
    return next(sendError(400, "commentIsNotInPost"));
  }

  // Ensure the user is authorized to delete their own comment
  if (!comment.user.equals(user.id)) {
    return next(sendError(403, "notCommentAuth"));
  }

  // Remove the comment reference from the post
  post.comments.pull(commentId);
  await post.save();

  // Delete the comment
  await Comment.findByIdAndDelete(commentId);

  res.status(200).json({
    message: "Comment deleted successfully",
  });
};

//Delete post
exports.deletePost = async (req, res, next) => {
  const user = await validateUser(req, next);
  const post = await validatePost(req, next);

  //if (post.video) await cloudinaryDelete(post.video.public_id);
  await cloudinaryDelete(post.image.public_id);

  // Remove the post reference from the user's likedPosts and posts
  user.likedPosts.pull(post._id);
  user.posts.pull(post._id);

  // Remove the post reference from the categories
  const categories = await Category.find({ _id: { $in: post.categories } });
  categories.forEach(async (category) => {
    category.posts.pull(post._id);
    await category.save();
  });

  // Delete all the comments related to the post
  await Comment.deleteMany({ postId: post._id });

  // Save user and post deletion
  await user.save();
  await Post.findByIdAndDelete(post._id);

  res.status(200).json({
    message: "Post deleted successfully",
  });
};

// Search for posts by title or content
exports.searchPosts = async (req, res, next) => {
  const { query } = req.query;

  if (!query) {
    return next(sendError(400, "searchQuery"));
  }

  const posts = await Post.find({
    $or: [
      { title: { $regex: query, $options: "i" } }, // Case-insensitive title search
      { content: { $regex: query, $options: "i" } }, // Case-insensitive content search
      {
        categories: {
          $in: await Category.find({
            name: { $regex: query, $options: "i" },
          }).distinct("_id"), // Matching category IDs
        },
      }, // Search by category name
    ],
  })
    .populate("author", "username profilePicture")
    .populate("categories", "name")
    .lean();

  if (posts.length === 0) {
    return next(sendError(404, "matchingPosts"));
  }

  return res.status(200).json({
    message: "Posts retrieved successfully",
    results: posts.length,
    posts,
  });
};
