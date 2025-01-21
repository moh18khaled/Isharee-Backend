const AppError = require("./AppError");

const errorMessages = {
  400: {
    default: "Bad request.",
    missingFields: "All fields are required.",
    invalidId: "Invalid ID format.",
  },
  401: {
    default: "Unauthorized. Please log in again.",
    token:"token expired. Please log in again.",
    currentPassword: "Password is incorrect.",
    Invalidcardinalities: "Invalid email or password. Please try again.",
  },
  403: {
    default: "Forbidden.",
    notAuthenticated: "This role is not authorized to perform this action",
  },
  404: {
    default: "Not found.",
    user: "User not found.",
    resource: "Resource not found.",
    products: "No products found.",
    Photo : "Photo not found",
  },
  409: {
    default: "Conflict.",
    userExists: "Email or username already in use",
    InvalidCredentials:"Invalid credentials or data",
    businessOwnerExists: "Email , username or businessName already in use",
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
