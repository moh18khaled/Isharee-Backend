const User = require("../models/user");
const asyncHandler = require("express-async-handler");

const getActiveUsers = asyncHandler(async () => {
    const now = new Date();
    const oneDayAgo = new Date(now.setDate(now.getDate() - 1));
    const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
  
    const dailyActiveUsers = await User.find({ lastActiveAt: { $gte: oneDayAgo } });
    const weeklyActiveUsers = await User.find({ lastActiveAt: { $gte: sevenDaysAgo } });
    const monthlyActiveUsers = await User.find({ lastActiveAt: { $gte: thirtyDaysAgo } });
  
    return { dailyActiveUsers, weeklyActiveUsers, monthlyActiveUsers };
  });  


  module.exports = getActiveUsers;
