const { createResponse } = require('../utils/responseHelper');
const { logger } = require('../utils/logger');
const UserService = require('../services/user.service'); // Dịch vụ xử lý logic

const errorResponse = (res, status, message) =>
    res.status(status).json(createResponse('fail', message, status, []));

// Đăng ký người dùng
exports.registerUser = async (req, res) => {
    try {
        const response = await UserService.registerUser(req.body);
        return res.status(response.status).json(createResponse(response.statusText, response.message, response.status, response.data));
    } catch (err) {
        logger.warn(`Đăng ký không thành công: ${err.message}`);
        const status = err.message === 'Email đã được sử dụng.' ? 409 : 400;
        return errorResponse(res, status, err.message);
    }
};

// Cập nhật thông tin người dùng
exports.updateUserInfo = async (req, res) => {
    try {
        // Sử dụng id từ token xác thực nếu có
        const userId = req.user.userId;

        // Tạo object dữ liệu mới kèm theo userId
        const userData = {
            ...req.body,
            id: userId
        };

        const response = await UserService.updateUserInfo(userData);
        return res.status(response.status).json(createResponse(response.statusText, response.message, response.status, response.data));
    } catch (err) {
        logger.warn(`Cập nhật tài khoản không thành công: ${err.message}`);
        return errorResponse(res, 400, err.message);
    }
};

// Xóa mềm người dùng
exports.deleteUser = async (req, res) => {
    try {
        // Sử dụng id từ token xác thực nếu có
        const userId = req.user.userId;

        const userData = {
            ...req.body,
            id: userId
        };

        const response = await UserService.deleteUser(userData);
        return res.status(response.status).json(createResponse(response.statusText, response.message, response.status, response.data));
    } catch (err) {
        logger.error(`Lỗi khi xóa người dùng: ${err.message}`);
        return errorResponse(res, 500, 'Không thể xóa tài khoản.');
    }
};

// Đăng nhập người dùng
exports.loginUser = async (req, res) => {
    try {
        const response = await UserService.loginUser(req.body);
        return res.status(response.status).json(createResponse(response.statusText, response.message, response.status, response.data));
    } catch (err) {
        logger.warn(`Đăng nhập không thành công: ${err.message}`);
        return errorResponse(res, 401, 'Email hoặc mật khẩu không chính xác.');
    }
};

// Đổi mật khẩu người dùng
exports.changePassword = async (req, res) => {
    try {
        const response = await UserService.changePassword({ ...req.body, id: req.user.userId });
        return res.status(response.status).json(createResponse(response.statusText, response.message, response.status, response.data));
    } catch (err) {
        logger.warn(`Đổi mật khẩu không thành công: ${err.message}`);
        return errorResponse(res, 400, err.message);
    }
};

// Yêu cầu quên mật khẩu
exports.requestForgotPassword = async (req, res) => {
    try {
        const response = await UserService.requestForgotPassword(req.body);
        return res.status(response.status).json(createResponse(response.statusText, response.message, response.status, response.data));
    } catch (err) {
        // Keep the same response for existing and unknown email addresses.
        logger.warn('Yêu cầu reset mật khẩu không thể xử lý.');
        return res.status(200).json(createResponse(
            'success',
            'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi.',
            200,
            []
        ));
    }
};

// Đặt lại mật khẩu
exports.resetPassword = async (req, res) => {
    try {
        const response = await UserService.resetPassword(req.body, req.headers['authorization']);
        return res.status(response.status).json(createResponse(response.statusText, response.message, response.status, response.data));
    } catch (err) {
        logger.warn(`Đặt lại mật khẩu không thành công: ${err.message}`);
        return errorResponse(res, 400, 'Không thể đặt lại mật khẩu.');
    }
};
