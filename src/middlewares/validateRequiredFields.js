const sendError = require("../utils/sendError");

const requiredFieldsByEntity = {
  user: {
    local: ["username", "email", "password", "age", "interests", "heardAboutUs"],
    google: ["username", "age", "interests", "heardAboutUs"], // no password
  },

  businessOwner: {
    local: ["email", "password", "age", "businessName", "categories", "address", "phoneNumber"],
    google: ["age", "businessName", "categories", "address", "phoneNumber"], // no password
  },
  post: ["title", "content", "businessName", "rating", "categories"],
  emailContent: ["name", "email", "subject", "message"],
};

const validateRequiredFields = (entityType) => {
  return (req, res, next) => {
    const body = req.body;
console.log(body);
    let requiredFields;

    if (entityType === "user" || entityType === "businessOwner") {
      const provider = body.authProvider || "local";
      requiredFields = requiredFieldsByEntity[entityType][provider];
    } else {
      requiredFields = requiredFieldsByEntity[entityType];
    }

    const missingFields = requiredFields.filter((field) => {
      const value = body[field];

      if (field === "interests") {
        return !Array.isArray(value) || value.length === 0;
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
