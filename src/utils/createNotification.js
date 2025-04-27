const Notification = require("../models/notification");
const asyncHandler = require("express-async-handler");
const { getSocketIOInstance } = require("./initializeSocket");

const createNotification = asyncHandler(async (userId, message) => {
    const notification = new Notification({
      userId,
      message,
    });
console.log(message," ",userId)
  // 🔹 Send real-time notification event to the frontend
  const io = getSocketIOInstance();

  io.to(userId.toString()).emit("new-notification", { message });
     
    // Save the notification to the database
    await notification.save();
    return notification; // You can return the notification if you need it after creation.
});

module.exports = createNotification;
