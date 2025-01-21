const User = require("../models/user");
const BusinessOwner = require("../models/businessOwner");
const sendError = require("../utils/sendError");
const generateAndSetTokens = require("../utils/generateAndSetTokens");
const clearCookies = require("../utils/clearCookies");
const singleDeviceLogout = require("../utils/singleDeviceLogout");
const deleteProfilePicture = require("../utils/deleteProfilePicture");
const path = require("path");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

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

  // Generate and set tokens
  await generateAndSetTokens(newUser, res);

  return res.status(201).json({
    message: "User successfully registered",
    data: {
      username,
      email,
      age,
      password,
    },
  });
};

// User login
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) return next(sendError(400, "missingFields"));

  const user = await User.findOne({ email });

  if (!user) return next(sendError(404, "user"));

  // Compare the password with the hashed password in the database
  const isMatch = await user.comparePassword(password);

  if (!isMatch) return next(sendError(401, "Invalidcardinalities"));

  if (req.loggedin)
    return res.status(200).json({
      message: "User is already logged in.",
    });

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
    },
  });
};

// Modify user's data
exports.updateAccount = async (req, res, next) => {
  const { username, email } = req.body;
  const userId = req.user?.id;

  if (!userId) return next(sendError(404, "user"));
  const user = await User.findById(userId);

  if (!user) return next(sendError(404, "user"));

  console.log(email, " ", username, "   ", req.file, "\n");
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

  if (req.file) {
    const newPicturePath = req.file.filename;
    // Check if the current profile Picture is not the default
    const defaultPicturePath = process.env.DEFAULT_PROFILE_PICTURE || "profilePicture.jpg";

    if (user.profilePicture && user.profilePicture !== defaultPicturePath) {
      const oldPicturePath = path.join(
        __dirname,
        "..",
        "uploads",
        user.profilePicture
      );
      await deleteProfilePicture(oldPicturePath); // Delete the old Picture
    }
    user.profilePicture = newPicturePath;
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
  const userId = req.user?.id;

  if (!userId) return next(sendError(404, "user"));

  const user = await User.findById(userId);

  if (!user) return next(sendError(404, "user"));

  const defaultPicturePath = process.env.DEFAULT_PROFILE_PICTURE || "profilePicture.jpg";

  // If the user has a profile photo and it's not the default one, delete it from the filesystem
  if (user.profilePicture && user.profilePicture !== defaultPicturePath) {
    const oldPhotoPath = path.join(
      __dirname,
      "..",
      "uploads",
      user.profilePicture
    );
    await deleteProfilePicture(oldPhotoPath);
  }

  const userRole = req.user?.role;

  // If the user is a business owner, delete the associated BusinessOwner document
  if (userRole === "businessOwner") {
    await BusinessOwner.findOneAndDelete({ user_id: userId });
  }

  // Clear authentication cookies
  clearCookies(res);

  await User.findByIdAndDelete(userId);

  return res.status(200).json({
    message: "Account successfully deleted",
  });
};

// User logout
exports.logout = async (req, res, next) => {
  const userId = req.user?.id;

  if (!userId) return next(sendError(404, "user"));

  const user = await User.findById(userId);

  if (!user) return next(sendError(404, "user"));

  const refreshToken = req.cookies.refresh_token;

  // Remove the refresh tokens from the user's array
  await singleDeviceLogout(refreshToken, user);

  // Clear authentication cookies
  clearCookies(res);

  return res.status(200).json({
    message: "Successfully logged out",
  });
};
