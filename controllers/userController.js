const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. إضافة مستخدم جديد (Register)
const createUser = async (req, res) => {
    try {
        const name = req.body.name || req.body.full_name;
        const { email, password } = req.body;

        if (!name?.trim() || !email?.trim() || !password) {
            return res.status(400).json({ success: false, message: "يرجى إدخال الاسم والبريد الإلكتروني وكلمة المرور." });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const userExists = await pool.query("SELECT id FROM users WHERE LOWER(email) = $1", [normalizedEmail]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ success: false, message: "البريد الإلكتروني مستخدم بالفعل" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const new_user = await pool.query(
            "INSERT INTO users (full_name, email, password_hash, is_admin) VALUES ($1, $2, $3, FALSE) RETURNING id, full_name, email, is_admin, created_at",
            [name.trim(), normalizedEmail, hashedPassword]
        );

        res.status(201).json({ 
            success: true, 
            message: "تم إنشاء الحساب بنجاح", 
            user: {
                id: new_user.rows[0].id,
                name: new_user.rows[0].full_name,
                email: new_user.rows[0].email,
                isAdmin: new_user.rows[0].is_admin
            }
        });
    } catch (err) {
        console.error("Error in Register:", err.message);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء إنشاء الحساب" });
    }
};

// 2. تسجيل الدخول (Login)
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email?.trim() || !password) {
            return res.status(400).json({ success: false, message: "يرجى إدخال البريد الإلكتروني وكلمة المرور" });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const userResult = await pool.query("SELECT id, full_name, email, password_hash, is_admin, study_type, section FROM users WHERE LOWER(email) = $1", [normalizedEmail]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "بيانات الدخول غير صحيحة" });
        }
        
        const user = userResult.rows[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "بيانات الدخول غير صحيحة" });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, isAdmin: user.is_admin, studyType: user.study_type, section: user.section }, 
            process.env.JWT_SECRET || 'edu_platform_secret_key_taha',            
            { expiresIn: '7d' }                
        );

        res.status(200).json({ 
            success: true, 
            message: "تم تسجيل الدخول بنجاح", 
            token: token,
            user: { 
                id: user.id, 
                name: user.full_name, 
                email: user.email, 
                isAdmin: user.is_admin,
                studyType: user.study_type,
                section: user.section
            }
        });

    } catch (err) {
        console.error("Error in Login:", err.message);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء تسجيل الدخول" });
    }
};

// 3. جلب جميع المستخدمين
const getAllUsers = async (req, res) => {
    try {
        const all_users = await pool.query("SELECT id, full_name, email, is_admin, study_type, section, created_at FROM users");
        res.status(200).json({ success: true, users: all_users.rows });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء جلب المستخدمين" });
    }
};

// 4. تحديث اسم المستخدم والبيانات الأكاديمية (Profile)
const updateProfile = async (req, res) => {
    try {
        const { name, study_type, section } = req.body;
        const userId = req.user.id; 

        if (!name?.trim()) {
            return res.status(400).json({ success: false, message: "يرجى إدخال الاسم الجديد" });
        }

        const updatedUser = await pool.query(
            "UPDATE users SET full_name = $1, study_type = $2, section = $3 WHERE id = $4 RETURNING id, full_name, email, is_admin, study_type, section",
            [name.trim(), study_type || null, section || null, userId]
        );

        if (updatedUser.rows.length === 0) {
            return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
        }

        res.status(200).json({ 
            success: true, 
            message: "تم تحديث البيانات بنجاح", 
            user: { 
                id: updatedUser.rows[0].id, 
                name: updatedUser.rows[0].full_name, 
                email: updatedUser.rows[0].email,
                isAdmin: updatedUser.rows[0].is_admin,
                studyType: updatedUser.rows[0].study_type,
                section: updatedUser.rows[0].section
            } 
        });
    } catch (err) {
        console.error("Error in updateProfile:", err.message);
        res.status(500).json({ success: false, message: "حدث خطأ في الخادم أثناء التحديث." });
    }
};

// 5. تغيير كلمة المرور
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        const userResult = await pool.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
        }

        const user = userResult.rows[0];

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "كلمة المرور الحالية غير صحيحة" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(newPassword, salt);

        await pool.query(
            "UPDATE users SET password_hash = $1 WHERE id = $2",
            [hashedNewPassword, userId]
        );

        res.status(200).json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
    } catch (err) {
        console.error("Error in changePassword:", err.message);
        res.status(500).json({ success: false, message: "حدث خطأ في الخادم أثناء تغيير كلمة المرور." });
    }
};

// 6. إدارة صلاحيات المشرفين
const toggleAdminRole = async (req, res) => {
    try {
        const { email, makeAdmin } = req.body; 
        const currentAdminId = req.user.id;

        if (!email?.trim()) {
            return res.status(400).json({ success: false, message: "يرجى إدخال البريد الإلكتروني للمستخدم" });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const userResult = await pool.query("SELECT id, is_admin FROM users WHERE LOWER(email) = $1", [normalizedEmail]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "لا يوجد حساب مسجل بهذا البريد الإلكتروني." });
        }

        const targetUser = userResult.rows[0];

        if (targetUser.id === currentAdminId && makeAdmin === false) {
            return res.status(403).json({ success: false, message: "لا يمكنك إلغاء صلاحيات الإدارة عن نفسك." });
        }

        await pool.query("UPDATE users SET is_admin = $1 WHERE id = $2", [makeAdmin, targetUser.id]);

        const actionText = makeAdmin ? "ترقيته إلى مدير منصة" : "إلغاء صلاحياته الإدارية";
        res.status(200).json({ success: true, message: `تم ${actionText} بنجاح.` });

    } catch (err) {
        console.error("Error in toggleAdminRole:", err.message);
        res.status(500).json({ success: false, message: "حدث خطأ في الخادم أثناء تعديل الصلاحيات." });
    }
};

