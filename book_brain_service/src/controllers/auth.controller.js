const { createResponse } = require('../utils/responseHelper');
const { logger } = require('../utils/logger');
const UserService = require('../services/user.service'); // Dịch vụ xử lý logic

// Đăng ký người dùng
exports.registerUser = async (req, res) => {
    try {
        const response = await UserService.registerUser(req.body);
        return res.status(response.status).json(createResponse(response.statusText, response.message, response.status, response.data));
    } catch (err) {
        logger.error(`Lỗi khi đăng ký người dùng: ${err.message}`, { meta: { request: req.body, error: err } });
        return res.status(200).json(createResponse('fail', 'Lỗi khi đăng ký người dùng.', 500, [], err.message));
    }
};

// Cập nhật thông tin người dùng
exports.updateUserInfo = async (req, res) => {
    try {
        // Sử dụng id từ token xác thực nếu có
        const userId = req.user?.userId || req.body.id;

        // Tạo object dữ liệu mới kèm theo userId
        const userData = {
            ...req.body,
            id: userId
        };

        const response = await UserService.updateUserInfo(userData);
        return res.status(response.status).json(createResponse(response.statusText, response.message, response.status, response.data));
    } catch (err) {
        logger.error(`Lỗi khi cập nhật thông tin người dùng: ${err.message}`, { meta: { request: req.body, error: err } });
        return res.status(200).json(createResponse('fail', 'Lỗi khi cập nhật thông tin người dùng.', 500, [], err.message));
    }
};

// Đăng nhập người dùng
exports.loginUser = async (req, res) => {
    try {
        const response = await UserService.loginUser(req.body);
        return res.status(response.status).json(createResponse(response.statusText, response.message, response.status, response.data));
    } catch (err) {
        logger.error(`Lỗi khi đăng nhập: ${err.message}`, { meta: { request: req.body, error: err } });
        return res.status(200).json(createResponse('fail', 'Lỗi khi đăng nhập.', 500, [], err.message));
    }
};

// Đổi mật khẩu người dùng
exports.changePassword = async (req, res) => {
    try {
        const response = await UserService.changePassword(req.body);
        return res.status(response.status).json(createResponse(response.statusText, response.message, response.status, response.data));
    } catch (err) {
        logger.error(`Lỗi khi đổi mật khẩu: ${err.message}`, { meta: { request: req.body, error: err } });
        return res.status(200).json(createResponse('fail', 'Lỗi khi đổi mật khẩu.', 500, [], err.message));
    }
};

// Yêu cầu quên mật khẩu
exports.requestForgotPassword = async (req, res) => {
    try {
        const response = await UserService.requestForgotPassword(req.body);
        return res.status(response.status).json(createResponse(response.statusText, response.message, response.status, response.data));
    } catch (err) {
        logger.error(`Lỗi khi yêu cầu reset mật khẩu: ${err.message}`);
        return res.status(200).json(createResponse('fail', 'Lỗi server.', 500));
    }
};

// Đặt lại mật khẩu
exports.resetPassword = async (req, res) => {
    try {
        const response = await UserService.resetPassword(req.body, req.headers['authorization']);
        return res.status(response.status).json(createResponse(response.statusText, response.message, response.status, response.data));
    } catch (err) {
        logger.error(`Lỗi khi đặt lại mật khẩu: ${err.message}`, { meta: { request: req.body } });
        return res.status(200).json(createResponse('fail', 'Lỗi server.', 500, null, err.message));
    }
};
