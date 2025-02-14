const express = require("express");
const asyncHandler = require("express-async-handler");
const paypalController = require("../controllers/paypalController");
const verifyToken = require("../middlewares/verifyToken");
const authorizeRoles = require("../middlewares/authorizeRoles");
const optionalAuth = require("../middlewares/optionalAuth");

const router = express.Router();


router.post("/create-order",verifyToken,authorizeRoles("businessOwner"), asyncHandler(paypalController.createOrder));
router.post("/capture-order",optionalAuth, asyncHandler(paypalController.captureOrder)); 
router.post("/webhook", paypalController.paypalWebhook);

module.exports = router;
