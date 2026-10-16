const pool = require('../config/db');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// تهيئة الاتصال بـ Supabase من أجل التخزين السحابي
const supabaseUrl = 'https://xllrhmfuqwbxwzivwkdi.supabase.co'; // رابط مشروعك في سوبابيس
// تأكد من وجود المتغير SUPABASE_ANON_KEY أو استبدله بمفتاح service_role في إعدادات Vercel
const supabaseKey = process.env.SUPABASE_ANON_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

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

// 2. رفع محاضرة جديدة (للإدارة فقط) - مع التخزين السحابي وإشعار التليكرام
const uploadMaterial = async (req, res) => {
    try {
        // التحقق من صلاحيات المدير
        if (!req.user || (!req.user.isAdmin && req.user.email !== 'tahawaleed177@gmail.com')) {
            return res.status(403).json({ success: false, message: 'عذراً، رفع المحاضرات مخصص للإدارة فقط.' });
        }

        const { title, description, subject_id } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'يرجى اختيار ملف PDF لرفعه.' });
        }

        // إنشاء اسم فريد للملف لتجنب التكرار في Supabase
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileName = uniqueSuffix + path.extname(req.file.originalname);

        // رفع الملف إلى دلو 'lectures' في Supabase
        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('lectures')
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (uploadError) {
            console.error('Supabase Upload Error:', uploadError);
            return res.status(500).json({ success: false, message: 'فشل رفع الملف إلى التخزين السحابي.' });
        }

        // استخراج الرابط العام (Public URL) للمحاضرة المرفوعة
        const { data: publicUrlData } = supabase
            .storage
            .from('lectures')
            .getPublicUrl(fileName);

        const file_url = publicUrlData.publicUrl;

        // إدخال البيانات وحفظ الرابط في قاعدة البيانات
        const newMaterial = await pool.query(
            'INSERT INTO materials (title, description, file_url, subject_id) VALUES (\$1, \$2, \$3, \$4) RETURNING *',
            [title, description, file_url, subject_id]
        );

        // --- بداية كود إرسال إشعار التليكرام ---
        try {
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            const chatId = process.env.TELEGRAM_CHAT_ID;
            
            if (botToken && chatId) {
                // استخراج اسم المادة من قاعدة البيانات لجعله يظهر في الإشعار (اختياري لكنه يجعل الإشعار أجمل)
                // في الكود الخاص بك لا يوجد جدول للمواد، لذا سنكتفي بعرض معرف المادة أو عنوان المحاضرة بوضوح
                
                const telegramMessage = `
🎓 **محاضرة جديدة متاحة الآن!** 🎓

📖 **العنوان:** ${title}
📝 **الوصف:** ${description || 'لا يوجد وصف مضاف'}
📚 **كود المادة:** ${subject_id}
🔗 **رابط التحميل:** [اضغط هنا للتحميل المباشر](${file_url})

💡 *تم الرفع بنجاح عبر منصة هندسة الحاسوب.*
                `;

                // استخدام دالة fetch المدمجة في Node.js 18+ (التي يستخدمها Vercel)
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: telegramMessage,
                        parse_mode: 'Markdown' 
                    })
                });
            }
        } catch (telegramError) {
            console.error('فشل إرسال إشعار التليكرام:', telegramError);
            // ملاحظة: لن نوقف عملية الرفع إذا فشل الإشعار لسبب ما (مثل خطأ في التوكن)
        }
        // --- نهاية كود إرسال إشعار التليكرام ---

        // الاستجابة لنجاح العملية للواجهة الأمامية
        res.status(201).json({
            success: true,
            message: 'تم رفع المحاضرة بنجاح وتم إرسال الإشعار!',
            material: newMaterial.rows[0]
        });
    } catch (error) {
        console.error('Error uploading material:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم أثناء رفع المحاضرة.' });
    }
};

// 3. حذف محاضرة من قاعدة البيانات ومن Supabase (للإدارة فقط)
const deleteMaterial = async (req, res) => {
    try {
        if (!req.user || (!req.user.isAdmin && req.user.email !== 'tahawaleed177@gmail.com')) {
            return res.status(403).json({ success: false, message: 'عذراً، حذف المحاضرات مخصص للإدارة فقط.' });
        }

        const materialId = req.params.id;

        const result = await pool.query('SELECT * FROM materials WHERE id = \$1', [materialId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'المحاضرة غير موجودة.' });
        }

        const material = result.rows[0];

        // حذف ملف الـ PDF من Supabase Storage
        if (material.file_url && material.file_url.includes('supabase.co')) {
            const fileUrlParts = material.file_url.split('/');
            const fileName = fileUrlParts[fileUrlParts.length - 1];
            
            const { error: removeError } = await supabase
                .storage
                .from('lectures')
                .remove([fileName]);

            if (removeError) {
                console.error('Error removing from Supabase:', removeError);
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
    createMaterial: uploadMaterial, // دعم لتسميات التوجيه القديمة إن وجدت
    deleteMaterial
};