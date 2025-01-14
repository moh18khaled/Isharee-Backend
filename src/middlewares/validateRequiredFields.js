const sendError = require("../utils/sendError");

const validateRequiredFields = (req, res, next) => {
  // List of required fields for user
  const userFields = ["username", "email", "password", "age"];

  // List of required fields for businessOwner (without user fields)
  const businessOwnerFields = [
    "businessName",
    "businessType",
    "address",
    "phoneNumber",
  ];

  // Combine the userFields with businessOwnerFields
  const fieldsToCheck =
    req.body.businessName || req.body.businessType
      ? [...userFields, ...businessOwnerFields]
      : userFields;

  // Check if any of the required fields are missing in the request body
  for (let field of fieldsToCheck) {
    if (!req.body[field]) {
      return next(sendError(400, "missingFields"));
    }
  }

  next();
};

module.exports = validateRequiredFields;
