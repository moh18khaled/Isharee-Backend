const User = require("../models/user");
const BusinessOwner = require("../models/businessOwner");
const Post = require("../models/post");
const Category = require("../models/category");
const Order = require("../models/order");
const Notification = require("../models/notification");
const mongoose = require("mongoose");
const sendError = require("../utils/sendError");
const sendVerificationLink = require("../utils/sendVerificationLink");
const generateAndSetTokens = require("../utils/generateAndSetTokens");
const clearCookies = require("../utils/clearCookies");
const singleDeviceLogout = require("../utils/singleDeviceLogout");
const cloudinaryDelete = require("../utils/cloudinaryDelete");
const validateUser = require("../utils/validateUser");
const generateJWT = require("../utils/generateJWT");
const verifyJWT = require("../utils/verifyJWT");
const validator = require("validator");
const sendEmail = require("../utils/sendEmail");
const createNotification = require("../utils/createNotification");

// Get signup data
exports.getSignupData = async (req, res, next) => {
  const categories = await Category.find({}, "name").lean(); // Fetch all categories (only name)

  return res.status(200).json({
    categories: categories.map((cat) => cat.name), // Send category names only
    heardAboutUs: [
      "LinkedIn",
      "Social Media",
      "Friend/Family",
      "Search Engine",
      "Advertisement",
      "Other",
    ],
    walletTypes: [
      "Vodafone Cash",
      "Etisalat Cash",
      "Orange Cash",
      "WE Pay",
      "Meeza",
      "Fawry Wallet",
      "BM Wallet",
      "CIB Smart Wallet",
      "Ahly Phone Cash",
      "QNB Mobile Wallet",
      "Alex Bank Mobile Wallet",
      "ADIB Wallet",
      "ValU",
    ],
  });
};

// User signup
exports.signup = async (req, res, next) => {
  const {
    email,
    password,
    username,
    age,
    walletNumber,
    walletTypes,
    interests,
    heardAboutUs,
  } = req.body;

  const oldUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  }).lean();

  if (oldUser) return next(sendError(409, "userExists"));

  // Validate heardAboutUs (must be within predefined values)
  /* const validSources = [
    "LinkedIn",
    "Social Media",
    "Friend/Family",
    "Search Engine",
    "Advertisement",
    "other",
  ];
  
  if (!validSources.includes(heardAboutUs)) {
    return next(sendError(400, "invalidHeardAboutUs"));
  }

  */
  const existingUser = await User.findOne({
    "eWallet.walletNumber": walletNumber,
  });
  if (walletNumber && existingUser) return next(sendError(400, "WalletNumber"));

  const newUser = new User({
    username,
    email,
    age,
    password, // Hashed automatically by the pre-save hook
    interests,
    heardAboutUs,
    eWallet: {
      walletNumber: walletNumber, // Allow nullable wallet number
      walletType: walletTypes, // Array of wallet types
    },
  });

  await newUser.save();

  await sendVerificationLink(email, newUser.id);

  return res.status(201).json({
    message: "User registered! Please verify your email.",
    data: {
      username,
      email,
      age,
      interests,
      heardAboutUs,
    },
  });
};

// Verify user's email
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query; // Get the token from the query parameter

    if (!token) return next(sendError(400, "noToken"));

    // Decode the JWT token and verify it
    const decoded = verifyJWT(token);

    const user = await User.findById(decoded.id); // Find the user by ID

    if (!user) return next(sendError(400, "invalidToken"));

    if (user.isVerified) return next(sendError(400, "alreadyVerified"));

    // Mark the user as verified
    user.isVerified = true;
    await user.save();

    res.status(200).json({ message: "Email verified successfully!" });
  } catch (err) {
    return next(sendError(400, "invalidToken"));
  }
};

exports.requestPasswordReset = async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (!user) return next(sendError(404, "user"));

  // Generate reset token

  const resetToken = await generateJWT({ id: user._id }, "1h");
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  // Send reset email
  await sendEmail(
    user.email,
    "Password Reset Request",
    `Click to reset: ${resetUrl}`
  );

  res.status(200).json({ message: "Password reset link sent" });
};

