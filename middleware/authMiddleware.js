const jwt = require('jsonwebtoken');

// 1. حارس التحقق من الهوية (هل المستخدم مسجل دخول أصلاً؟)
exports.verifyToken = (req, res, next) => {
    // جلب التوكن (مفتاح الدخول) من رأس الطلب (Headers)
    let token = req.header('Authorization');
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'ممنوع الدخول. لا يوجد مفتاح توثيق (Token).' });
    }

    try {
        // تنظيف التوكن من كلمة Bearer إذا كان الفرونت إند يرسلها
        if (token.startsWith('Bearer ')) {
            token = token.slice(7, token.length).trimLeft();
        }

        // فك تشفير التوكن بنفس الكلمة السرية التي استخدمناها في تسجيل الدخول
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'edu_platform_secret_key_taha');
        
        // إرفاق بيانات المستخدم (id, email, isAdmin) بالطلب ليتم استخدامها لاحقاً
        req.user = verified; 
        
        next(); // السماح بالمرور للخطوة التي بعدها
    } catch (error) {
        res.status(400).json({ success: false, message: 'مفتاح التوثيق غير صالح أو منتهي الصلاحية.' });
    }
};

// 2. حارس التحقق من الصلاحيات (هل المستخدم مدير؟)
exports.verifyAdmin = (req, res, next) => {
    // نتحقق مما إذا كان المستخدم موجوداً، وهل خاصية isAdmin لديه تساوي true
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ success: false, message: 'صلاحيات مرفوضة. هذا الإجراء مسموح للمديرين فقط.' });
    }
    
    next(); // السماح بالمرور وتنفيذ العملية
};