const multer = require('multer');

// تهيئة multer لاستخدام الذاكرة المؤقتة (MemoryStorage) بدلاً من القرص الصلب
// هذا متوافق 100% مع بيئة Vercel
const storage = multer.memoryStorage();

// تهيئة المُستلِم (multer)
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // حد أقصى 10 ميغابايت
});

module.exports = upload;