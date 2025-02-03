const mongoose = require("mongoose");

// BusinessOwner Schema
const businessOwnerSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  businessName: {
    type: String,
    required: true,
    minlength: [3, "Business name must be at least 3 characters long."],
    maxlength: [100, "Business name cannot exceed 100 characters."],
    unique: true,
    trim: true,
  },
  businessType: {
    type: String,
    required: true,
    maxlength: [50, "Business type cannot exceed 50 characters."],
  },
  address: {
    country: { type: String, required: true },
    city: { type: String, required: true },
  },
  phoneNumber: {
    type: String,
    required: true,
    validate: {
      validator: (value) => /^(\+?[0-9]{10,15})$/.test(value),
      message:
        "Please provide a valid phone number (10-15 digits, with optional '+').",
    },
  },
  description: { type: String },
  dashboard_data: {
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    post_likes: { type: Number, default: 0 },
    total_posts: { type: Number, default: 0 },
    user_age_demographics: [
      {
        age_range: { type: String, required: true },
        frequency: { type: Number, default: 0 }, // Number of users in this age range
      },
    ],
  },
});

const BusinessOwner = mongoose.model("BusinessOwner", businessOwnerSchema);

module.exports = BusinessOwner;
