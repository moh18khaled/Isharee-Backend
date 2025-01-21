const fs = require("fs/promises");
const sendError = require("../utils/sendError");

const deleteProfilePicture = async (filePath) => {
  try {
    // Check if the file exists
    await fs.access(filePath);

    // Delete the file
    await fs.unlink(filePath);

  } catch (err) {
    // Handle specific errors
    if (err.code === "ENOENT") {
      // File does not exist
      throw sendError(404, "Photo");
    } else {
      // Other errors
      console.error("Error deleting file:", err.message);
      throw sendError(500, "default");
    }
  }
};

module.exports = deleteProfilePicture;
