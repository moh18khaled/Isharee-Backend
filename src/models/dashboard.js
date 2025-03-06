const mongoose = require("mongoose");

const dashboardSchema = new mongoose.Schema({
  businessOwner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "BusinessOwner", 
    required: true 
  },
  
  activeUsers: {
    daily: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    weekly: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    monthly: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  
  newVsReturningUsers: {
    newUsersPercentage: { type: Number, default: 0 },
    returningUsersPercentage: { type: Number, default: 0 }
  },
  
  engagementRate: {
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 }
  },

  post_likes: { type: Number, default: 0 },
  total_posts: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },

  user_age_demographics: [{
    age_range: String,
    frequency: Number
  }],

  categories: [{
    category: String,
    count: Number
  }],

  businessProfileEngagement: {
    clicks: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    interactions: { type: Number, default: 0 }
  },

  conversionRateFromReviews: {
    percentage: { type: Number, default: 0 }
  },

  keywordInsights: [{
    keyword: String,
    searches: Number
  }],

  predictiveAnalytics: {
    futureTrends: [{
      trend: String,
      prediction: Number
    }]
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Index for faster queries
dashboardSchema.index({ businessOwner: 1 });

const Dashboard = mongoose.model("Dashboard", dashboardSchema);
module.exports = Dashboard;