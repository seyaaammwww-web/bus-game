# 🧪 دليل الاختبار - الإصلاحات الحرجة

## 📋 أدوات الاختبار المطلوبة

```bash
# اختبار رسائل WebSocket
npm install -g wscat

# اختبار الحمل
npm install -g autocannon

# اختبار الأمان
npm install -g owasp-zap

# اختبار الأداء
npm install -g clinic
```

---

## 🧪 اختبارات Wildcard Logic

### الاختبار 1: كلمة صحيحة مع جوكر
```bash
# يجب أن تمر
curl -X POST http://localhost:5000/api/test \
  -H "Content-Type: application/json" \
  -d '{
    "letter": "ا",
    "word": "أسد",
    "category": "حيوان",
    "wildcard": true
  }'
# النتيجة المتوقعة: { isValid: true, reason: "جوكر" }
```

### الاختبار 2: كلمة خاطئة مع جوكر
```bash
# يجب أن ترفع
curl -X POST http://localhost:5000/api/test \
  -H "Content-Type: application/json" \
  -d '{
    "letter": "ا",
    "word": "برتقال",
    "category": "فاكهة",
    "wildcard": true
  }'
# النتيجة المتوقعة: { isValid: false, reason: "جوكر - لكن الحرف خطأ" }
```

### الاختبار 3: حرف صحيح لكن كلمة غير موجودة
```bash
curl -X POST http://localhost:5000/api/test \
  -H "Content-Type: application/json" \
  -d '{
    "letter": "ا",
    "word": "ازغاغ",
    "category": "حيوان",
    "wildcard": true
  }'
# النتيجة المتوقعة: { isValid: true, reason: "جوكر" } (الحرف صحيح)
```

---

## 🧪 اختبارات Vote Eligibility

### الاختبار 1: المطرود لا يصوت
```bash
# في WebSocket - محاولة تصويت من لاعب مطرود
{
  "type": "cast_parallel_vote",
  "payload": {
    "requestId": "req123",
    "vote": "yes"
  }
}
# النتيجة المتوقعة: خطأ "أنت مطرود"
```

### الاختبار 2: الحكم لا يصوت
```bash
# محاولة تصويت من الحكم
# النتيجة المتوقعة: خطأ "الحكم لا يصوت"
```

### الاختبار 3: المصوتون صحيحون
```bash
# اختبار أن قائمة المصوتين صحيحة
# يجب أن تستبعد:
# - صاحب الطعن
# - الحكم
# - اللاعب المطرود
```

---

## 🧪 اختبارات Manual Score Adjustment

### الاختبار 1: إضافة نقاط
```bash
# Host يضيف 50 نقطة
{
  "type": "host_adjust_score",
  "payload": {
    "playerId": "p123",
    "adjustment": 50
  }
}
# النتيجة المتوقعة: 
# - player.score += 50
# - player.totalEarnedPoints += 50
```

### الاختبار 2: خصم نقاط
```bash
# Host يخصم 30 نقطة
{
  "type": "host_adjust_score",
  "payload": {
    "playerId": "p123",
    "adjustment": -30
  }
}
# النتيجة المتوقعة:
# - player.score -= 30
# - player.totalEarnedPoints -= 30
```

### الاختبار 3: التعديل يتم حفظه
```bash
# بعد إعادة تحميل الجولة، يجب أن يبقى التعديل
# الفحص: commitRoundResults يطبّق manualScoreAdjustment
```

---

## 🧪 اختبارات Message Size Limit

### الاختبار 1: رسالة عادية (صحيح)
```bash
# رسالة 1KB
wscat -c ws://localhost:5000/ws
# إرسال: {"type":"ping","payload":{}}
# النتيجة المتوقعة: pong
```

### الاختبار 2: رسالة كبيرة (32KB - تحذير)
```bash
# رسالة 32KB تماماً
# النتيجة المتوقعة: warning لكن قد تمر
```

### الاختبار 3: رسالة كبيرة جداً (>64KB - رفع)
```bash
# رسالة 65KB
# النتيجة المتوقعة: 
# - خطأ: "حجم الرسالة كبير جداً"
# - إغلاق الاتصال
```

### الاختبار 4: attack DoS
```bash
# محاولة إرسال 100 رسالة من 63KB
# النتيجة المتوقعة: 
# - الرسائل ترفع
# - الاتصال يُغلق
```

---

## 🧪 اختبارات Rate Limiting

### الاختبار 1: 50 رسالة في 10 ثوانٍ (قبول)
```bash
# إرسال 50 رسالة
# النتيجة المتوقعة: جميعها تمر
for i in {1..50}; do
  wscat -c ws://localhost:5000/ws <<< '{"type":"ping"}'
done
```

### الاختبار 2: 51 رسالة (رفع)
```bash
# إرسال 51 رسالة متتالية
# النتيجة المتوقعة: 
# - الرسالة 51 ترفع
# - الاتصال يُغلق
```

### الaختبار 3: flood attack
```bash
# محاكاة flood attack
# استخدام: autocannon -d 10 -c 100 ws://localhost:5000/ws
# النتيجة المتوقعة: الخادم يرفع معظم الاتصالات
```

---

