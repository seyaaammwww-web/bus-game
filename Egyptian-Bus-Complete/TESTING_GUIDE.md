# 🧪 دليل سريع للاختبار - Freeze Power-up System

## تشغيل التطبيق

```bash
# 1. تأكد من تثبيت المتطلبات
npm install

# 2. ابدأ السيرفر والـ client
npm run dev
```

---

## ✅ Checklist الاختبار السريع

### Test 1: الحصول على المساعدات
- [ ] اعتمد على الكود في `updatePlayerPowerUps()` في gameManager.ts
- [ ] تحقق من:
  - 100 نقطة → 1 freeze
  - 200 نقطة → 2 freeze
  - 350 نقطة → 3 freeze + كل المساعدات

### Test 2: تفعيل Freeze بنجاح
1. افتح اللعبة مع لاعبين (localhost أو اختبر محلياً)
2. ابدأ جولة
3. أحد اللاعبين يضغط زر الـ Snowflake (Freeze)
4. **المتوقع**:
   - ✅ Ice overlay يظهر على الشاشة
   - ✅ رسالة "تم تجميد الوقت"
   - ✅ اللاعبين الآخرين يرون "FREEZE" notification
   - ✅ الزر يصير مفعول (disabled)

### Test 3: الإجابات الناقصة
1. بعد ظهور الـ Ice overlay
2. اللاعب المجمد يكتب إجابات ناقصة (مثلا 2 من 5)
3. يضغط "Complete"
4. **المتوقع**:
   - ✅ قبول الإجابات بدون خطأ
   - ✅ انتقال للمرحلة التالية

### Test 4: منع مساعدات متعددة
1. اللاعب A يضغط Freeze
2. اللاعب B يحاول يضغط Freeze (قبل انتهاء الجولة)
3. **المتوقع**:
   - ❌ رسالة خطأ: "تم استخدام مساعدة بالفعل"
   - ✅ زر Freeze مفعول (disabled)

### Test 5: إعادة التعيين
1. جولة تنتهي مع Freeze
2. جولة جديدة تبدأ
3. **المتوقع**:
   - ✅ الـ Ice overlay يختفي
   - ✅ isFrozen state يعود false
   - ✅ يمكن استخدام Freeze مرة أخرى (إذا كان متاح)

### Test 6: Server Logs
افتح console للسيرفر وتحقق من:
```
[Freeze] ❄️ {PlayerName} activated FREEZE! Remaining: {count}
[Submit] Frozen player {PlayerName} submitting (possibly partial answers)
[End Round] All players have submitted. Ending round.
```

---

## 🐛 Debugging

### المشاكل الشائعة والحلول

#### المشكلة: الـ Ice Overlay لم يظهر
```
السبب المحتمل: isFrozen state لم يُضبط
الحل:
1. تحقق من handleMessage في gameContext.tsx
2. تأكد من استقبال 'player_frozen' message
3. تحقق من console للـ network messages
```

#### المشكلة: اللاعب المجمد ما يقدر يضغط Complete
```
السبب المحتمل: canBusComplete logic خاطئ
الحل:
1. تحقق من: const canBusComplete = allFilled || isFrozen;
2. تأكد من انتقال isFrozen صحيح من context
```

#### المشكلة: لاعب آخر يضغط Freeze والسيرفر لم يقبله
```
السبب المحتمل: powerUpUsedInRound flag لم يُضبط
الحل:
1. تحقق من activateFreeze() في gameManager.ts
2. تأكد من: round.powerUpUsedInRound = true;
```

---

## 📊 Console Logs للتتبع

### في Browser Console:
```javascript
// تتبع حالة isFrozen
useEffect(() => {
  console.log('isFrozen changed:', isFrozen);
}, [isFrozen]);

// تتبع activePowerUp
useEffect(() => {
  console.log('activePowerUp:', currentRound?.activePowerUp);
}, [currentRound?.activePowerUp]);
```

### في Server Console:
```
[Freeze] Checks before activation:
  - Has powerUps: {value}
  - PowerUp not used: {value}
  - In playing phase: {value}

[Submit] Player submission:
  - isFrozen: {value}
  - Answers: {count} filled
  - Total players: {count}

[End Round] Waiting status:
  - frozenPlayerId: {id}
  - Has submitted: {value}
  - Returning early: {value}
```

---

## 🎨 Visual Verification

### الـ UI elements التي يجب أن تظهر:

1. **زر Freeze** (أعلى اليمين)
   - أزرق اللون مع Snowflake icon
   - يعرض عدد المساعدات (مثلا: ❄️ 3)

2. **Ice Overlay** (عند الفريز)
   - خلفية زرقاء شبه شفافة
   - رسالة بيضاء في المنتصف
   - Snowflake rotating

3. **FREEZE Notification** (للآخرين)
   - في الأعلى الأوسط
   - Fade animation من تحت
   - اسم اللاعب + FREEZE text

---

## 🔍 Network Monitoring

### استخدام DevTools > Network:

1. **عند تفعيل Freeze**:
```json
{
  "type": "activate_powerup",
  "payload": { "type": "freeze" }
}
```

2. **رد السيرفر للجميع**:
```json
{
  "type": "powerup_activated",
  "payload": {
    "type": "freeze",
    "playerId": "...",
    "playerName": "..."
  }
}
```

3. **عند submit**:
```json
{
  "type": "submit_answers",
  "payload": { "answers": {...} }
}
```

---

## 📋 Manual Test Scenarios

### Scenario 1: Happy Path
```
1. لاعب يبدأ جولة
2. يضغط Freeze
3. يكتب إجابات (ناقصة مثلا)
4. يضغط Complete
5. الجولة تنتهي وتبدأ التقييم
✅ كل شيء يعمل بسلاسة
```

### Scenario 2: Edge Case - Freeze + Complete متتالي
```
1. لاعب يضغط Freeze
2. يضغط Complete فوراً
3. لاعب آخر يرسل إجاباته
✅ السيرفر ينتظر حتى نهاية الجولة
```

### Scenario 3: Multiple Players
```
1. 4 لاعبين في جولة
2. اللاعب 1 يضغط Freeze
3. اللاعبين 2,3,4 يرسلون إجابات
4. اللاعب 1 يرسل إجاباته أخيراً
✅ السيرفر لا ينتقل لـ ai_processing لحد ما يرسل كل أحد
```

---

## 🚀 Performance Checks

### Metrics للقياس:
- **Response time** عند Freeze: < 100ms
- **Network delay** للـ notifications: < 200ms
- **UI render time** للـ overlay: < 50ms
- **Memory**: بدون تسريب عند iterations

### الأدوات:
```javascript
// Chrome DevTools > Performance
// سجل الـ freeze action والتحقق من:
- Layout shifts
- Paint timing
- JavaScript execution
```

---

## ✅ Sign-off Checklist

- [ ] Freeze تفعيل يعمل 100%
- [ ] Ice overlay يظهر صحيح
- [ ] FREEZE notification يظهر للآخرين
- [ ] إجابات ناقصة قابلة للقبول
- [ ] منع مساعدات متعددة يعمل
- [ ] إعادة التعيين تعمل صحيح
- [ ] Server logs واضحة ومفيدة
- [ ] لا توجد console errors
- [ ] الأداء ممتازة
- [ ] التوثيق شامل

---

**بعد اجتياز جميع الفحوصات، النظام جاهز للمرحلة التالية!** 🎉
