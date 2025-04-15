const mongoose = require("mongoose");
const Post = require("../models/post");
const User = require("../models/user");
const Category = require("../models/category");
const Comment = require("../models/comments");
const BusinessOwner = require("../models/businessOwner");
const fs = require("fs");
const sendError = require("../utils/sendError");
const validateUser = require("../utils/validateUser");
const validatePost = require("../utils/validatePost");
const cloudinaryUpload = require("../utils/cloudinaryUpload");
const cloudinaryDelete = require("../utils/cloudinaryDelete");

// Add new post
exports.addPost = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  const user = await validateUser(req, next);
  const userRole = req.user?.role;

  if (req.user?.role === "businessOwner") {
    await session.abortTransaction();
    session.endSession();
    return next(sendError(403, "isBusinessOwner"));
  }
  const {
    title,
    content,
    imageUrl,
    imagePublicId,
    videoUrl,
    videoPublicId,
    thumbnailUrl,
    thumbnailPublicId,
    businessName,
    rating,
    categories,
  } = req.body;

  let image = imageUrl ? { url: imageUrl, public_id: imagePublicId } : null;
  const video = videoUrl ? { url: videoUrl, public_id: videoPublicId } : null;
  let thumbnail = thumbnailUrl
    ? { url: thumbnailUrl, public_id: thumbnailPublicId }
    : null;

  if (!image && !video) {    await session.abortTransaction();
    session.endSession();
    return next(sendError(400, "imageOrVideo"));
  }
  if (video && !image && !thumbnail){    await session.abortTransaction();
    session.endSession();
    return next(sendError(400, "imageOrThumbnail"));
  }
  if (image && thumbnail) {
    await cloudinaryDelete(thumbnailPublicId);
    thumbnail = null;
  }

  if (!image) {
    image = {
      url: "thumbnail." + thumbnail.url,
      public_id: thumbnail.public_id,
    };
    thumbnail = null;
  } 

  const businessOwner = await BusinessOwner.findOne({
    businessName: { $regex: businessName, $options: "i" },
  }).session(session);

  // Fetch categories from DB to ensure valid references
  const categoryDocs = await Category.find({ name: { $in: categories } }).session(session);

  // Create the post
  const post = new Post({
    title,
    author: user._id,
    content,
    image,
    ...(video && { video }), // Add video only if it exists
    businessOwner: businessOwner?.id || null,
    categories: categoryDocs.map((cat) => cat._id),
    rating,
  });
  console.log(post);
  /* 
    in last version: 

    categories: categories.map((cat) => cat._id), // Link categories from BusinessOwner


    if (!businessOwner) {
    return next(sendError(404, "BusinessName"));
  }

  */

  // Save the post and update user data in parallel

  user.posts.push(post._id);
  if (businessOwner) businessOwner.mentionedPosts.push(post._id);

  // Add post to each category
  categoryDocs.forEach((category) => category.posts.push(post._id));

  await Promise.all([
    post.save({ session }),
    user.save({ session }),
    ...(businessOwner ? [businessOwner.save({ session })] : []),
    ...categoryDocs.map((category) => category.save({ session })),
  ]);

  await session.commitTransaction();
  session.endSession();

  return res.status(200).json({
    message: "Post added successfully",
    data: {
      author: user._id,
      content,
      image,
      video: video || null,
      categories: categoryDocs.map((cat) => cat.name), // Return category names
      rating,
    },
  });
};

