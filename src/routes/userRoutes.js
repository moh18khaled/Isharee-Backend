const express = require('express');
const asyncHandler = require("express-async-handler");
const userController = require("../controllers/userController");
const validateRequiredFields = require("../middlewares/validateRequiredFields");
const verifyToken = require("../middlewares/verifyToken");

const router = express.Router();

router.post('/signup',validateRequiredFields, asyncHandler(userController.signup));
router.post('/login', asyncHandler(userController.login));
//router.use("/account", asyncHandler(userController.getAccountData));

module.exports = router;
