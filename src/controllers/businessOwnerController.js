const BusinessOwner = require("../models/businessOwner");
const User = require("../models/user");
const Category = require("../models/category");
const mongoose = require("mongoose");
const sendError = require("../utils/sendError");
const sendVerificationLink = require("../utils/sendVerificationLink");
const sendEmail = require("../utils/sendEmail");


// Get business names with active subscriptions
exports.getBusinessNames = async (req, res, next) => {
  const businessOwners = await BusinessOwner.find(
    { subscriptionActive: true }, // Filter only active subscriptions
    "businessName" // Retrieve only businessName
  ).lean(); // Convert Mongoose documents to plain objects

  const businessNames = businessOwners.map((business) => business.businessName); // Extract only the names

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
    email,
    password,
    age,
    businessName,
    categories,
    address,
    phoneNumber,
    description,
    websiteUrl,
    authProvider = "local", // Default to local if not provided
  } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const emailLower = email.toLowerCase();
    const businessNameLower = businessName.toLowerCase();

    const oldUser = await User.findOne({ email: emailLower }).session(session);
    const oldBusinessOwner = await BusinessOwner.findOne({
      businessName: businessNameLower,
    }).session(session);

    if (oldBusinessOwner || (oldUser && authProvider === "local")) {
      await session.abortTransaction();
      session.endSession();
      return next(sendError(409, "businessOwnerExists"));
    }

    // Find or create categories
    const existingCategories = await Category.find({
      name: { $in: categories },
    }).session(session);
    const existingCategoryNames = existingCategories.map((cat) => cat.name);
    const existingCategoryIds = existingCategories.map((cat) => cat._id);

    const newCategoriesToCreate = categories.filter(
      (cat) => !existingCategoryNames.includes(cat)
    );

    let newCategoryIds = [];
    if (newCategoriesToCreate.length > 0) {
      const newCategories = await Category.insertMany(
        newCategoriesToCreate.map((cat) => ({ name: cat })),
        { session }
      );
      newCategoryIds = newCategories.map((cat) => cat._id);
    }
    let newUser;

    if (authProvider !== "local") {
      // Google signup
      newUser = oldUser;
      if (!newUser) {
        newUser = new User({
          email: emailLower,
          age,
          authProvider,
          isVerified: true, // auto-verify Google users
        });
      }
    } else {
      // Local signup
      newUser = new User({
        email: emailLower,
        password,
        age,
        authProvider,
      });
    }
    
    // Ensure the role is businessOwner
    if (!newUser.role || newUser.role !== "businessOwner") {
      newUser.role = "businessOwner";
    }
    
    // Save only if it's a new user or role was just updated
    if (newUser.isNew || newUser.isModified("role")) {
      await newUser.save({ session });
    }
    
    
    const newBusinessOwner = new BusinessOwner({
      user_id: newUser._id,
      businessName,
      categories: [...existingCategoryIds, ...newCategoryIds],
      address,
      phoneNumber,
      description,
      websiteUrl,
    });
    await newBusinessOwner.save({ session });

    await session.commitTransaction();
    session.endSession();

    if (authProvider === "local") {
      await sendVerificationLink(emailLower, newUser.id);
    }

    return res.status(201).json({
      message:
        authProvider === "local"
          ? "Business owner registered! Please verify your email."
          : "Google business owner registered successfully.",
      user: {
        username: newUser.username,
        email: newUser.email,
        profilePicture: newUser.profilePicture.url,
        role: newUser.role,
        id: newUser._id,
      },
      businessOwner: {
        id: newBusinessOwner._id,
        businessName: newBusinessOwner.businessName,
        websiteUrl,
      },
    });
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch (e) {
      // Optional: log warning if abort fails (usually safe to ignore)
      console.warn("Abort failed or already committed.");
    }
    session.endSession();
    return next(err);
  }
};
 