// Get posts about user's interests (home page)
exports.getPostsByInterests = async (req, res, next) => {
  const userId = req.user?.id;

  if (!userId) return next(sendError(404, "user"));

  // Find user and get their interests
  const user = await User.findById(userId).select("interests").lean();
  if (!user) return next(sendError(404, "user"));

  // Find categories matching user's interests
  const categories = await Category.find({ name: { $in: user.interests } })
    .select("_id")
    .lean();
  const categoryIds = categories.map((cat) => cat._id);

  // Find posts matching those categories
  const posts = await Post.find({ categories: { $in: categoryIds } })
    .populate("author", "username profilePicture.url") // Fetch user details
    .populate({
      path: "businessOwner",
      select: "businessName username profilePicture.url",
    }) // Fetch business details
    .lean();

  return res.status(200).json({
    success: true,
    data: posts,
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
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return next(sendError(400, "invalidPostId"));

    const post = await Post.findById(id)
      .populate("author", "username profilePicture")
      .populate("comments", "user text createdAt")
      .populate({
        path: "businessOwner",
        select: "user_id businessName", // Include businessName directly
        populate: {
          path: "user_id",
          select: "businessName profilePicture",
        },
      });
console.log(post);

// Fetch the category documents from the Category collection
const categoryDocs = await Category.find({
  '_id': { $in: post.categories }  // Match categories by their ObjectId
});

// Map the category documents to an array of category names
const catNames = categoryDocs.map((category) => category.name);
console.log(catNames);


    if (!post) return next(sendError(404, "post"));

    const plainPost = post.toObject();

    let isOwner = false;
    let isLiked = false;

    if (userId) {
      // Fetch user with following list in a single query
      const user = await User.findById(userId).select("following").lean();
      if (user) {
        isOwner = post.author?._id.toString() === userId.toString();
        isLiked = post.likes.some((like) => like.equals(userId));

        // Mark post as viewed
        await Post.updateOne(
          { _id: post._id },
          { $addToSet: { viewedBy: userId } }
        );
      }
    }

    // Add `isCurrentUser` and `isFollowed` to author
    plainPost.author = {
      ...plainPost.author,
      isCurrentUser: userId
        ? plainPost.author?._id.toString() === userId
        : false,
    };

    // Add `isCurrentUser` and `isFollowed` to the business owner (if available)
    if (plainPost.businessOwner?.user_id) {
      plainPost.businessOwner.user_id = {
        ...plainPost.businessOwner.user_id,
        isCurrentUser: userId
          ? plainPost.businessOwner.user_id._id.toString() === userId
          : false,
      };
    }

    // Add `isCurrentUser` and `isFollowed` to each comment user
    plainPost.comments = plainPost.comments.map((comment) => ({
      ...comment,
      user: {
        ...comment.user,
        isCurrentUser: userId ? comment.user._id.toString() === userId : false,
      },
    }));
    plainPost.categories = catNames;
     
    return res.status(200).json({
      message: "Post retrieved successfully",
      post: plainPost,
      isOwner,
      isLiked, 
      likesCount: plainPost.likes.length,
      commentsCount: plainPost.comments.length,
    });
  } catch (error) {
    next(error);
  }
};

// Get comments for a specific post
exports.getPostComments = async (req, res, next) => {
  const userId = req.user?.id;
  const { id } = req.params;

  // Check if the post ID is valid
  if (!mongoose.Types.ObjectId.isValid(id))
    return next(sendError(400, "invalidPostId"));

  let comments = await Comment.find({ postId: id })
    .populate("user", "username profilePicture")
    .sort({ createdAt: -1 }); // Latest comments first

  let followingSet = new Set();
  const userIdString = userId?.toString() || null;

  // If user is logged in, fetch their following list
  if (userIdString) {
    const user = await User.findById(userIdString).select("following").lean();
    if (user?.following) {
      followingSet = new Set(user.following.map((id) => id.toString()));
    }
  }

  comments = comments.map((comment) => {
    const commentUserId = comment.user?._id?.toString() || null;
    return {
      ...comment,
      user: {
        ...comment.user,
        isCurrentUser: commentUserId === userIdString,
        isFollowed: followingSet.has(commentUserId),
      },
    };
  });

  res.status(200).json({
    message: "Comments retrieved successfully",
    comments,
  });
};

exports.addPurchaseIntent = async (req, res, next) => {
  const userId = req.user?.id;
  const { id } = req.params; // Post ID
  const { intent } = req.body; // "yes" or "no"

  if (!mongoose.Types.ObjectId.isValid(id))
    return next(sendError(400, "invalidPostId"));

  const post = await Post.findById(id);
  if (!post) return next(sendError(404, "post"));

  // Ensure the user has not already registered intent
  if (post.purchaseIntent.some((p) => p.user.toString() === userId)) {
    return next(sendError(400, "alreadyRegisteredYourIntent"));
  }

  // Add user intent
  post.purchaseIntent.push({ user: userId, intent });

  // Save post with new intent & updated conversion rate in one operation
  await post.save();

  return res.status(200).json({
    message: "Purchase intent recorded",
    purchaseIntent,
  });
};

// Modify post
exports.updatePost = async (req, res, next) => {
  const user = await validateUser(req, next);
  const post = await validatePost(req, next);
console.log(req.body);
  const {
    title,
    content,
    imageUrl,
    imagePublicId,
    videoUrl,
    videoPublicId,
    thumbnailUrl,
    thumbnailPublicId,
    categories,
  } = req.body; // Get updated post data

  // Ensure the logged-in user is the author of the post
  if (post.author.toString() !== user._id.toString()) {
    return next(sendError(403, "notAuthorized"));
  }

  let image = imageUrl ? { url: imageUrl, public_id: imagePublicId } : null;
  const video = videoUrl ? { url: videoUrl, public_id: videoPublicId } : null;
  let thumbnail = thumbnailUrl
    ? { url: thumbnailUrl, public_id: thumbnailPublicId }
    : null;


  if (!image && !video) { 
    return next(sendError(400, "imageOrVideo"));
  }
  if (video && !image && !thumbnail){   
    return next(sendError(400, "imageOrThumbnail"));
  }
  if (image && thumbnail) {
    await cloudinaryDelete(thumbnailPublicId);
    thumbnail = null;
  }





  // Fetch the categories by name
  const categoryDocs = await Category.find({
    name: { $in: categories }, // Look for categories where the name is in the categories array
  });

  if (categories) {
    if (categoryDocs.length !== categories.length) {
      return next(sendError(400, "invalidCategories"));
    }
  }

  post.categories = categoryDocs.map((category) => category._id);


  // Update the post fields
  post.title = title || post.title;
  post.content = content || post.content;

  // Handle the image and video uploads if needed (similar to addPost)

  if (imageUrl && imagePublicId) {
    const oldPublic_id = post.image.public_id;

    post.image.url = imageUrl;
    post.image.public_id = imagePublicId;

    if (oldPublic_id !== process.env.DEFAULT_PROFILE_PICTURE_PUBLIC_ID) {
      await cloudinaryDelete(oldPublic_id);
    }
  }

  if (videoUrl && videoPublicId) {
    const oldPublic_id = post.video.public_id;

    post.video.url = videoUrl;
    post.video.public_id = videoPublicId;
    await cloudinaryDelete(oldPublic_id);
  }

  // Save the updated post
  await post.save();

  return res.status(200).json({
    message: "Post updated successfully",
    post,
  });
};

// Like/Unlike post
exports.toggleLike = async (req, res, next) => {
  const user = await validateUser(req, next);
  const post = await validatePost(req, next);

  const alreadyLiked = post.likes.includes(user.id);

  if (alreadyLiked) { 
    // Unlike post
    post.likes.pull(user.id);
    user.likedPosts.pull(post._id);
  } else {
    // Like post
    post.likes.push(user.id);
    user.likedPosts.push(post._id);
  }

  await post.save();
  await user.save();

  res.status(200).json({
    message: alreadyLiked
      ? "Post unliked successfully"
      : "Post liked successfully",
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

  // Start a MongoDB transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  if (post.video.public_id) await cloudinaryDelete(post.video.public_id);
  if (post.image.public_id) await cloudinaryDelete(post.image.public_id);

  // Remove the post reference from the user's likedPosts and posts
  await User.updateMany(
    { likedPosts: post._id },
    { $pull: { likedPosts: post._id } },
    { session } // Added session
  );
  user.posts.pull(post._id);
  await user.save({ session });

  // Remove post reference from Categories
  await Category.updateMany(
    { _id: { $in: post.categories } },
    { $pull: { posts: post._id } },
    { session }
  );

  // Remove the post reference from BusinessOwner's mentionedPosts
  await BusinessOwner.updateMany(
    { mentionedPosts: post._id },
    { $pull: { mentionedPosts: post._id } },
    { session }
  );

  // Delete all the comments related to the post
  await Comment.deleteMany({ postId: post._id }, { session });

  // Delete the post
  await Post.findByIdAndDelete(post._id, { session });

  // Commit the transaction
  await session.commitTransaction();
  session.endSession();

  res.status(200).json({
    message: "Post deleted successfully",
  });
};

// Search for posts by title or content
exports.searchPosts = async (req, res, next) => {
  const { query, categoryNames } = req.query; // Expect categoryNames instead of categoryIds

  if (!query && !categoryNames) {
    return next(sendError(400, "searchQuery"));
  }

  let categoryIds = [];
  let finalFilter = {};

  // Convert category names to IDs if categoryNames exist
  if (categoryNames) {
    categoryIds = await Category.find({
      name: { $in: categoryNames.split(",") },
    }).distinct("_id");
  }

  if (query && categoryNames) {
    finalFilter = {
      $and: [
        { categories: { $in: categoryIds } }, // Category filter
        {
          $or: [
            { title: { $regex: query, $options: "i" } },
            { content: { $regex: query, $options: "i" } },
          ],
        },
      ],
    };
  } else if (query) {
    finalFilter = {
      $or: [
        { title: { $regex: query, $options: "i" } },
        { content: { $regex: query, $options: "i" } },
      ],
    };
  } else if (categoryNames) {
    finalFilter = { categories: { $in: categoryIds } };
  }

  const posts = await Post.find(finalFilter)
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