// 7. جلب الطلاب حسب الشعبة (مخصصة لنظام الحضور بالباركود)
const getStudentsBySection = async (req, res) => {
    try {
        const { section } = req.params;
        const result = await pool.query(
            "SELECT id, full_name, email, section, study_type FROM users WHERE section = $1 AND is_admin = FALSE ORDER BY full_name ASC",
            [section]
        );
        res.status(200).json({ success: true, students: result.rows });
    } catch (err) {
        console.error("Error in getStudentsBySection:", err.message);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء جلب قائمة الطلاب." });
    }
};

// 8. جلب الامتحانات والمهام القادمة (Smart Deadlines)
const getDeadlines = async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS deadlines (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                category VARCHAR(50) DEFAULT 'امتحان',
                section VARCHAR(20) DEFAULT 'الكل',
                due_date TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const result = await pool.query(
            "SELECT * FROM deadlines WHERE due_date >= NOW() - INTERVAL '1 day' ORDER BY due_date ASC"
        );
        res.status(200).json({ success: true, deadlines: result.rows });
    } catch (err) {
        console.error("Error in getDeadlines:", err.message);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء جلب المواعيد." });
    }
};

// 9. إضافة موعد امتحان أو تسليم جديد (للمديرين)
const createDeadline = async (req, res) => {
    try {
        const { title, subject, category, section, due_date } = req.body;
        if (!title?.trim() || !subject?.trim() || !due_date) {
            return res.status(400).json({ success: false, message: "يرجى ملء جميع الحقول المطلوبة." });
        }

        const result = await pool.query(
            "INSERT INTO deadlines (title, subject, category, section, due_date) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [title.trim(), subject.trim(), category || 'امتحان', section || 'الكل', due_date]
        );
        res.status(201).json({ success: true, message: "تمت إضافة الموعد بنجاح", deadline: result.rows[0] });
    } catch (err) {
        console.error("Error in createDeadline:", err.message);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء إضافة الموعد." });
    }
};

// 10. حذف موعد (للمديرين)
const deleteDeadline = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM deadlines WHERE id = $1", [id]);
        res.status(200).json({ success: true, message: "تم حذف الموعد بنجاح." });
    } catch (err) {
        console.error("Error in deleteDeadline:", err.message);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء حذف الموعد." });
    }
};

// 11. تسليم واجب أو تقرير (للطالب)
const submitAssignment = async (req, res) => {
    try {
        const deadlineId = req.params.id;
        const userId = req.user.id;
        const { file_url } = req.body;

        if (!file_url?.trim()) {
            return res.status(400).json({ success: false, message: "الرجاء إرفاق رابط التسليم" });
        }

        // إنشاء جدول التسليمات تلقائياً إذا لم يكن موجوداً
        await pool.query(`
            CREATE TABLE IF NOT EXISTS submissions (
                id SERIAL PRIMARY KEY,
                deadline_id INT REFERENCES deadlines(id) ON DELETE CASCADE,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                file_url TEXT NOT NULL,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // التحقق مما إذا كان الطالب قد سلم مسبقاً لتحديث تسليمه، أو إدخال تسليم جديد
        const existing = await pool.query("SELECT id FROM submissions WHERE deadline_id = $1 AND user_id = $2", [deadlineId, userId]);
        
        if (existing.rows.length > 0) {
            await pool.query(
                "UPDATE submissions SET file_url = $1, submitted_at = CURRENT_TIMESTAMP WHERE deadline_id = $2 AND user_id = $3",
                [file_url.trim(), deadlineId, userId]
            );
        } else {
            await pool.query(
                "INSERT INTO submissions (deadline_id, user_id, file_url) VALUES ($1, $2, $3)",
                [deadlineId, userId, file_url.trim()]
            );
        }

        res.status(200).json({ success: true, message: "تم تسليم الواجب بنجاح! ✅" });
    } catch (err) {
        console.error("Error submitting assignment:", err.message);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء التسليم" });
    }
};

// 12. عرض تسليمات الطلاب (للمدير)
const getAssignmentSubmissions = async (req, res) => {
    try {
        const deadlineId = req.params.id;
        
        const result = await pool.query(`
            SELECT s.id, s.file_url, s.submitted_at, u.full_name, u.email, u.study_type, u.section 
            FROM submissions s
            JOIN users u ON s.user_id = u.id
            WHERE s.deadline_id = $1
            ORDER BY s.submitted_at DESC
        `, [deadlineId]);
        
        res.status(200).json({ success: true, submissions: result.rows });
    } catch (err) {
        console.error("Error fetching submissions:", err.message);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء جلب التسليمات" });
    }
};

// === تحديث التصدير في نهاية الملف (استبدل القديم بهذا) ===
module.exports = {
    createUser,
    loginUser,
    getAllUsers,
    updateProfile,
    changePassword,
    toggleAdminRole,
    getStudentsBySection,
    getDeadlines,
    createDeadline,
    deleteDeadline,
    submitAssignment,         // 👈 تمت الإضافة
    getAssignmentSubmissions  // 👈 تمت الإضافة
};