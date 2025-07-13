const Joi = require('joi');


exports.validateRegisterData = (data) => {
    const schema = Joi.object({
        username: Joi.string().min(3).max(30).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        token_fcm: Joi.string().allow(null, '').optional(),
        phone_number: Joi.string().allow(null, '').optional(),
        click_send_name: Joi.string().allow(null, '').optional(),
        click_send_key: Joi.string().allow(null, '').optional()
    });
    return schema.validate(data);
};

exports.validateLoginData = (data) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
        token_fcm: Joi.string().optional(),
    });
    return schema.validate(data);
};



exports.validateChangePasswordData = (data) => {
    const schema = Joi.object({
        id: Joi.number().required(), // id là bắt buộc
        oldPassword: Joi.string().required(),
        newPassword: Joi.string().min(6).required() // Mật khẩu mới cần tối thiểu 6 ký tự
    });
    return schema.validate(data);
};


