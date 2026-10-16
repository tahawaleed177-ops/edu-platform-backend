const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // استدعاء مكتبة توليد المفاتيح (Tokens)

// ----------------------------------------------------
// دالة 1: إضافة مستخدم جديد (طالب أو أستاذ) مع التشفير
// ----------------------------------------------------
const createUser = async (req, res) => {
    try {
        const { full_name, email, password, role } = req.body;

        // التحقق من أن المستخدم غير موجود مسبقاً
        const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ success: false, message: "البريد الإلكتروني مستخدم بالفعل" });
        }

        // تشفير كلمة المرور (بمستوى تعقيد 10)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // إدخال البيانات في قاعدة البيانات باستخدام الكلمة المشفرة
        const new_user = await pool.query(
            "INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, role, created_at",
            [full_name, email, hashedPassword, role || 'student']
        );

        res.status(201).json({ success: true, message: "تم إنشاء الحساب وتشفير كلمة المرور بنجاح", user: new_user.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء إنشاء الحساب" });
    }
};

// ----------------------------------------------------
// دالة 2: تسجيل الدخول (Login) وإنشاء المفتاح (Token)
// ----------------------------------------------------
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // البحث عن المستخدم في قاعدة البيانات عبر البريد الإلكتروني
        const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "البريد الإلكتروني غير مسجل" });
        }
        
        const user = userResult.rows[0];

        // مقارنة كلمة المرور المدخلة بالكلمة المشفرة المحفوظة
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "كلمة المرور غير صحيحة" });
        }

        // توليد مفتاح JWT صالح لمدة يوم واحد (1d)
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET,           
            { expiresIn: '1d' }               
        );

        // إرسال الاستجابة بنجاح مع الـ Token
        res.status(200).json({ 
            success: true, 
            message: "تم تسجيل الدخول بنجاح", 
            token: token,
            user: { id: user.id, full_name: user.full_name, role: user.role }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء تسجيل الدخول" });
    }
};

// ----------------------------------------------------
// دالة 3: جلب جميع المستخدمين (لغرض التجربة والإدارة)
// ----------------------------------------------------
const getAllUsers = async (req, res) => {
    try {
        const all_users = await pool.query("SELECT id, full_name, email, role, created_at FROM users");
        res.status(200).json({ success: true, users: all_users.rows });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء جلب المستخدمين" });
    }
};

// تصدير جميع الدوال لتكون متاحة في ملف المسارات
module.exports = {
    createUser,
    loginUser,
    getAllUsers
};