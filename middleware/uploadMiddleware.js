const multer = require('multer');
const path = require('path');

// إعداد مكان التخزين وطريقة تسمية الملفات
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // تحديد المجلد الذي ستُحفظ فيه الملفات
        cb(null, 'uploads/'); 
    },
    filename: (req, file, cb) => {
        // إنشاء اسم فريد للملف باستخدام التاريخ ووقت الرفع (لمنع تشابه الأسماء وتلف الملفات)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // دمج الاسم الجديد مع امتداد الملف الأصلي (مثل .pdf أو .jpg)
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// تهيئة المُستلِم (multer)
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // وضع حد أقصى لحجم الملف (10 ميغابايت كمثال)
});

module.exports = upload;