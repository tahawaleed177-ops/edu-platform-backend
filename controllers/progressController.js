const pool = require('../config/db');

// جلب أرقام المحاضرات المكتملة للطالب
exports.getCompletedMaterials = async (req, res) => {
    try {
        const user_id = req.user.id;
        const result = await pool.query('SELECT material_id FROM progress WHERE user_id = $1', [user_id]);
        
        // نرسل مصفوفة تحتوي على أرقام المحاضرات فقط لسهولة فحصها في الفرونت إند
        const completedIds = result.rows.map(row => row.material_id);
        res.json({ success: true, completed: completedIds });
    } catch (error) {
        console.error('Error getting progress:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب بيانات التقدم.' });
    }
};

// تبديل حالة المحاضرة (إكمال / تراجع)
exports.toggleProgress = async (req, res) => {
    try {
        const { material_id } = req.body;
        const user_id = req.user.id;

        // التحقق مما إذا كانت المحاضرة مكتملة مسبقاً
        const check = await pool.query('SELECT * FROM progress WHERE user_id = $1 AND material_id = $2', [user_id, material_id]);

        if (check.rows.length > 0) {
            // إذا كانت مكتملة، نحذفها (تراجع عن الإكمال)
            await pool.query('DELETE FROM progress WHERE user_id = $1 AND material_id = $2', [user_id, material_id]);
            res.json({ success: true, isCompleted: false, message: 'تم التراجع عن إكمال المحاضرة.' });
        } else {
            // إذا لم تكن مكتملة، نضيفها (إكمال)
            await pool.query('INSERT INTO progress (user_id, material_id) VALUES ($1, $2)', [user_id, material_id]);
            res.json({ success: true, isCompleted: true, message: 'تم إكمال المحاضرة!' });
        }
    } catch (error) {
        console.error('Error toggling progress:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحديث التقدم.' });
    }
};