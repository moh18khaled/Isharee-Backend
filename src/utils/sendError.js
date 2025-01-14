const AppError = require("./AppError");

const errorMessages = {
  400: {
    default: "Bad request.",
    missingFields: "All fields are required.",
    invalidId: "Invalid ID format.",
  },
  401: {
    default: "Unauthorized. Please log in again.",
    currentPassword: "Current password is incorrect.",
  },
  404: {
    default: "Not found.",
    user: "User not found.",
    resource: "Resource not found.",
    products: "No products found.",
  },
  409: {
    default: "Conflict.",
    userExists: "User already exists.",
    emailExists: "Email already exists.",
  },
  500: {
    default: "Conflict.",
    hashingError: "An error occurred while securing your password. Please try again later.",
    compareError: "An error occurred while verifying your password. Please try again later.",
  },

  
  default: "An error occurred.",
};

const sendError = (statusCode, context = "") => {
  const statusMessages = errorMessages[statusCode] || {};
  const message = statusMessages[context] || statusMessages.default || errorMessages.default;

  return new AppError(message, statusCode);
};

module.exports = sendError;
