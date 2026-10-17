const axios = require('axios');

exports.askMireo = async (req, res) => {
    try {
        const { prompt, fileText } = req.body;
        
        let fullMessage = prompt || "";
        if (fileText) {
            fullMessage += `\n\n[محتوى الملف المرفق]:\n${fileText}`;
        }

        const systemPrompt = "أنت مساعد ذكي واحترافي اسمك Mireo (ميريو)، مخصص لمساعدة طلاب قسم هندسة الحاسوب. اشرح المفاهيم المعقدة بطريقة مبسطة، ساعدهم في فهم الملفات التي يرفقونها، واطرح عليهم أسئلة لامتحانهم إذا طلبوا ذلك. أجب باللغة العربية الواضحة والمنسقة باستخدام تقنيات (Markdown) كالجداول والأكواد البرمجية، واستخدم الأمثلة دائماً.";

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

        for (const apiKey of shuffledKeys) {
            try {
                response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                    model: 'llama-3.3-70b-versatile', // تم استخدام هذا النموذج لأنه الأقوى والأكثر دعماً واستقراراً على Groq
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
                if (err.response && (err.response.status === 429 || err.response.status >= 500)) {
                    console.log(`تم تجاوز الحد لمفتاح معين، جاري التبديل...`);
                    continue; 
                } else {
                    console.error('API Error details:', err.response?.data || err.message);
                    continue; // حاول مع المفتاح التالي حتى لو كان خطأ آخر
                }
            }
        }

        if (success && response) {
            res.json({ success: true, reply: response.data.choices[0].message.content });
        } else {
            res.status(500).json({ success: false, message: 'يبدو أن هناك ضغطاً عالياً على ميريو حالياً. يرجى المحاولة بعد قليل.' });
        }

    } catch (error) {
        console.error('Mireo Error:', error.message);
        res.status(500).json({ success: false, message: 'حدث خطأ غير متوقع.' });
    }
};