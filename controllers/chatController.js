const axios = require('axios');

exports.askMireo = async (req, res) => {
    try {
        const { prompt, fileText } = req.body;
        
        // دمج محتوى الملف مع سؤال الطالب
        let fullMessage = prompt;
        if (fileText) {
            fullMessage += `\n\n[محتوى الملف المرفق]:\n${fileText}`;
        }

        const systemPrompt = "أنت مساعد ذكي واحترافي اسمك Mireo (ميريو)، مخصص لمساعدة طلاب قسم هندسة الحاسوب. اشرح المفاهيم المعقدة بطريقة مبسطة، ساعدهم في فهم الملفات التي يرفقونها، واطرح عليهم أسئلة لامتحانهم إذا طلبوا ذلك. أجب باللغة العربية الواضحة والمنسقة باستخدام تقنيات (Markdown) كالجداول والأكواد البرمجية، واستخدم الأمثلة دائماً.";

        // جلب المفاتيح من ملف .env وتصفية الفارغ منها
        const apiKeys = [
            process.env.GROQ_API_KEY_1,
            process.env.GROQ_API_KEY_2,
            process.env.GROQ_API_KEY_3,
            process.env.GROQ_API_KEY_4,
            process.env.GROQ_API_KEY_5
        ].filter(Boolean);

        if (apiKeys.length === 0) {
            return res.status(500).json({ success: false, message: 'لم يتم العثور على مفاتيح API في الخادم.' });
        }

        // خلط المفاتيح عشوائياً (Shuffle) لتوزيع الضغط على جميع الحسابات بالتساوي
        const shuffledKeys = apiKeys.sort(() => 0.5 - Math.random());
        let response = null;
        let success = false;

        // حلقة ذكية: تجربة المفاتيح واحداً تلو الآخر للبحث عن مفتاح غير مستهلك
        for (const apiKey of shuffledKeys) {
            try {
                response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                    model: 'openai/gpt-oss-120b', // النموذج الذي اخترته
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: fullMessage }
                    ],
                    temperature: 0.7
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                success = true;
                break; // نجح الطلب! نخرج من الحلقة فوراً ولا نجرب البقية
            } catch (err) {
                // إذا كان الخطأ 429 (Too Many Requests)، نتجاهله وننتقل للمفتاح التالي
                if (err.response && (err.response.status === 429 || err.response.status >= 500)) {
                    console.log(`تم تجاوز الحد لمفتاح معين، جاري التبديل لمفتاح آخر...`);
                    continue; 
                } else {
                    // إذا كان الخطأ مختلفاً (مثلاً اسم النموذج غير صحيح) نوقف العملية
                    throw err; 
                }
            }
        }

        // إذا نجح أحد المفاتيح نرسل الرد، وإلا نرسل رسالة خطأ
        if (success && response) {
            res.json({ success: true, reply: response.data.choices[0].message.content });
        } else {
            res.status(500).json({ success: false, message: 'يبدو أن هناك ضغطاً عالياً على ميريو حالياً. يرجى المحاولة بعد دقيقة.' });
        }

    } catch (error) {
        console.error('Mireo Error:', error?.response?.data || error.message);
        res.status(500).json({ success: false, message: 'حدث خطأ غير متوقع، ميريو غير قادر على الرد حالياً.' });
    }
};