exports.confirmPasswordReset = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    // Verify token
    console.log(token, " ", newPassword);

    const decoded = verifyJWT(token); // Extracts { id }
    console.log(decoded);
    if (!decoded) return next(sendError(404, "token"));

    // Find user & update password
    const user = await User.findById(decoded.id);
    if (!user) return next(sendError(404, "user"));

    user.password = newPassword;
    await user.save();

    user.refreshTokens = [];
    clearCookies(res);

    res
      .status(200)
      .json({ message: "Password reset successful. Please log in again." });
  } catch (err) {
    return next(sendError(400, "invalidToken"));
  }
};

// User login
exports.login = async (req, res, next) => {
  const userId = req.user?.id;

  if (userId) {
    return res.status(200).json({
      message: "User is already logged in.",
    });
  }

  const { email, password } = req.body;

  if (!email || !password) return next(sendError(400, "missingFields"));

  const user = await User.findOne({ email });

  if (!user) return next(sendError(404, "user"));

  // Compare the password with the hashed password in the database
  const isMatch = await user.comparePassword(password);

  if (!isMatch) return next(sendError(401, "Invalidcardinalities"));

  if (!user.isVerified) return next(sendError(403, "verifyEmail"));

  // Generate and set tokens
  await generateAndSetTokens(user, res);

  return res.status(200).json({
    message: "User successfully logged In",
    data: {
      user: {
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture.url,
        role: user.role,
      },
    },
  });
};

// Get user's account
exports.getUserAccount = async (req, res, next) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) {
    return next(sendError(404, "user"));
  }

  const user = await User.findById(userId)
    .select("username email profilePicture.url")
    .lean();

  if (!user) return next(sendError(404, "user"));

  // Get counts separately using aggregation (better performance for large datasets)
  const [counts] = await User.aggregate([
    { $match: { _id: user._id } },
    {
      $project: {
        postsCount: { $size: "$posts" },
        likedPostsCount: { $size: "$likedPosts" },
        followingCount: { $size: "$following" },
        followersCount: { $size: "$followers" },
      },
    },
  ]);

  // If the user is a BusinessOwner, fetch mentionedPosts
  let mentionedPosts = [];
  if (userRole === "businessOwner") {
    const businessOwner = await BusinessOwner.findOne({ user_id: userId })
      .populate({
        path: "mentionedPosts",
        select: "title image.url", // Only get title and image URL
      })
      .lean();

    if (businessOwner) {
      mentionedPosts = businessOwner.mentionedPosts;
    }
  }

  return res.status(200).json({
    success: true,
    data: {
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture?.url,
      role: userRole,
      postsCount: counts?.postsCount || 0,
      likedPostsCount: counts?.likedPostsCount || 0,
      followingCount: counts?.followingCount || 0,
      followersCount: counts?.followersCount || 0,
      mentionedPosts,
    },
  });
};

// Modify user's data
exports.updateAccount = async (req, res, next) => {
  const { username, profilePictureUrl, profilePicturePublic_id } = req.body;
  const user = await validateUser(req, next);

  // Check for duplicate username only if a new username is provided
  if (username && username.toLowerCase() !== user.username) {
    const duplicateUser = await User.findOne({
      username: username.toLowerCase(),
    });
    if (duplicateUser) {
      return next(sendError(400, "usernamealreadyTaken"));
    }
    user.username = username.toLowerCase();
  }

  // Update profilePicture
  if (profilePictureUrl && profilePicturePublic_id) {
    const oldPublic_id = user.profilePicture.public_id;

    // Update user with the new profile picture info
    user.profilePicture.url = profilePictureUrl;
    user.profilePicture.public_id = profilePicturePublic_id;

    if (oldPublic_id !== process.env.DEFAULT_PROFILE_PICTURE_PUBLIC_ID) {
      await cloudinaryDelete(oldPublic_id); // Delete the old Picture
    }
  }

  await user.save();
  return res.status(200).json({
    message: "Account successfully updated",
    data: {
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
    },
  });
};

// Modify user's Password
exports.changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.id;

  if (!userId) return next(sendError(404, "user"));

  const session = await mongoose.startSession();
  session.startTransaction();
  const user = await User.findById(userId).session(session);
  if (!user) {
    await session.abortTransaction();
    session.endSession();
    return next(sendError(404, "user"));
  }

  // Check if the current password is correct
  // Compare the password with the hashed password in the database
  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    await session.abortTransaction();
    session.endSession();
    return next(sendError(401, "CurrentPassword"));
  }

  // Update the password
  user.password = newPassword; // The pre("save") hook will hash this password

  // Clear all refresh tokens
  user.refreshTokens = [];

  // Save the user (this will trigger schema validation and password hashing)
  await user.save({ session });

  // Commit the transaction
  await session.commitTransaction();
  session.endSession();

  clearCookies(res);

  return res.status(200).json({
    message: "Password updated, please log in again.",
  });
};

