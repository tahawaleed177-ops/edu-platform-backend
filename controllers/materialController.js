const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

// 1. جلب المحاضرات الخاصة بمادة معينة
const getMaterialsBySubject = async (req, res) => {
    try {
        const subjectId = req.params.subjectId || req.params.id;
        const result = await pool.query(
            'SELECT * FROM materials WHERE subject_id = \$1 ORDER BY id DESC',
            [subjectId]
        );
        res.json({ success: true, materials: result.rows });
    } catch (error) {
        console.error('Error fetching materials:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب المحاضرات.' });
    }
};

// 2. رفع محاضرة جديدة (للإدارة فقط)
const uploadMaterial = async (req, res) => {
    try {
        if (!req.user || (!req.user.isAdmin && req.user.email !== 'tahawaleed177@gmail.com')) {
            return res.status(403).json({ success: false, message: 'عذراً، رفع المحاضرات مخصص للإدارة فقط.' });
        }

        const { title, description, subject_id } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'يرجى اختيار ملف PDF لرفعه.' });
        }

        const file_url = `/uploads/${req.file.filename}`;

        const newMaterial = await pool.query(
            'INSERT INTO materials (title, description, file_url, subject_id) VALUES (\$1, \$2, \$3, \$4) RETURNING *',
            [title, description, file_url, subject_id]
        );

        res.status(201).json({
            success: true,
            message: 'تم رفع المحاضرة بنجاح!',
            material: newMaterial.rows[0]
        });
    } catch (error) {
        console.error('Error uploading material:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم أثناء رفع المحاضرة.' });
    }
};

// 3. حذف محاضرة من قاعدة البيانات ومن مجلد uploads (للإدارة فقط)
const deleteMaterial = async (req, res) => {
    try {
        if (!req.user || (!req.user.isAdmin && req.user.email !== 'tahawaleed177@gmail.com')) {
            return res.status(403).json({ success: false, message: 'عذراً، حذف المحاضرات مخصص للإدارة فقط.' });
        }

        const materialId = req.params.id;

        // البحث عن المحاضرة لمعرفة مسار الملف قبل حذفه
        const result = await pool.query('SELECT * FROM materials WHERE id = \$1', [materialId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'المحاضرة غير موجودة.' });
        }

        const material = result.rows[0];

        // حذف ملف الـ PDF الفعلي من مجلد uploads
        if (material.file_url) {
            const cleanRelativePath = material.file_url.startsWith('/')
                ? material.file_url.slice(1)
                : material.file_url;
            const filePath = path.join(__dirname, '..', cleanRelativePath);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // حذف السجل من قاعدة البيانات
        await pool.query('DELETE FROM materials WHERE id = \$1', [materialId]);

        res.json({ success: true, message: 'تم حذف المحاضرة وملفها بنجاح.' });
    } catch (error) {
        console.error('Error deleting material:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم أثناء حذف المحاضرة.' });
    }
};

module.exports = {
    getMaterialsBySubject,
    uploadMaterial,
    createMaterial: uploadMaterial,
    deleteMaterial
};