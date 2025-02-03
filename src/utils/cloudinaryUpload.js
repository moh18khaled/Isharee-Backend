const cloudinary = require('../config/cloudinaryConfig');
const asyncHandler = require("express-async-handler");

// Upload 
const cloudinaryUpload = asyncHandler(async (filePath, folder,resource_type) => {
  const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type,
      quality: 'auto:good', // Automatically compresses without losing quality
      flags: 'lossy', // Optional: forces lossy compression (if you need to balance size and quality)
      
    });
    return result;
});
module.exports = cloudinaryUpload;