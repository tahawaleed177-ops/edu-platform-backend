const express = require('express');
const cors = require('cors');
const path = require('path'); // تمت الإضافة لضمان قراءة مسار الملفات بدقة
require('dotenv').config(); // ضروري لاستدعاء المتغيرات السرية

// استدعاء ملف الاتصال بقاعدة البيانات
const pool = require('./config/db'); 

// استدعاء مسارات المنصة
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const materialRoutes = require('./routes/materialRoutes');
const subjectRoutes = require('./routes/subjectRoutes');

// تهيئة تطبيق الخادم
const app = express();

// ==========================================
// 1. تفعيل الحراس (Middlewares)
// ==========================================

// السماح للخادم بقراءة البيانات الواردة بصيغة JSON
app.use(express.json());

// تفعيل CORS للسماح بالاتصال من واجهات المستخدم (الفرونت إند)
app.use(cors());

// السماح بالوصول المباشر لمجلد الملفات المرفوعة (لفتح الـ PDF)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// 2. تفعيل المسارات (Routes)
// ==========================================

// توجيه الطلبات إلى ملفات المسارات الصحيحة
app.use('/api/auth', authRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subjects', subjectRoutes);

// إنشاء مسار (رابط) تجريبي للتأكد من أن الخادم يعمل
app.get('/', (req, res) => {
    res.send('مرحباً بك.. خادم المنصة التعليمية يعمل بنجاح!');
});

// ==========================================
// 3. تشغيل الخادم
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`الخادم يعمل الآن على الرابط: http://localhost:${PORT}`);
});