// Delete user's account
exports.deleteAccount = async (req, res, next) => {
  const user = await validateUser(req, next);

  const session = await mongoose.startSession();
  session.startTransaction();

  const public_id = user.profilePicture.public_id;
  const defaultPicturePublicId = process.env.DEFAULT_PROFILE_PICTURE_PUBLIC_ID;

  // If the user has a profile photo and it's not the default one, delete it from the filesystem

  if (public_id !== defaultPicturePublicId) {
    await cloudinaryDelete(public_id); // Delete the old Picture
  }

  // If the user is a business owner, delete the associated BusinessOwner document
  if (user.role === "businessOwner") {
    const businessOwner = await BusinessOwner.findOneAndDelete(
      { user_id: user._id },
      { session }
    );
    if (businessOwner) {
      await Order.deleteMany({ businessOwner: businessOwner._id }, { session });
    }
  }

  // Remove user from other users' followers & following lists
  await Promise.all([
    User.updateMany(
      { following: user._id },
      { $pull: { following: user._id } },
      { session }
    ),
    User.updateMany(
      { followers: user._id },
      { $pull: { followers: user._id } },
      { session }
    ),
  ]);
  /*
    to be discussed !!!!!

  // Remove likes & comments made by the user
  await Promise.all([
    Post.updateMany(
      { likes: user._id },
      { $pull: { likes: user._id } },
      { session }
    ),
    Post.updateMany(
      { comments: user._id },
      { $pull: { comments: user._id } },
      { session }
    ),
    Comment.deleteMany({ author: user._id }, { session }), // Delete all comments made by the user
  ]);

  // Get all posts created by the user
  const userPosts = await Post.find({ author: user._id }, { _id: 1 }).lean();

  // Remove post reference from Categories
  await Category.updateMany(
    { _id: { $in: userPosts.categories } },
    { $pull: { posts: userPosts._id } },
    { session }
  );

  // Delete the user's posts
  await Post.deleteMany({ author: user._id }, { session });

  // Remove businessOwner's mentionedPosts if they exist
  await BusinessOwner.updateMany(
    { mentionedPosts: { $in: userPosts.map((post) => post._id) } },
    { $pull: { mentionedPosts: { $in: userPosts.map((post) => post._id) } } },
    { session }
  );

*/
  // Delete notifications related to the user
  await Notification.deleteMany({ userId: user._id }, { session });

  await User.findByIdAndDelete(user._id, { session });

  // Commit transaction
  await session.commitTransaction();
  session.endSession();

  // Clear authentication cookies
  clearCookies(res);

  return res.status(200).json({
    message: "Account successfully deleted",
  });
};

// User logout
exports.logout = async (req, res, next) => {
  const user = await validateUser(req, next);

  const refreshToken = req.cookies.refresh_token;

  // Remove the refresh tokens from the user's array
  await singleDeviceLogout(refreshToken, user);

  // Clear authentication cookies
  clearCookies(res);

  return res.status(200).json({
    message: "Successfully logged out",
  });
};

// Post section

// user's posts (form his account)
exports.getPosts = async (req, res, next) => {
  const user = await validateUser(req, next);

  // Populate the 'uploadedPosts' array with the actual Post documents
  const posts = await Post.find({ _id: { $in: user.posts } }).sort({
    createdAt: -1,
  }); // Sort by latest createdAt (descending)
  if (posts.length === 0) {
    return res.status(200).json({
      message: "No posts found for this user.",
      posts: [],
    });
  }

  return res.status(200).json({
    message: "User's posts retrieved successfully",
    posts,
  });
};

// Get liked Posts
exports.getLikedPosts = async (req, res, next) => {
  const user = await validateUser(req, next);

  // Populate the 'likedPosts' array with the actual Post documents
  const likedPosts = await Post.find({ _id: { $in: user.likedPosts } }).sort({
    createdAt: -1,
  }); // Sort by latest createdAt (descending)
  if (likedPosts.length === 0) {
    return res.status(200).json({
      message: "User has not liked any posts.",
      posts: [],
    });
  }

  return res.status(200).json({
    message: "User's liked posts retrieved successfully",
    posts: likedPosts,
  });
};

