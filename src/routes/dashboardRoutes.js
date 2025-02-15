const express = require('express');
const asyncHandler = require("express-async-handler");
const dashboardController = require("../controllers/dashboardController");
const validateRequiredFields = require("../middlewares/validateRequiredFields");
const authorizeRoles = require("../middlewares/authorizeRoles");
const verifyToken = require("../middlewares/verifyToken");

const router = express.Router();

router.get('/', verifyToken,authorizeRoles("businessOwner"), asyncHandler(dashboardController.getDashboard));

module.exports = router;
