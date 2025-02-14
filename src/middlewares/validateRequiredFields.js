const sendError = require("../utils/sendError");

// Define the required fields for each entity.
const requiredFieldsByEntity = {
  user: ["username", "email", "password", "age", "interests", "heardAboutUs"],
  businessOwner: [
    "username", "email", "password", "age",
    "businessName", "categories", "address", "phoneNumber"
  ],
  post: ["title", "text", "imageUrl", "imagePublicId", "businessName", "rating"],
  emailContent: ["name", "email", "subject", "message"],
};

/**
 * Middleware factory: Returns a middleware that validates required fields for a given entity.
 */
const validateRequiredFields = (entityType) => {
  return (req, res, next) => {

    const requiredFields = requiredFieldsByEntity[entityType];

    // Check for missing fields
    const missingFields = requiredFields.filter((field) => {
      const value = req.body[field];

      if (field === "interests") {
        return !Array.isArray(value) || value.length === 0; // Ensure it's an array and not empty
      }

      return value === undefined || value === null || value === "";
    });

    if (missingFields.length > 0) {
      return next(sendError(400, "missingFields"));
    }

    next();
  };
};

module.exports = validateRequiredFields;
