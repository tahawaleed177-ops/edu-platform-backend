
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// 1. إنشاء حساب جديد
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name?.trim() || !email?.trim() || !password) {
            return res.status(400).json({
                success: false,
                message: 'يرجى إدخال الاسم والبريد الإلكتروني وكلمة المرور.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const userExists = await pool.query(
            'SELECT id FROM users WHERE LOWER(email) = $1',
            [normalizedEmail]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'البريد الإلكتروني مسجل بالفعل.'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // كل حساب جديد طالب افتراضياً
        await pool.query(
            `INSERT INTO users
                (full_name, email, password_hash, is_admin)
             VALUES ($1, $2, $3, FALSE)`,
            [name.trim(), normalizedEmail, hashedPassword]
        );

        return res.status(201).json({
            success: true,
            message: 'تم إنشاء الحساب بنجاح!'
        });

    } catch (error) {
        console.error('Error in register:', error);

        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم أثناء التسجيل.'
        });
    }
};


// 2. تسجيل الدخول
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email?.trim() || !password) {
            return res.status(400).json({
                success: false,
                message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const result = await pool.query(
            `SELECT id, full_name, email, password_hash, is_admin
             FROM users
             WHERE LOWER(email) = $1`,
            [normalizedEmail]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'بيانات الدخول غير صحيحة.'
            });
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'بيانات الدخول غير صحيحة.'
            });
        }

        // الصلاحية مصدرها قاعدة البيانات حصراً
        const isAdmin = user.is_admin === true;

        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not configured');

            return res.status(500).json({
                success: false,
                message: 'إعدادات الخادم غير مكتملة.'
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                isAdmin
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.full_name,
                email: user.email,
                isAdmin
            }
        });

    } catch (error) {
        console.error('Error in login:', error);

        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم أثناء تسجيل الدخول.'
        });
    }
};
