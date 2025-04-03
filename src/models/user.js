const mongoose = require("mongoose");
const validator = require("validator"); // Import validator.js
const bcrypt = require("bcryptjs");

const refreshTokenSchema = new mongoose.Schema({
  token: { type: String, required: true },
  issuedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: function() {
        return this.role !== "businessOwner"; // Required for users, optional for business owners
      },
      unique: function() {
        return this.role !== "businessOwner"; // Make unique conditional based on role
      },
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters long."],
      maxlength: [15, "Username must be less than 15 characters long."],
      match: [/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores."],

    },
    password: { 
      type: String,
      required: true,
      minlength: [8, "Password must be at least 8 characters long."],
      validate: {
        validator: (value) =>
          validator.isStrongPassword(value, {
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
          }),
        message:
          "Password must contain at least one lowercase, one uppercase, one number, and one special character.",
      },
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value) => validator.isEmail(value), // Validate email format
        message: "Please provide a valid email address.",
      },
    },
    isVerified: { type: Boolean, default: false },
    age: { type: Number, required: true },
    ageGroup: {
      // The added age group field
      type: String,
      enum: ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
      default: "18-24",
    },
    role: {
      type: String,
      enum: ["user", "businessOwner"],
      default: "user",
    },
    profilePicture: {
      url: {
        type: String,
        maxlength: [
          255,
          "Profile picture URL should be less than 256 characters.",
        ],
        default:
          "https://res.cloudinary.com/dknokwido/image/upload/v1737968225/profilePicture/tdnvzliie0wty93ihodf.jpg",
      },
      public_id: {
        type: String,
        default: "profilePicture/tdnvzliie0wty93ihodf",
      },
    },
    eWallet: {
      amount: { type: Number, default: 0 },
      walletNumber: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true, // Store in lowercase
        trim: true, // Remove accidental spaces
        maxlength: [50, "Wallet number is too long."],
        // validate: {
        //   validator: (value) => /^[a-zA-Z0-9]+$/.test(value), // Ensure alphanumeric only
        //   message: "Wallet number should be alphanumeric.",
        // },
          default: undefined,
          set: (value) => (value === "" ? undefined : value),
      },      
      walletType: {
        type: [String],
        enum: [
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
        // validate: {
        //   validator: function (value) {
        //     return value.length > 0; // Ensures at least one walletType is selected
        //   },
        //   message: "At least one wallet type must be selected.",
        // },
        required: true,
      },
    },
    interests: {
      type: [String],
      default: [],
      // validate: [
      //   (array) => array.length > 0,
      //   "You must choose at least one interest.",
      // ],
    },
    heardAboutUs: {
      type: String,
      enum: [
        "LinkedIn",
        "Social Media",
        "Friend/Family",
        "Search Engine",
        "Advertisement",
        "other",
      ],
 //     required: true,
    },
    lastActiveAt: { type: Date, default: Date.now }, // Track last activity
    refreshTokens: [refreshTokenSchema],
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    likedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to automatically set the age group and hash the password
userSchema.pre("save", async function (next) {
  try {
    // Set age group based on age
    if (this.age >= 18 && this.age <= 24) {
      this.ageGroup = "18-24";
    } else if (this.age >= 25 && this.age <= 34) {
      this.ageGroup = "25-34";
    } else if (this.age >= 35 && this.age <= 44) {
      this.ageGroup = "35-44";
    } else if (this.age >= 45 && this.age <= 54) {
      this.ageGroup = "45-54";
    } else if (this.age >= 55 && this.age <= 64) {
      this.ageGroup = "55-64";
    } else if (this.age >= 65) {
      this.ageGroup = "65+";
    }

    // Hash password if modified
    if (this.isModified("password")) {
      const hashedPassword = await bcrypt.hash(this.password, 10);
      this.password = hashedPassword;
    }

    next();
  } catch (err) {
    next(err); // Pass the error to the next middleware
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