// Followers - following section
exports.getFollowers = async (req, res, next) => {
  const user = await validateUser(req, next);

  if (user.followers.length === 0) {
    return res.status(200).json({
      message: "No follower found for this user.",
      followers: [],
    });
  }

  const followers = await User.find({ _id: { $in: user.followers } })
    .select("username profilePicture")
    .lean();

  return res.status(200).json({
    message: "User's followers retrieved successfully",
    followers,
  });
};

exports.getFollowing = async (req, res, next) => {
  const user = await validateUser(req, next);

  if (user.following.length === 0) {
    return res.status(200).json({
      message: "No following found for this user.",
      following: [],
    });
  }

  const following = await User.find({ _id: { $in: user.following } })
    .select("username profilePicture")
    .lean();

  return res.status(200).json({
    message: "User's following retrieved successfully",
    following,
  });
};

// Follow/Unfollow user
exports.toggleFollow = async (req, res, next) => {
  const user = await validateUser(req, next);
  const targetUserId = req.params.id;

  if (user._id.toString() === targetUserId)
    return next(sendError(400, "cannotMake"));

  if (!mongoose.Types.ObjectId.isValid(targetUserId))
    return next(sendError(400, "invalidUserId"));

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) return next(sendError(404, "user"));

  const isFollowing = user.following.includes(targetUserId);

  if (isFollowing) {
    // Unfollow
    user.following.pull(targetUserId);
    targetUser.followers.pull(user._id);
  } else {
    // Follow
    user.following.push(targetUserId);
    targetUser.followers.push(user._id);
  }

  await Promise.all([user.save(), targetUser.save()]);

  res.status(200).json({
    message: isFollowing ? "Unfollowed successfully" : "Followed successfully",
    followingCount: user.following.length,
    followersCount: targetUser.followers.length,
  });
};

// Get other user account
exports.getOtherUserAccount = async (req, res, next) => {
  const userId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(userId))
    return next(sendError(400, "invalidUserId"));

  if (!userId) {
    return next(sendError(404, "user"));
  }

  const user = await User.findById(userId)
    .select("username profilePicture.url role subscriptionActive")
    .lean();

  if (!user) return next(sendError(404, "user"));

  const [counts] = await User.aggregate([
    { $match: { _id: user._id } },
    {
      $project: {
        postsCount: { $size: "$posts" },
        likedPostsCount: { $size: "$likedPosts" },
        followingCount: { $size: "$following" },
        followersCount: { $size: "$followers" },
      },
    },
  ]);

  let mentionedPosts = [];
  if (user.role === "businessOwner") {
    const businessOwner = await BusinessOwner.findOne({ user_id: userId })
      .populate({
        path: "mentionedPosts",
        select: "title image.url", // Only get title and image URL
      })
      .lean();

    if (businessOwner) {
      mentionedPosts = businessOwner.mentionedPosts;
    }
  }

  // Prepare response
  const responseData = {
    username: user.username,
    profilePicture: user.profilePicture?.url,
    role: user.role,
    subscriptionActive: user.subscriptionActive,
    postsCount: counts?.postsCount || 0,
    likedPostsCount: counts?.likedPostsCount || 0,
    followingCount: counts?.followingCount || 0,
    followersCount: counts?.followersCount || 0,
    mentionedPosts,
  };

  // If BusinessOwner and subscription is active, fetch mentionedPosts in the same query
  if (user.role === "BusinessOwner" && user.subscriptionActive) {
    const businessOwner = await BusinessOwner.findById(userId)
      .select("mentionedPosts")
      .populate("mentionedPosts", "title content image.url")
      .lean();

    responseData.mentionedPosts = businessOwner?.mentionedPosts || [];
  }

  return res.status(200).json({ success: true, data: responseData });
};

// Contact support (send email)
exports.contactSupport = async (req, res, next) => {
  const { name, email, subject, message } = req.body;

  if (!validator.isEmail(email)) return next(sendError(400, "InvalidEmail"));

  const emailContent = `
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
    `;

  await sendEmail(
    process.env.SUPPORT_EMAIL,
    `Support Request: ${subject}`,
    message,
    emailContent
  );

  res.status(201).json({ message: "Your message has been sent successfully." });
};

