const express = require("express");
const router = express.Router();
const authController = require('./../../controllers/auth/auth-controller');
const verifyAuth = require('./../../../middleware/auth_check');
const asyncHandler = require('../../../utils/async_handler');
const { uploadSingleProfileImage, handleUploadError } = require('../../../middleware/upload');

// Public routes (no authentication required)
router.post("/register", uploadSingleProfileImage, handleUploadError, asyncHandler(authController.addNewUser));
router.post("/login", asyncHandler(authController.login));
router.post("/forgot-password", asyncHandler(authController.changeForgotPassword));

// Protected routes (authentication required)
router.get('/profile', verifyAuth.authVerify, asyncHandler(authController.getCurrentUserProfile));
router.put('/profile', verifyAuth.authVerify, uploadSingleProfileImage, handleUploadError, asyncHandler(authController.updateUserProfile));
router.patch('/profile/image', verifyAuth.authVerify, uploadSingleProfileImage, handleUploadError, asyncHandler(authController.updateProfileImage));
router.get('/users', verifyAuth.authVerify, asyncHandler(authController.getAllUsers));
router.get('/users/active', verifyAuth.authVerify, asyncHandler(authController.getAllActiveUsers));
router.get('/users/:id', verifyAuth.authVerify, asyncHandler(authController.getUserById));

// Admin only routes
router.patch('/users/:id/disable', verifyAuth.isAdmin, asyncHandler(authController.disAbleUser));

module.exports = router;