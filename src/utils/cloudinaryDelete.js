const cloudinary = require('../config/cloudinaryConfig');
const asyncHandler = require("express-async-handler");

// Delete a file from Cloudinary
const cloudinaryDelete = asyncHandler(async (publicId) => {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
});

module.exports = cloudinaryDelete;