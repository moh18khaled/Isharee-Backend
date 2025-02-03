const User = require("../models/user");
const BusinessOwner = require("../models/businessOwner");
const Post = require("../models/post");
const Category = require("../models/category");
const Notification = require("../models/notification");
const mongoose = require("mongoose");
const sendError = require("../utils/sendError");
const generateAndSetTokens = require("../utils/generateAndSetTokens");
const clearCookies = require("../utils/clearCookies");
const singleDeviceLogout = require("../utils/singleDeviceLogout");
const path = require("path");
const bcrypt = require("bcrypt");
const cloudinaryUpload = require("../utils/cloudinaryUpload");
const cloudinaryDelete = require("../utils/cloudinaryDelete");
const validateUser = require("../utils/validateUser");
const generateJWT = require("../utils/generateJWT");
const verifyJWT = require("../utils/verifyJWT");
const fs = require("fs");
const sendEmail = require("../utils/sendEmail");
const createNotification = require("../utils/createNotification");


// User signup
exports.signup = async (req, res, next) => {
  const { email, password, username, age } = req.body;

  const oldUser = await User.findOne({
    $or: [{ email: email }, { username: username }],
  });

  if (oldUser) return next(sendError(409, "userExists"));

  const newUser = new User({
    username,
    email,
    age,
    password, // Hashed automatically by the pre-save hook
  });

  await newUser.save();

  const verificationToken = await generateJWT({ id: newUser.id }, "1h");

  const verificationLink = `${process.env.LOCAL_URL}/user/verify-email?token=${verificationToken}`;

  await sendEmail(
    email,
    "Verify Your Email",
    `Click the link to verify your email: ${verificationLink}`,
    `<p>Click <a href="${verificationLink}">here</a> to verify your email.</p>`
  );

  return res.status(201).json({
    message: "User registered! Please verify your email.",
    data: {
      username,
      email,
      age,
      password,
    },
  });
};

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
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profilePicture: user.profilePicture,
      },
    },
  });
};

// Get user's data
exports.getAccountData = async (req, res, next) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) {
    return next(sendError(404, "user"));
  }

  const user = await User.findById(userId).select(
    "username email profilePicture"
  );

  if (!user) return next(sendError(404, "user"));

  return res.status(200).json({
    data: {
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      role: userRole,
    },
  });
};

// Modify user's data
exports.updateAccount = async (req, res, next) => {
  const { username, email } = req.body;
  const user = await validateUser(req, next);

  const duplicateUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  // Validate uniqueness
  if (duplicateUser && duplicateUser.id !== userId) {
    if (duplicateUser.email === email || duplicateUser.username === username)
      return next(sendError(409, "userExists"));
  }

  // Update email if provided
  if (email) user.email = email;

  // Update username if provided
  if (username) user.username = username;

  // Update profilePicture
  if (req.file) {
    const oldPublic_id = user.profilePicture.public_id;
    const path = req.file.path;
    const result = await cloudinaryUpload(path, "profilePicture", "image");

    // Update user with the new profile picture info
    user.profilePicture.url = result.url;
    user.profilePicture.public_id = result.public_id;

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
    if (!user) return next(sendError(404, "user"));
  }

  // Check if the current password is correct
  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    await session.abortTransaction();
    session.endSession();
    return next(sendError(401, "Current password is incorrect."));
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

  const public_id = user.profilePicture.public_id;
  const defaultPicturePublicId = process.env.DEFAULT_PROFILE_PICTURE_PUBLIC_ID;

  // If the user has a profile photo and it's not the default one, delete it from the filesystem

  if (public_id !== defaultPicturePublicId) {
    await cloudinaryDelete(public_id); // Delete the old Picture
  }

  // If the user is a business owner, delete the associated BusinessOwner document
  if (user.role === "businessOwner") {
    await BusinessOwner.findOneAndDelete({ user_id: user._id });
  }

  // Clear authentication cookies
  clearCookies(res);

  // Remove user from other users' followers & following lists
  await User.updateMany(
    { following: user._id },
    { $pull: { following: user._id } }
  );

  await User.updateMany(
    { followers: user._id },
    { $pull: { followers: user._id } }
  );

  // Deleting likes and comments related to the user
  await Post.updateMany(
    { likes: user._id },
    { $pull: { likes: user._id } } // Remove likes from the posts
  );

  await Post.updateMany(
    { comments: user._id },
    { $pull: { comments: user._id } } // Remove comments from the posts
  );

  await Notification.deleteMany({ userId: user._id });
  await Post.deleteMany({ author: user._id });

  await User.findByIdAndDelete(user._id);

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

// Follow a user
exports.followUser = async (req, res, next) => {
  const user = await validateUser(req, next);
  const targetUserId = req.params.id; // User to follow
  console.log(user._id.toString(), " ", targetUserId);
  if (user._id.toString() === targetUserId)
    return next(sendError(400, "cannotFollowSelf"));

  if (!mongoose.Types.ObjectId.isValid(targetUserId))
    return next(sendError(400, "invalidUserId"));

  const targetUser = await User.findById(targetUserId);

  if (!targetUser) return next(sendError(404, "user"));

  if (user.following.includes(targetUserId))
    return next(sendError(400, "alreadyFollowing"));

  user.following.push(targetUserId);
  targetUser.followers.push(user._id);
  await Promise.all([user.save(), targetUser.save()]);

/*
  const notificationMessage = "You have got a new follower";
  await createNotification(user._id, notificationMessage);
*/



  res.status(200).json({ message: "Followed successfully" });
};

// UnFollow a user
exports.unFollowUser = async (req, res, next) => {
  const user = await validateUser(req, next);
  const targetUserId = req.params.id; // User to follow

  if (user._id.toString() === targetUserId)
    return next(sendError(400, "cannotUnfollowSelf"));

  if (!mongoose.Types.ObjectId.isValid(targetUserId))
    return next(sendError(400, "invalidUserId"));

  const targetUser = await User.findById(targetUserId);

  if (!targetUser) return next(sendError(404, "user"));

  if (!user.following.includes(targetUserId))
    return next(sendError(400, "alreadyNotFollowing"));

  user.following = user.following.filter(
    (id) => id.toString() !== targetUserId
  );
  targetUser.followers = targetUser.followers.filter(
    (id) => id.toString() !== user._id.toString()
  );

  await Promise.all([user.save(), targetUser.save()]);

  res.status(200).json({ message: "UnFollowed successfully" });
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


//


// Notifications section
exports.getNotifications = async (req, res, next) => {
    const user = await validateUser(req, next);

    // Find notifications for the user
    const notifications = await Notification.find({ userId: user._id  })
      .sort({ createdAt: -1 }) // Sort by most recent

    return res.status(200).json({
      message: 'Notifications retrieved successfully',
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
      return next(sendError(404, 'notification'));
    }

    return res.status(200).json({
      message: 'Notification marked as read',
      notification,
    });

};
