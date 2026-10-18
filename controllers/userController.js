const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. إضافة مستخدم جديد
const createUser = async (req, res) => {
    try {
        const { full_name, email, password, role } = req.body;

        const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ success: false, message: "البريد الإلكتروني مستخدم بالفعل" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const new_user = await pool.query(
            "INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, role, created_at",
            [full_name, email, hashedPassword, role || 'student']
        );

        res.status(201).json({ success: true, message: "تم إنشاء الحساب بنجاح", user: new_user.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء إنشاء الحساب" });
    }
};

// 2. تسجيل الدخول
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "البريد الإلكتروني غير مسجل" });
        }
        
        const user = userResult.rows[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "كلمة المرور غير صحيحة" });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET,            
            { expiresIn: '1d' }                
        );

        res.status(200).json({ 
            success: true, 
            message: "تم تسجيل الدخول بنجاح", 
            token: token,
            user: { id: user.id, name: user.full_name, email: user.email, isAdmin: user.role === 'admin' }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء تسجيل الدخول" });
    }
};

// 3. جلب جميع المستخدمين
const getAllUsers = async (req, res) => {
    try {
        const all_users = await pool.query("SELECT id, full_name, email, role, created_at FROM users");
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
            "UPDATE users SET full_name = $1 WHERE id = $2 RETURNING id, full_name, email, role",
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
                isAdmin: updatedUser.rows[0].role === 'admin'
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