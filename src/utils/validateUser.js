const sendError = require("./sendError");
const User = require("../models/user");

const validateUser = async (req, next) => {
    
  const userId = req.user?.id;

  if (!userId) return next(sendError(404, "user"));

  const user = await User.findById(userId);

  if (!user) return next(sendError(404, "user"));

  return user;
};

module.exports = validateUser;
