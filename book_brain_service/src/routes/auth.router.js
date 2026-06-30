const express = require('express');
const router = express.Router();
const path = require('path');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/authMiddleware');
const { authRateLimit } = require('../middleware/publicRateLimit');

// Route đăng ký
router.post('/api/v1/auth/register', authRateLimit, authController.registerUser);

// Route đăng nhập
router.post('/api/v1/auth/login', authRateLimit, authController.loginUser);


// Route đổi mật khẩu
router.post('/api/v1/auth/change_password', requireAuth, authController.changePassword);

// API yêu cầu gửi email reset mật khẩu
router.post('/api/v1/auth/forgot_password', authRateLimit, authController.requestForgotPassword);

// API đặt lại mật khẩu (quên mật khẩu)
router.post('/api/v1/auth/reset_password', requireAuth, authController.resetPassword);

// Route cập nhật thông tin người dùng
router.post('/api/v1/auth/update', requireAuth, authController.updateUserInfo);

// Route xóa mềm người dùng
router.post('/api/v1/auth/delete', requireAuth, authController.deleteUser);
module.exports = router;
