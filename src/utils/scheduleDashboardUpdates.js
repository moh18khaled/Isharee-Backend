const cron = require('node-cron');
const Dashboard = require("../models/dashboard");
const BusinessOwner = require("../models/businessOwner");
const { calculateDashboardMetrics } = require("../controllers/dashboardController");

// Schedule updates every hour
const scheduleDashboardUpdates = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('Starting periodic dashboard update...');
      
      // Get all business owners
      const businessOwners = await BusinessOwner.find();
      
      // Update each dashboard
      for (const owner of businessOwners) {
        console.log(owner._id)
        await updateDashboardForOwner(owner._id);
      }
      
      console.log('Periodic dashboard update completed');
    } catch (error) {
      console.error('Periodic dashboard update failed:', error);
    }
  });
};

// Update dashboard for a single business owner
const updateDashboardForOwner = async (businessOwnerId) => {
  try {
    const metrics = await calculateDashboardMetrics(businessOwnerId);
    
    await Dashboard.findOneAndUpdate(
      { businessOwner: businessOwnerId },
      { $set: metrics },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error(`Failed to update dashboard for owner ${businessOwnerId}:`, error);
  }
};

module.exports = { scheduleDashboardUpdates };