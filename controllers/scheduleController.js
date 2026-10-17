const pool = require('../config/db');

// عرض الجدول الدراسي للجميع
exports.getSchedule = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM study_schedule ORDER BY day_index ASC, start_time ASC');
        res.json({ success: true, schedule: result.rows });
    } catch (error) {
        console.error('Error in getSchedule:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب الجدول الدراسي.' });
    }
};

// إضافة محاضرة جديدة (للمشرفين فقط)
exports.addScheduleItem = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ success: false, message: 'غير مصرح لك بإضافة محاضرات للجدول.' });
        }

        const { day_index, day_name, subject_name, start_time, end_time, location } = req.body;

        const result = await pool.query(
            'INSERT INTO study_schedule (day_index, day_name, subject_name, start_time, end_time, location) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [day_index, day_name, subject_name, start_time, end_time, location]
        );

        res.status(201).json({ success: true, message: 'تم إضافة المحاضرة إلى الجدول بنجاح.', item: result.rows[0] });
    } catch (error) {
        console.error('Error in addScheduleItem:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء إضافة المحاضرة للجدول.' });
    }
};

// حذف محاضرة من الجدول (للمشرفين فقط)
exports.deleteScheduleItem = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ success: false, message: 'غير مصرح لك بحذف المحاضرات.' });
        }

        const { id } = req.params;
        await pool.query('DELETE FROM study_schedule WHERE id = $1', [id]);

        res.json({ success: true, message: 'تم حذف المحاضرة من الجدول بنجاح.' });
    } catch (error) {
        console.error('Error in deleteScheduleItem:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء حذف المحاضرة.' });
    }
};