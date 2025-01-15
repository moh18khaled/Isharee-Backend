const BusinessOwner = require("../models/businessOwner");
const User = require("../models/user");
const mongoose = require("mongoose");
const sendError = require("../utils/sendError");
const generateAndSetTokens = require("../utils/generateAndSetTokens");

exports.signup = async (req, res, next) => {
  const {
    username,
    email,
    password,
    age,
    businessName,
    businessType,
    address,
    phoneNumber,
    description,
  } = req.body;

  const oldUser = await User.findOne({ email });
  if (oldUser) {
    return next(sendError(409, "userExists"));
  }

  // Start a database transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  // Step 1: Create User
  const newUser = new User({
    username,
    email,
    password,
    age,
    role: "business man",
  });
  await newUser.save({ session });

  // Step 2: Create BusinessOwner
  const newBusinessOwner = new BusinessOwner({
    user_id: newUser._id,
    businessName,
    businessType,
    address,
    phoneNumber,
    description,
  });
  await newBusinessOwner.save({ session });

  // Commit the transaction
  await session.commitTransaction();
  session.endSession();

  // Generate and set tokens
  await generateAndSetTokens(newuser, res);

  res.status(201).json({
    message: "Business owner registered successfully.",
    user: { id: newUser._id, username: newUser.username },
    businessOwner: {
      id: newBusinessOwner._id,
      businessName: newBusinessOwner.businessName,
    },
  });
};
