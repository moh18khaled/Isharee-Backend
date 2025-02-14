const express = require('express');
const asyncHandler = require("express-async-handler");
const dashboardController = require("../controllers/dashboardController");
const validateRequiredFields = require("../middlewares/validateRequiredFields");
const authorizeRoles = require("../middlewares/authorizeRoles");
const verifyToken = require("../middlewares/verifyToken");

const router = express.Router();

router.get('/:businessOwnerId', verifyToken, dashboardController.getDashboard);
router.get('/:businessOwnerId/metrics', verifyToken, dashboardController.getMetrics);
router.post('/metrics/active-users/update', verifyToken, dashboardController.updateActiveUsers);
router.post('/metrics/engagement/update', verifyToken, dashboardController.updateEngagement);
router.post('/metrics/keywords/update', verifyToken, dashboardController.updateKeywords);
router.post('/metrics/update-all', verifyToken, dashboardController.updateAllMetrics);

module.exports = router;