// Notifications section
exports.getNotifications = async (req, res, next) => {
  const user = await validateUser(req, next);

  // Find notifications for the user
  const notifications = await Notification.find({ userId: user._id }).sort({
    createdAt: -1,
  }); // Sort by most recent

  return res.status(200).json({
    message: "Notifications retrieved successfully",
    notifications,
  });
};

// Mark notification as read
exports.markAsRead = async (req, res, next) => {
  const { notificationId } = req.params;

  // Find notification and mark as read
  const notification = await Notification.findByIdAndUpdate(
    notificationId,
    { isRead: true },
    { new: true } // Return the updated notification
  );

  if (!notification) {
    return next(sendError(404, "notification"));
  }

  return res.status(200).json({
    message: "Notification marked as read",
    notification,
  });
};

// Get Other User - section
exports.getOtherUserFollowers = async (req, res, next) => {
  const currentUserId = req.user?.id;
  const userId = req.params.id;

  const user = await User.findById(userId).select("followers").lean();
  if (!user) return next(sendError(404, "User not found"));

  if (user.followers.length === 0) {
    return res.status(200).json({
      message: "No followers found for this user.",
      followers: [],
    });
  }

  // Fetch followers' info in a single query
  const followers = await User.find({ _id: { $in: user.followers } })
    .select("username profilePicture")
    .lean();

  let followingSet = new Set();

  if (currentUserId) {
    const currentUser = await User.findById(currentUserId)
      .select("following")
      .lean();
    if (currentUser?.following?.length) {
      followingSet = new Set(currentUser.following.map((id) => id.toString()));
    }
  }

  // Map followers and add isCurrentUser & isFollowed
  const updatedFollowers = followers.map((follower) => ({
    ...follower,
    isCurrentUser: currentUserId
      ? follower._id.toString() === currentUserId
      : false,
    isFollowed: followingSet.has(follower._id.toString()),
  }));

  return res.status(200).json({
    message: "User's followers retrieved successfully",
    followers: updatedFollowers,
  });
};

exports.getOtherUserFollowing = async (req, res, next) => {
  const currentUserId = req.user?.id;
  const userId = req.params.id;

  const user = await User.findById(userId).select("following").lean();
  if (!user) return next(sendError(404, "User not found"));

  if (user.following.length === 0) {
    return res.status(200).json({
      message: "No following found for this user.",
      following: [],
    });
  }

  // Fetch following users' info in a single query
  const following = await User.find({ _id: { $in: user.following } })
    .select("username profilePicture")
    .lean();

  let followersSet = new Set();

  if (currentUserId) {
    // Fetch logged-in user's followers list
    const currentUser = await User.findById(currentUserId)
      .select("followers")
      .lean();

    if (currentUser?.followers?.length) {
      followersSet = new Set(currentUser.followers.map((id) => id.toString()));
    }
  }

  // Map following and add isCurrentUser & isFollowedByMe
  const updatedFollowing = following.map((followedUser) => ({
    ...followedUser,
    isCurrentUser: currentUserId
      ? followedUser._id.toString() === currentUserId
      : false,
    isFollowedByMe: followersSet.has(followedUser._id.toString()),
  }));

  return res.status(200).json({
    message: "User's following retrieved successfully",
    following: updatedFollowing,
  });
};

exports.getOtherUserPosts = async (req, res, next) => {
  const userId = req.params.id;

  const user = await User.findById(userId);
  if (!user) return next(sendError(404, "user"));

  const posts = await Post.find({ _id: { $in: user.posts } }).sort({
    createdAt: -1,
  }); // Sort by latest createdAt (descending)

  if (posts.length === 0) {
    return res.status(200).json({
      message: "No posts found for this user.",
      posts: [],
    });
  }

  return res.status(200).json({
    message: "User's posts retrieved successfully",
    posts,
  });
};

exports.getOtherUserLikedPosts = async (req, res, next) => {
  const userId = req.params.id;

  const user = await User.findById(userId);
  if (!user) return next(sendError(404, "user"));
  console.log(user.likedPosts);
  const likedPosts = await Post.find({ _id: { $in: user.likedPosts } }).sort({
    createdAt: -1,
  }); // Sort by latest createdAt (descending)
  if (likedPosts.length === 0) {
    return res.status(200).json({
      message: "User has not liked any posts.",
      posts: [],
    });
  }

  return res.status(200).json({
    message: "User's liked posts retrieved successfully",
    posts: likedPosts,
  });
};
