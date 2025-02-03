const multer = require("multer");
const AppError = require("../utils/AppError");

const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  const imageType = file.mimetype.split("/")[0];

  if (imageType === "image" || imageType === "video") {
    return cb(null, true);
  } else {
    return cb(new AppError("The file must be an image", 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // Max file size: 50MB
  },
});

module.exports = upload;
