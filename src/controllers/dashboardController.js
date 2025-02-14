const Dashboard = require("../models/dashboard");
const User = require("../models/user");
const Post = require("../models/post");
const Order = require("../models/order");
const BusinessOwner = require("../models/businessOwner");
const SearchHistory = require("../models/SearchHistory");
const mongoose = require("mongoose");
const sendError = require("../utils/sendError");

// Get dashboard data for a business owner
exports.getDashboard = async (req, res, next) => {
  const { businessOwnerId } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(businessOwnerId)) 
    return next(sendError(400, "invalidBusinessOwnerId"));

  const dashboard = await Dashboard.findOne({ businessOwner: businessOwnerId })
    .populate('activeUsers.daily')
    .populate('activeUsers.weekly')
    .populate('activeUsers.monthly');

  if (!dashboard) return next(sendError(404, "dashboardNotFound"));

  res.status(200).json({
    message: "Dashboard data retrieved successfully",
    dashboard
  });
};

// Get specific metrics with filters
exports.getMetrics = async (req, res, next) => {
  const { businessOwnerId } = req.params;
  const { type, startDate, endDate } = req.query;

  if (!mongoose.Types.ObjectId.isValid(businessOwnerId))
    return next(sendError(400, "invalidBusinessOwnerId"));

  const query = { businessOwner: businessOwnerId };

  // Add date range if provided
  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const dashboard = await Dashboard.findOne(query);
  if (!dashboard) return next(sendError(404, "dashboardNotFound"));

  let metrics;
  switch(type) {
    case 'activeUsers':
      metrics = dashboard.activeUsers;
      break;
    case 'engagement':
      metrics = dashboard.engagementRate;
      break;
    case 'keywords':
      metrics = dashboard.keywordInsights;
      break;
    case 'demographics':
      metrics = dashboard.user_age_demographics;
      break;
    default:
      metrics = dashboard; // Return all metrics if no specific type
  }

  res.status(200).json({
    message: "Metrics retrieved successfully",
    metrics
  });
};

// Update active users metrics
exports.updateActiveUsers = async (req, res, next) => {
  const businessOwners = await BusinessOwner.find();
  if (!businessOwners?.length) return next(sendError(404, "noBusinessOwnersFound"));

  for (const owner of businessOwners) {
    const mentionedPosts = await Post.find({
      _id: { $in: owner.mentionedPosts }
    });

    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const activeUsers = {
      daily: new Set(),
      weekly: new Set(),
      monthly: new Set()
    };

    mentionedPosts.forEach(post => {
      post.viewedBy.forEach(userId => {
        const viewDate = post.updatedAt;
        if (viewDate >= oneDayAgo) activeUsers.daily.add(userId.toString());
        if (viewDate >= oneWeekAgo) activeUsers.weekly.add(userId.toString());
        if (viewDate >= oneMonthAgo) activeUsers.monthly.add(userId.toString());
      });
    });

    await Dashboard.updateOne(
      { businessOwner: owner._id },
      {
        $set: {
          activeUsers: {
            daily: Array.from(activeUsers.daily),
            weekly: Array.from(activeUsers.weekly),
            monthly: Array.from(activeUsers.monthly)
          }
        }
      },
      { upsert: true }
    );
  }

  res.status(200).json({ message: "Active users updated successfully" });
};

// Update engagement metrics
exports.updateEngagement = async (req, res, next) => {
  const businessOwners = await BusinessOwner.find();
  if (!businessOwners?.length) return next(sendError(404, "noBusinessOwnersFound"));

  for (const owner of businessOwners) {
    const mentionedPosts = await Post.find({
      _id: { $in: owner.mentionedPosts }
    }).populate('likes').populate('comments');

    if (!mentionedPosts?.length) return next(sendError(404, "noMentionedPostsFound"));

    let totalLikes = 0;
    let totalComments = 0;
    const uniqueUsers = new Set();

    mentionedPosts.forEach(post => {
      totalLikes += post.likes.length;
      totalComments += post.comments.length;
      post.likes.forEach(user => uniqueUsers.add(user._id.toString()));
      post.comments.forEach(comment => uniqueUsers.add(comment.user.toString()));
    });

    await Dashboard.updateOne(
      { businessOwner: owner._id },
      {
        $set: {
          engagementRate: {
            likes: totalLikes,
            comments: totalComments,
            satisfiedUsers: uniqueUsers.size
          }
        }
      },
      { upsert: true }
    );
  }

  res.status(200).json({ message: "Engagement metrics updated successfully" });
};

// Update keyword insights
exports.updateKeywords = async (req, res, next) => {
  const businessOwners = await BusinessOwner.find();
  if (!businessOwners?.length) return next(sendError(404, "noBusinessOwnersFound"));

  for (const owner of businessOwners) {
    const searches = await SearchHistory.aggregate([
      { $group: { _id: "$keyword", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    if (!searches?.length) return next(sendError(404, "noSearchHistoryFound"));

    const trendingKeywords = searches.map(({ _id, count }) => ({
      keyword: _id,
      searchCount: count
    }));

    await Dashboard.updateOne(
      { businessOwner: owner._id },
      {
        $set: {
          keywordInsights: {
            trendingKeywords
          }
        }
      },
      { upsert: true }
    );
  }

  res.status(200).json({ message: "Keyword insights updated successfully" });
};

// Update all metrics at once
exports.updateAllMetrics = async (req, res, next) => {
  const businessOwners = await BusinessOwner.find();
  if (!businessOwners?.length) return next(sendError(404, "noBusinessOwnersFound"));

  try {
    await Promise.all([
      this.updateActiveUsers(req, res, next),
      this.updateEngagement(req, res, next),
      this.updateKeywords(req, res, next)
    ]);

    res.status(200).json({ message: "All metrics updated successfully" });
  } catch (error) {
    return next(sendError(500, "failedToUpdateMetrics"));
  }
};