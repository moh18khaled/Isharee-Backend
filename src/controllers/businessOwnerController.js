const BusinessOwner = require("../models/businessOwner");
const User = require("../models/user");
const Category = require("../models/category");
const mongoose = require("mongoose");
const generateJWT = require("../utils/generateJWT");
const sendError = require("../utils/sendError");
const sendEmail = require("../utils/sendEmail");

const generateAndSetTokens = require("../utils/generateAndSetTokens");

// Get business names with active subscriptions
exports.getBusinessNames = async (req, res, next) => {
    const businessOwners = await BusinessOwner.find(
      { subscriptionActive: true }, // Filter only active subscriptions
      "businessName" // Retrieve only businessName
    ).lean(); // Convert Mongoose documents to plain objects

    const businessNames = businessOwners.map((business) => business.businessName); // Extract only the names
    businessNames.push("dddddaa")
    return res.status(200).json({
      businessNames, // Return as an array of strings
    });
};


exports.getSignupData = async (req, res, next) => {
  try {
    const categories = await Category.find({}, "name").lean(); // Fetch available categories

    return res.status(200).json({
      categories: categories.map((cat) => cat.name), // Send category names
    });
  } catch (error) {
    next(error);
  }
};

exports.signup = async (req, res, next) => {
  const {
    username,
    email,
    password,
    age,
    businessName,
    categories,
    address,
    phoneNumber,
    description,
  } = req.body;

  // Start a database transaction
  const session = await mongoose.startSession();

  session.startTransaction();

  const oldUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  }).session(session);
  const oldBusinessOwner = await BusinessOwner.findOne({
    businessName:businessName.toLowerCase() ,
  }).session(session);
  if (oldBusinessOwner || oldUser) {
    await session.abortTransaction();
    session.endSession();
    return next(sendError(409, "businessOwnerExists"));
  }
/*
  // Step 1: Validate all categories exist
  const existingCategories = await Category.find({
    name: { $in: categories },
  }).session(session);
  const existingCategoryNames = existingCategories.map((cat) => cat.name);

  const missingCategories = categories.filter(
    (cat) => !existingCategoryNames.includes(cat)
  );

  if (missingCategories.length > 0) {
    await session.abortTransaction();
    session.endSession();
    return next(sendError(400, "missingCategories"));
  }

  */

   // Step 2: Find existing categories from DB
   const existingCategories = await Category.find({
    name: { $in: categories },
  }).session(session);

  const existingCategoryNames = existingCategories.map((cat) => cat.name);
  const existingCategoryIds = existingCategories.map((cat) => cat._id);

  // Step 3: Identify new categories that need to be created
  const newCategoriesToCreate = categories.filter(
    (cat) => !existingCategoryNames.includes(cat)
  );

  let newCategoryIds = [];
  if (newCategoriesToCreate.length > 0) {
    // Step 4: Create new categories and get their IDs
    const newCategories = await Category.insertMany(
      newCategoriesToCreate.map((cat) => ({ name: cat })),
      { session }
    );
    newCategoryIds = newCategories.map((cat) => cat._id);
  }

  // Step 1: Create User
  const newUser = new User({
    username,
    email,
    password,
    age,
    role: "businessOwner",
  });
  await newUser.save({ session });

  // Step 2: Create BusinessOwner
  const newBusinessOwner = new BusinessOwner({
    user_id: newUser._id,
    businessName,
    categories: [...existingCategoryIds, ...newCategoryIds], // Only what user picked
    address,
    phoneNumber,
    description,
  });
  await newBusinessOwner.save({ session });

  // Commit the transaction
  await session.commitTransaction();
  session.endSession();

  const verificationToken = await generateJWT({ id: newUser.id }, "1h");

  const verificationLink = `${process.env.CLIENT_URL}/verify-account?token=${verificationToken}`;

  await sendEmail(
    email,
    "Verify Your Email",
    `Click the link to verify your email: ${verificationLink}`,
    `<p>Click <a href="${verificationLink}">here</a> to verify your email.</p>`
  );

  res.status(201).json({
    message: "Business owner registered! Please verify your email.",
    user: { id: newUser._id, username: newUser.username },
    businessOwner: {
      id: newBusinessOwner._id,
      businessName: newBusinessOwner.businessName,
    },
  });
};
