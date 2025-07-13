const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');
const { validateRegisterData, validateLoginData } = require('../utils/validation');
const { sendResetEmail } = require('../services/email.service');

class UserService {
    // Đăng ký người dùng
    static async registerUser(data) {
        const { error } = validateRegisterData(data);
        if (error) {
            throw new Error(error.details[0].message);
        }

        const existingUser = await UserModel.findByEmail(data.email);
        if (existingUser) {
            throw new Error('Email đã được sử dụng.');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);
        const newUser = await UserModel.register({ ...data, password: hashedPassword });

        return {
            status: 201,
            statusText: 'success',
            message: 'Người dùng đã được đăng ký thành công.',
            data: newUser
        };
    }

    // Đăng nhập người dùng
    static async loginUser(data) {
        const { error } = validateLoginData(data);
        if (error) {
            throw new Error(error.details[0].message);
        }

        const user = await UserModel.findByEmail(data.email);
        if (!user) {
            throw new Error('Người dùng không tồn tại.');
        }

        const isPasswordValid = await bcrypt.compare(data.password, user.password);
        if (!isPasswordValid) {
            throw new Error('Mật khẩu không chính xác.');
        }

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        return {
            status: 200,
            statusText: 'success',
            message: 'Đăng nhập thành công.',
            data: [
                { key: 'token', value: token },
                { key: 'user', value: { id: user.id, username: user.username, email: user.email , isAds: user.is_ads} }
            ]
        };
    }

    // Cập nhật thông tin người dùng
    static async updateUserInfo(data) {
        const { id, username, email, phone_number, click_send_name, click_send_key } = data;

        if (!id) {
            throw new Error('ID người dùng là bắt buộc.');
        }

        const existingUser = await UserModel.findById(id);
        if (!existingUser) {
            throw new Error('Người dùng không tồn tại.');
        }

        // Kiểm tra nếu username đã được cung cấp và khác với username hiện tại
        if (username && username !== existingUser.username) {
            // Kiểm tra xem username mới đã được sử dụng chưa
            const usernameExists = await UserModel.findByUsername(username);
            if (usernameExists && usernameExists.id !== id) {
                throw new Error('Tên người dùng đã được sử dụng.');
            }
        }

        const updatedUser = await UserModel.updateUser(id, {
            username,
            email,
            phone_number,
            click_send_name,
            click_send_key
        });

        return {
            status: 200,
            statusText: 'success',
            message: 'Thông tin người dùng đã được cập nhật thành công.',
            data: [updatedUser]
        };
    }
    // Đổi mật khẩu người dùng
    static async changePassword(data) {
        const { id, oldPassword, newPassword } = data;

        if (!id || !oldPassword || !newPassword) {
            throw new Error('Thiếu thông tin cần thiết.');
        }

        const user = await UserModel.findById(id);
        if (!user) {
            throw new Error('Người dùng không tồn tại.');
        }

        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            throw new Error('Mật khẩu cũ không chính xác.');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await UserModel.updatePassword(id, hashedPassword);

        return {
            status: 200,
            statusText: 'success',
            message: 'Đổi mật khẩu thành công.',
            data: []
        };
    }

    // Yêu cầu quên mật khẩu
    static async requestForgotPassword(data) {
        const { email } = data;

        const user = await UserModel.findByEmail(email);
        if (!user) {
            throw new Error('Email không tồn tại.');
        }

        const resetToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const resetLink = `${process.env.FRONTEND_URL}?token=${resetToken}`;
        await sendResetEmail(email, resetLink);

        return {
            status: 200,
            statusText: 'success',
            message: 'Email reset mật khẩu đã được gửi.',
            data: []
        };
    }

    // Đặt lại mật khẩu
    static async resetPassword(data, authHeader) {
        const token = authHeader && authHeader.split(' ')[1];
        const { newPassword } = data;

        if (!token || !newPassword) {
            throw new Error('Thiếu thông tin cần thiết.');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await UserModel.findById(decoded.userId);
        if (!user) {
            throw new Error('Người dùng không tồn tại.');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await UserModel.updatePassword(user.id, hashedPassword);

        return {
            status: 200,
            statusText: 'success',
            message: 'Mật khẩu đã được cập nhật thành công.',
            data: []
        };
    }
}

module.exports = UserService;