## 🧪 اختبارات Input Sanitization

### الاختبار 1: HTML tags (يجب أن تُحول)
```bash
# رسالة بـ HTML
{
  "type": "send_message",
  "payload": {
    "message": "<script>alert('xss')</script>"
  }
}
# النتيجة المتوقعة: 
# - &lt;script&gt;alert('xss')&lt;/script&gt;
```

### الاختبار 2: عروض النقل (يجب أن تُحول)
```bash
# رسالة بـ quotes
{
  "type": "send_message",
  "payload": {
    "message": 'قال: "مرحبا"'
  }
}
# النتيجة المتوقعة:
# - قال: &quot;مرحبا&quot;
```

### الاختبار 3: اختبار شامل XSS
```bash
# قائمة اختبارات XSS الشاملة
const xssTests = [
  "<img src=x onerror=alert('xss')>",
  "javascript:alert('xss')",
  "data:text/html,<script>alert('xss')</script>",
  "<svg onload=alert('xss')>",
  "<iframe src='javascript:alert(\"xss\")'>"
];

xssTests.forEach(test => {
  // إرسال واختبار أن النتيجة مُصفاة
});
```

---

## 🧪 اختبارات Health Check

### الاختبار 1: Health endpoint
```bash
curl http://localhost:5000/api/health
# النتيجة المتوقعة:
# {
#   "status": "ok",
#   "connections": {
#     "active": 5,
#     "total": 42
#   },
#   "messages": 1024
# }
```

### الاختبار 2: Groq health
```bash
curl http://localhost:5000/api/groq/health
# النتيجة المتوقعة:
# {
#   "status": "healthy",
#   "timestamp": "2026-03-08T...",
#   "stats": {...}
# }
```

### الاختبار 3: مراقبة مستمرة
```bash
# اختبار مستمر كل 5 ثوانٍ
watch -n 5 'curl -s http://localhost:5000/api/health | jq'
```

---

## 📊 اختبار الأداء

### الاختبار 1: throughput
```bash
# اختبار عدد الرسائل المعالجة في الثانية
autocannon -d 30 -c 50 http://localhost:5000/api/health

# النتيجة المتوقعة: >1000 req/sec
```

### الاختبار 2: latency
```bash
# اختبار متوسط التأخير
clinic doctor -- npm start
# ثم: autocannon -d 30 -c 100 ws://localhost:5000/ws

# النتيجة المتوقعة: <100ms average
```

### الاختبار 3: استقرار طويل الأمد
```bash
# اختبار مستمر لمدة ساعة
# مراقبة:
# - Memory usage (يجب أن يبقى ثابتاً)
# - CPU usage (يجب أن يكون منخفضاً)
# - Response times (يجب أن تبقى سريعة)
```

---

## 🔧 أسكريبت الاختبار الشامل

```bash
#!/bin/bash

echo "🧪 بدء اختبارات الأمان الشاملة"

# 1. اختبار Wildcard
echo "1️⃣ اختبار Wildcard Logic..."
npm run test:wildcard

# 2. اختبار Vote Eligibility
echo "2️⃣ اختبار Vote Eligibility..."
npm run test:vote-eligibility

# 3. اختبار Manual Score
echo "3️⃣ اختبار Manual Score Adjustment..."
npm run test:manual-score

# 4. اختبار Message Size
echo "4️⃣ اختبار Message Size Limit..."
npm run test:message-size

# 5. اختبار Rate Limiting
echo "5️⃣ اختبار Rate Limiting..."
npm run test:rate-limit

# 6. اختبار Input Sanitization
echo "6️⃣ اختبار Input Sanitization..."
npm run test:sanitization

# 7. اختبار Health
echo "7️⃣ اختبار Health Endpoints..."
npm run test:health

# 8. اختبار الأداء
echo "8️⃣ اختبار الأداء..."
npm run test:performance

echo "✅ انتهت جميع الاختبارات!"
```

---

## ✅ قائمة الاختبار قبل النشر

- [ ] جميع اختبارات الوحدة تمر
- [ ] جميع اختبارات التكامل تمر
- [ ] اختبار الأمان يمر
- [ ] اختبار الأداء مقبول (>1000 req/sec)
- [ ] latency <100ms
- [ ] Memory usage ثابت
- [ ] لا توجد memory leaks
- [ ] الـ health checks تعمل
- [ ] الـ logs واضحة
- [ ] Documentation محدثة

---

## 🚀 أوامر الاختبار السريعة

```bash
# جميع الاختبارات
npm test

# اختبار محدد
npm test -- --grep "Wildcard"

# اختبار مع coverage
npm test -- --coverage

# اختبار مراقبة
npm test -- --watch

# اختبار الأداء
npm run test:performance

# اختبار الأمان
npm run test:security
```

---

## 📝 ملاحظات مهمة

1. **يجب تشغيل جميع الاختبارات قبل النشر**
2. **اختبار الأداء حيوي** - تأكد من >1000 req/sec
3. **اختبر مع عدد حقيقي من الاتصالات** - على الأقل 100
4. **راقب الـ logs** - ابحث عن التحذيرات
5. **اختبر الـ edge cases** - الحالات الحدية مهمة جداً
