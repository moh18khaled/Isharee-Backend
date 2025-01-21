const multer = require("multer");
const AppError = require("../utils/AppError");
const fs = require("fs");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log(file,'<><>><\n')
    cb(null, "src/uploads");
  },
  filename: function (req, file, cb) {
    const ext = file.mimetype.split("/")[1];
    const fileName = `user~${Date.now()}.${ext}`;
    cb(null, fileName);
  },
});

const fileFilter = (req, file, cb) => {
  const imageType = file.mimetype.split("/")[0];
  if (imageType === "image") {
    return cb(null, true);
  } else {
    return cb(new AppError("The file must be an image", 400), false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
