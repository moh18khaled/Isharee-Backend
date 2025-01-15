const express = require('express');
const asyncHandler = require("express-async-handler");
const businessOwnerController = require("../controllers/businessOwnerController");
const validateRequiredFields = require("../middlewares/validateRequiredFields");
const verifyToken = require("../middlewares/verifyToken");

const router = express.Router();

router.post('/signup',validateRequiredFields, asyncHandler(businessOwnerController.signup));

module.exports = router;
