const Dashboard = require("../models/dashboard");
const BusinessOwner = require("../models/businessOwner");
const Post = require("../models/post");
const User = require("../models/user");
const SearchHistory = require("../models/SearchHistory");
const Category = require("../models/category");
const mongoose = require("mongoose");
const sendError = require("../utils/sendError");

const calculateDashboardMetrics = async (businessOwnerId, next) => {
  const posts = await Post.find({ businessOwner: businessOwnerId })
    .populate('likes')
    .populate('comments')
    .populate('author')
    .populate('viewedBy')
    .populate('purchaseIntent.user')
    .populate('categories');

    //console.log(posts);

  if (!posts?.length) {
    return {
      activeUsers: {
        daily: [],
        weekly: [],
        monthly: []
      },
      newVsReturningUsers: {
        newUsersPercentage: 0,
        returningUsersPercentage: 0
      },
      engagementRate: {
        likes: 0,
        shares: 0,
        comments: 0
      },
      post_likes: 0,
      total_posts: 0,
      averageRating:0,
      user_age_demographics: [],
      categories: [],
      businessProfileEngagement: {
        clicks: 0,
        views: 0,
        interactions: 0
      },
      conversionRateFromReviews: {
        percentage: 0
      },
      keywordInsights: [],
      predictiveAnalytics: {
        futureTrends: []
      }
    };
  }

  const now = new Date();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const activeUsers = {
    daily: new Set(),
    weekly: new Set(),
    monthly: new Set()
  };

  let totalLikes = 0;
  let totalComments = 0;
  let totalViews = 0;
  let totalPurchaseIntents = 0;
  let positiveIntents = 0;
  let totalRating = 0;
  let ratingCount = 0;

  const categoryEngagement = new Map();
  const viewedUsersSet = new Set();

  posts.forEach(post => {
    totalLikes += post.likes.length;
    totalComments += post.comments.length;
    totalViews += post.viewedBy.length;
    
    if (post.rating) {
      totalRating += post.rating;
      ratingCount++;
    }


    if (post.purchaseIntent?.length) {
      totalPurchaseIntents += post.purchaseIntent.length;
      positiveIntents += post.purchaseIntent.filter(p => p.intent === 'yes').length;
    }





  post.viewedBy.forEach(user => {
    viewedUsersSet.add(user._id.toString());
  });



    post.viewedBy.forEach(user => {
      const userLastActive = user.lastActiveAt || now;
      if (userLastActive >= oneDayAgo) activeUsers.daily.add(user._id.toString());
      if (userLastActive >= oneWeekAgo) activeUsers.weekly.add(user._id.toString());
      if (userLastActive >= oneMonthAgo) activeUsers.monthly.add(user._id.toString());
    });

    post.categories.forEach(category => {
      const current = categoryEngagement.get(category.name) || {
        count: 0,
        likes: 0,
        views: 0
      };
      categoryEngagement.set(category.name, {
        count: current.count + 1,
        likes: current.likes + post.likes.length,
        views: current.views + post.viewedBy.length
      });
    });
  });
  const viewedUsersArray = Array.from(viewedUsersSet);
  const averageRating = totalRating/posts.length;

  const keywords = await SearchHistory.aggregate([
    { 
      $match: { 
        createdAt: { $gte: oneMonthAgo } 
      }
    },
    {
      $group: {
        _id: "$keyword",
        searches: { $sum: 1 }
      }
    },
    { $sort: { searches: -1 } },
    { $limit: 10 }
  ]);

  const userAgeGroups = viewedUsersArray.length
  ? await User.aggregate([
      { $match: { _id: { $in: viewedUsersArray.map(id => new mongoose.Types.ObjectId(id)) } } },
      { $group: { _id: "$ageGroup", frequency: { $sum: 1 } } }
    ])
  : [];

  const totalMonthlyUsers = activeUsers.monthly.size;
  const newUsersPercentage = totalMonthlyUsers > 0 ? 
    (Array.from(activeUsers.monthly).filter(userId => 
      !activeUsers.weekly.has(userId) && !activeUsers.daily.has(userId)
    ).length / totalMonthlyUsers) * 100 : 0;

  return {
    activeUsers: {
      daily: Array.from(activeUsers.daily),
      weekly: Array.from(activeUsers.weekly),
      monthly: Array.from(activeUsers.monthly)
    },
    newVsReturningUsers: {
      newUsersPercentage: newUsersPercentage,
      returningUsersPercentage: 100 - newUsersPercentage
    },
    engagementRate: {
      likes: totalLikes,
      comments: totalComments,
      shares: 0
    },
    post_likes: totalLikes,
    total_posts: posts.length,
    averageRating,
    user_age_demographics: userAgeGroups.map(group => ({
      age_range: group._id,
      frequency: group.frequency
    })),
    categories: Array.from(categoryEngagement.entries()).map(([category, data]) => ({
      category,
      count: data.count
    })),
    businessProfileEngagement: {
      clicks: totalViews,
      views: totalViews,
      interactions: totalLikes + totalComments
    },
    conversionRateFromReviews: {
      percentage: totalPurchaseIntents > 0 ? 
        (positiveIntents / totalPurchaseIntents) * 100 : 0
    },
    keywordInsights: keywords.map(k => ({
      keyword: k._id,
      searches: k.searches
    })),
    predictiveAnalytics: {
      futureTrends: Array.from(categoryEngagement.entries())
        .map(([trend, data]) => ({
          trend,
          prediction: data.views + data.likes
        }))
        .sort((a, b) => b.prediction - a.prediction)
        .slice(0, 5)
    }
  };
};

const getDashboard = async (req, res, next) => {
  const userId = req.user?.id;
  if (!userId) return next(sendError(401, "unauthorized"));

  const businessOwner = await BusinessOwner.findOne({ user_id: userId });

  if (!businessOwner) return next(sendError(403, "notBusinessOwner"));

  const metrics = await calculateDashboardMetrics(businessOwner._id, next);

  const dashboard = await Dashboard.findOneAndUpdate(
    { businessOwner: businessOwner._id },
    metrics,
    { upsert: true, new: true }
  );

  return res.status(200).json({
    success: true,
    message: "Dashboard data retrieved successfully",
    lastUpdated: dashboard.updatedAt,
    data: dashboard
  });
};

module.exports = {
  calculateDashboardMetrics,
  getDashboard
};