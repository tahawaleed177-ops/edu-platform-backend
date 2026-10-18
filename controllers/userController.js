const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. إضافة مستخدم جديد (Register)
const createUser = async (req, res) => {
    try {
        // دعم استقبال name أو full_name من الفرونت إند
        const name = req.body.name || req.body.full_name;
        const { email, password } = req.body;

        if (!name?.trim() || !email?.trim() || !password) {
            return res.status(400).json({ success: false, message: "يرجى إدخال الاسم والبريد الإلكتروني وكلمة المرور." });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const userExists = await pool.query("SELECT id FROM users WHERE LOWER(email) = $1", [normalizedEmail]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ success: false, message: "البريد الإلكتروني مستخدم بالفعل" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // إزالة role واستخدام is_admin الافتراضي (FALSE)
        const new_user = await pool.query(
            "INSERT INTO users (full_name, email, password_hash, is_admin) VALUES ($1, $2, $3, FALSE) RETURNING id, full_name, email, is_admin, created_at",
            [name.trim(), normalizedEmail, hashedPassword]
        );

        res.status(201).json({ 
            success: true, 
            message: "تم إنشاء الحساب بنجاح", 
            user: {
                id: new_user.rows[0].id,
                name: new_user.rows[0].full_name,
                email: new_user.rows[0].email,
                isAdmin: new_user.rows[0].is_admin
            }
        });
    } catch (err) {
        console.error("Error in Register:", err.message);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء إنشاء الحساب" });
    }
};

// 2. تسجيل الدخول (Login)
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email?.trim() || !password) {
            return res.status(400).json({ success: false, message: "يرجى إدخال البريد الإلكتروني وكلمة المرور" });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // استخدام is_admin بدلاً من role
        const userResult = await pool.query("SELECT id, full_name, email, password_hash, is_admin FROM users WHERE LOWER(email) = $1", [normalizedEmail]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "بيانات الدخول غير صحيحة" });
        }
        
        const user = userResult.rows[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "بيانات الدخول غير صحيحة" });
        }

        // إرفاق isAdmin داخل التوكن بدلاً من role
        const token = jwt.sign(
            { id: user.id, email: user.email, isAdmin: user.is_admin }, 
            process.env.JWT_SECRET || 'edu_platform_secret_key_taha',            
            { expiresIn: '7d' }                
        );

        res.status(200).json({ 
            success: true, 
            message: "تم تسجيل الدخول بنجاح", 
            token: token,
            user: { id: user.id, name: user.full_name, email: user.email, isAdmin: user.is_admin }
        });

    } catch (err) {
        console.error("Error in Login:", err.message);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء تسجيل الدخول" });
    }
};

// 3. جلب جميع المستخدمين
const getAllUsers = async (req, res) => {
    try {
        // إزالة استدعاء role من هنا أيضاً
        const all_users = await pool.query("SELECT id, full_name, email, is_admin, created_at FROM users");
        res.status(200).json({ success: true, users: all_users.rows });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء جلب المستخدمين" });
    }
};

// 4. تحديث اسم المستخدم (Profile)
const updateProfile = async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user.id; 

        if (!name?.trim()) {
            return res.status(400).json({ success: false, message: "يرجى إدخال الاسم الجديد" });
        }

        const updatedUser = await pool.query(
            "UPDATE users SET full_name = $1 WHERE id = $2 RETURNING id, full_name, email, is_admin",
            [name.trim(), userId]
        );

        if (updatedUser.rows.length === 0) {
            return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
        }

        res.status(200).json({ 
            success: true, 
            message: "تم تحديث البيانات بنجاح", 
            user: { 
                id: updatedUser.rows[0].id, 
                name: updatedUser.rows[0].full_name, 
                email: updatedUser.rows[0].email,
                isAdmin: updatedUser.rows[0].is_admin 
            } 
        });
    } catch (err) {
        console.error("Error in updateProfile:", err.message);
        res.status(500).json({ success: false, message: "حدث خطأ في الخادم أثناء التحديث." });
    }
};

// 5. تغيير كلمة المرور
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        const userResult = await pool.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
        }

        const user = userResult.rows[0];

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "كلمة المرور الحالية غير صحيحة" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(newPassword, salt);

        await pool.query(
            "UPDATE users SET password_hash = $1 WHERE id = $2",
            [hashedNewPassword, userId]
        );

        res.status(200).json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
    } catch (err) {
        console.error("Error in changePassword:", err.message);
        res.status(500).json({ success: false, message: "حدث خطأ في الخادم أثناء تغيير كلمة المرور." });
    }
};

module.exports = {
    createUser,
    loginUser,
    getAllUsers,
    updateProfile,
    changePassword
};