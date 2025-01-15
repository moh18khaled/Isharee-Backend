const AppError = require("../utils/AppError");

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return next(sendError(403, "notAuthenticated"));
    next();
  };
};
module.exports = authorizeRoles;
