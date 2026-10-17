const pool = require('../config/db'); // تأكد من مسار الاتصال بقاعدة البيانات الخاص بك

// جلب المحاضرات المفضلة للطالب الحالي
exports.getFavorites = async (req, res) => {
    try {
        const user_id = req.user.id;
        // نجلب تفاصيل المحاضرات التي قام هذا الطالب بتفضيلها
        const result = await pool.query(`
            SELECT m.* 
            FROM materials m
            INNER JOIN favorites f ON m.id = f.material_id
            WHERE f.user_id = $1
            ORDER BY f.created_at DESC
        `, [user_id]);
        
        res.json({ success: true, favorites: result.rows });
    } catch (error) {
        console.error('Error getting favorites:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب المفضلة.' });
    }
};

// إضافة محاضرة للمفضلة
exports.addFavorite = async (req, res) => {
    try {
        const { material_id } = req.body;
        const user_id = req.user.id;

        // ON CONFLICT DO NOTHING تمنع الخطأ إذا ضغط الطالب على زر الحفظ مرتين
        await pool.query(
            'INSERT INTO favorites (user_id, material_id) VALUES (\$1, \$2) ON CONFLICT (user_id, material_id) DO NOTHING',
            [user_id, material_id]
        );
        res.status(201).json({ success: true, message: 'تم الحفظ للمراجعة.' });
    } catch (error) {
        console.error('Error adding favorite:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء الإضافة للمفضلة.' });
    }
};

// إزالة محاضرة من المفضلة
exports.removeFavorite = async (req, res) => {
    try {
        const { material_id } = req.params;
        const user_id = req.user.id;

        await pool.query(
            'DELETE FROM favorites WHERE user_id = \$1 AND material_id = \$2',
            [user_id, material_id]
        );
        res.json({ success: true, message: 'تمت الإزالة من المفضلة.' });
    } catch (error) {
        console.error('Error removing favorite:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء الإزالة من المفضلة.' });
    }
};