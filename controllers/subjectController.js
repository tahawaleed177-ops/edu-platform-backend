const pool = require('../config/db');

// دالة 1: إضافة مادة جديدة (محمية للإدارة فقط)
const createSubject = async (req, res) => {
    try {
        // التعديل هنا: التحقق باستخدام isAdmin القادمة من التوكن
        if (!req.user.isAdmin) {
            return res.status(403).json({ success: false, message: "عذراً، إضافة المواد مخصصة للإدارة فقط." });
        }

        const { subject_name, subject_code } = req.body;

        // إدخال المادة في قاعدة البيانات
        const new_subject = await pool.query(
            "INSERT INTO subjects (subject_name, subject_code) VALUES ($1, $2) RETURNING *",
            [subject_name, subject_code]
        );

        res.status(201).json({ success: true, message: "تمت إضافة المادة الدراسية بنجاح", subject: new_subject.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء إضافة المادة" });
    }
};

// دالة 2: جلب جميع المواد (متاحة لأي شخص مسجل الدخول)
const getAllSubjects = async (req, res) => {
    try {
        const all_subjects = await pool.query("SELECT * FROM subjects ORDER BY created_at DESC");
        res.status(200).json({ success: true, subjects: all_subjects.rows });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء جلب المواد" });
    }
};

module.exports = {
    createSubject,
    getAllSubjects
};