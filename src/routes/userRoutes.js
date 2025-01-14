const express = require('express');
const asyncHandler = require("express-async-handler");
const userController = require("../controllers/userController");
const router = express.Router();

router.post('/signup', asyncHandler(userController.signup));
router.post('/login', asyncHandler(userController.login));
//router.use("/account", asyncHandler(getAccountData));

module.exports = router;
