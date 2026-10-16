const pool = require('../config/db');

// 1. جلب جميع التبليغات (للطلاب والإدارة)
const getAllAnnouncements = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM announcements ORDER BY id DESC');
        res.json({ success: true, announcements: result.rows });
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب التبليغات.' });
    }
};

// 2. نشر تبليغ جديد + إشعار تليكرام (للإدارة فقط)
const createAnnouncement = async (req, res) => {
    try {
        // التحقق من أن المستخدم مدير
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ success: false, message: 'عذراً، إضافة التبليغات مخصصة للإدارة فقط.' });
        }

        const { title, content } = req.body;

        if (!title || !content) {
            return res.status(400).json({ success: false, message: 'يرجى إدخال عنوان ومحتوى التبليغ.' });
        }

        // حفظ التبليغ في قاعدة البيانات
        const newAnnouncement = await pool.query(
            'INSERT INTO announcements (title, content) VALUES (\$1, \$2) RETURNING *',
            [title, content]
        );

        // --- بداية إرسال إشعار التليكرام ---
        try {
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            const chatId = process.env.TELEGRAM_CHAT_ID;
            
            if (botToken && chatId) {
                const telegramMessage = `
📢 **تبليغ هام وجديد!** 📢

📌 **العنوان:** ${title}
📝 **التفاصيل:** 
${content}

🌐 *منصة هندسة الحاسوب - الجامعة التكنولوجية*
                `;

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
            console.error('فشل إرسال إشعار التليكرام للتبليغ:', telegramError);
        }
        // --- نهاية إرسال إشعار التليكرام ---

        res.status(201).json({
            success: true,
            message: 'تم نشر التبليغ وإرسال الإشعار بنجاح!',
            announcement: newAnnouncement.rows[0]
        });
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء نشر التبليغ.' });
    }
};

// 3. حذف التبليغ (للإدارة فقط)
const deleteAnnouncement = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ success: false, message: 'عذراً، حذف التبليغات مخصص للإدارة فقط.' });
        }

        const { id } = req.params;
        await pool.query('DELETE FROM announcements WHERE id = \$1', [id]);
        
        res.json({ success: true, message: 'تم حذف التبليغ بنجاح.' });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء حذف التبليغ.' });
    }
};

module.exports = {
    getAllAnnouncements,
    createAnnouncement,
    deleteAnnouncement
};