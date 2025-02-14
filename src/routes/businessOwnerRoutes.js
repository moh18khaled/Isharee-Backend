const express = require('express');
const asyncHandler = require("express-async-handler");
const businessOwnerController = require("../controllers/businessOwnerController");
const validateRequiredFields = require("../middlewares/validateRequiredFields");
const verifyToken = require("../middlewares/verifyToken");

const router = express.Router();

router.get("/signup-data",businessOwnerController.getSignupData)
router.post('/signup',validateRequiredFields("businessOwner"), asyncHandler(businessOwnerController.signup));
router.get('/business-names',asyncHandler(businessOwnerController.getBusinessNames));


module.exports = router;
