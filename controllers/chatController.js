const axios = require('axios');

exports.askMireo = async (req, res) => {
    try {
        const { prompt, fileText } = req.body;
        
        let fullMessage = prompt || "";
        if (fileText) {
            fullMessage += `\n\n[محتوى الملف المرفق]:\n${fileText}`;
        }

       const systemPrompt = `أنت مساعد أكاديمي احترافي اسمك "ميريو" (Mireo)، مخصص لطلاب هندسة الحاسوب.
قواعد الإجابة الصارمة:
1. أجب بشكل مباشر، دقيق، ومختصر على سؤال الطالب فقط. لا تقم بإضافة أي شروحات، مقدمات، أو تفاصيل عشوائية لم يُسأل عنها.
2. يُمنع منعاً باتاً استخدام الرموز التعبيرية (Emojis) أو الزخارف النصية.
3. اعتمد تنسيقاً مهنياً نظيفاً وواضحاً باستخدام (Markdown) لترتيب النقاط أو الأكواد.
4. استند في إجابتك إلى النص المرفق من المحاضرة إن وجد. إذا كان السؤال خارج نطاق المحاضرة أو لا تعرف إجابته، أجب بمهنية: "لا تتوفر لدي معلومات حول هذا ضمن السياق الحالي."`;
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

        const shuffledKeys = apiKeys.sort(() => 0.5 - Math.random());
        let response = null;
        let success = false;
        let lastError = null;

        for (const apiKey of shuffledKeys) {
            try {
                response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                    model: 'openai/gpt-oss-120b', 
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
                break; 
            } catch (err) {
                lastError = err;
                if (err.response && (err.response.status === 429 || err.response.status >= 500)) {
                    console.log(`تم تجاوز الحد لمفتاح معين، جاري التبديل...`);
                    continue; 
                } else {
                    console.error('API Error details:', err.response?.data || err.message);
                    continue; 
                }
            }
        }

        if (success && response) {
            res.json({ success: true, reply: response.data.choices[0].message.content });
        } else {
            const errorMsg = lastError?.response?.data?.error?.message || lastError?.message || 'خطأ غير معروف';
            res.status(500).json({ success: false, message: `ضغط عالٍ أو خطأ في API. (تفاصيل: ${errorMsg})` });
        }

    } catch (error) {
        console.error('Mireo Error:', error.message);
        res.status(500).json({ success: false, message: `حدث خطأ داخلي. (تفاصيل: ${error.message})` });
    }
};