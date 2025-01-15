const User = require("../models/user");
const sendError = require("../utils/sendError");
const generateAndSetTokens = require("../utils/generateAndSetTokens");

// User signup
exports.signup = async (req, res, next) => {
  const { email, password, username, age } = req.body;

  const oldUser = await User.findOne({ email });

  if (oldUser) return next(sendError(409, "userExists"));

  const newUser = new User({
    username,
    email,
    age,
    password, // Hashed automatically by the pre-save hook
  });

  await newUser.save();

  // Generate and set tokens
  await generateAndSetTokens(newuser, res);
  
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

  if (!isMatch) return next(sendError(401));

  // Generate and set tokens
  await generateAndSetTokens(user, res);

  return res.status(200).json({
    message: "User successfully logged In",
    data: {
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profilePhoto: user.profilePhoto,
      },
    },
  });
};
