const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db'); 

// 1. دالة إنشاء حساب جديد (Register)
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // التحقق مما إذا كان الإيميل مستخدماً من قبل
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'البريد الإلكتروني مسجل بالفعل.' });
        }

        // تشفير كلمة المرور
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // إدخال البيانات في الأعمدة الصحيحة (الآن بدون تحديد is_admin لأنها ستكون false افتراضياً)
        await pool.query(
            'INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3)',
            [name, email, hashedPassword]
        );

        res.status(201).json({ success: true, message: 'تم إنشاء الحساب بنجاح!' });
    } catch (error) {
        console.error('Error in register:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم أثناء التسجيل.' });
    }
};

// 2. دالة تسجيل الدخول (Login)
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'البريد الإلكتروني غير مسجل.' });
        }

        const user = result.rows[0];

        // المقارنة مع العمود الصحيح password_hash
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'كلمة المرور غير صحيحة.' });
        }

       // قراءة صلاحية الأدمن مباشرة من العمود الجديد في قاعدة البيانات
        const isAdmin = user.is_Admin === true || user.is_admin === true;
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                isAdmin, 
                full_name: user.full_name 
            }, 
            process.env.JWT_SECRET || 'edu_platform_secret_key_taha', 
            { expiresIn: '7d' } 
        );

        // نرسل البيانات للفرونت إند ليتم عرضها واستخدامها
        res.json({ success: true, token, user: { id: user.id, name: user.full_name, email: user.email, isAdmin } });
    } catch (error) {
        console.error('Error in login:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم أثناء تسجيل الدخول.' });
    }
};