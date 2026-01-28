# خارطة الطريق - نظام المساعدات (Power-ups)

## ✅ المرحلة 1: Freeze Time (مكتملة)

### الإنجازات:
- ✅ Schema تحديث (powerUpUsedInRound, frozenPlayerId)
- ✅ منطق Server-side (activateFreeze, submitAnswers مع إجابات ناقصة, endRound)
- ✅ منطق Client-side (gameContext, isFrozen state)
- ✅ UI Components (FreezePowerUp, FreezeOverlay, FreezeNotification)
- ✅ Game Page integration
- ✅ Documentation & Test Cases

### الميزات المطبقة:
- تجميد الوقت فقط للاعب الذي فعّلها
- قبول إجابات ناقصة من المجمد
- انتظار الجولة حتى ينهي المجمد
- منع استخدام مساعدات أخرى في نفس الجولة
- تنبيهات واضحة لجميع اللاعبين

---

## 🔄 المرحلة 2: Hint (التلميح)

### المتطلبات:
```typescript
// في gameManager.ts
private activateHint(ws: WebSocket): void {
  // 1. التحقق من المساعدات
  // 2. التحقق من عدم استخدام مساعدة سابقة
  // 3. اختيار إجابة عشوائية من معقول الإجابات
  // 4. إظهار حرف واحد من الإجابة
  // 5. إسقاط عدد من النقاط عند التصحيح
}
```

### UI Components المطلوبة:
- `HintPowerUp.tsx` - زر التلميح (أصفر/ذهبي)
- `HintOverlay.tsx` - عرض التلميح (حرف منير من الإجابة)
- `HintNotification.tsx` - إخطار للآخرين

### ألوان مقترحة:
- Background: من amber-500 إلى amber-600
- Icon: Lightbulb
- Animation: Pulse + brightness increase

---

## 🎯 المرحلة 3: Steal (السرقة)

### المتطلبات:
```typescript
// في gameManager.ts
private activateSteal(ws: WebSocket): void {
  // 1. التحقق من المساعدات
  // 2. التحقق من عدم استخدام مساعدة سابقة
  // 3. اختيار لاعب آخر عشوائياً
  // 4. اختيار إجابة من إجاباته
  // 5. إضافتها لإجابات اللاعب الذي استخدم Steal
  // 6. إلغاء تلك الإجابة من اللاعب الأصلي
}
```

### UI Components المطلوبة:
- `StealPowerUp.tsx` - زر السرقة (أحمر/وردي)
- `StealAnimation.tsx` - animation المسروقة تتحرك بين اللاعبين
- `StealNotification.tsx` - إخطار المجني عليه

### ألوان مقترحة:
- Background: من red-500 إلى rose-600
- Icon: Copy/Zap
- Animation: منتصف الشاشة تتحرك الإجابة

---

## 📋 Checklist للاختبار

### اختبار Freeze:
- [ ] اللاعب ب 0 مساعدات يأخذ خطأ
- [ ] اللاعب ب 100+ نقطة يحصل على 1 freeze
- [ ] اللاعب ب 200+ نقطة يحصل على 2 freeze
- [ ] اللاعب ب 350+ نقطة يحصل على 3 freeze
- [ ] عدم السماح باستخدام مساعدة ثانية في نفس الجولة
- [ ] قبول إجابات ناقصة من المجمد
- [ ] انتظار الجولة للاعب المجمد
- [ ] عرض صحيح للـ overlays والـ notifications
- [ ] إعادة التعيين في جولة جديدة

### اختبار Hint (عند التطبيق):
- [ ] عرض تلميح صحيح
- [ ] خصم نقاط عند التقييم
- [ ] عدم السماح باستخدام freeze و hint في نفس الجولة

### اختبار Steal (عند التطبيق):
- [ ] سرقة إجابة صحيحة
- [ ] إزالة الإجابة من اللاعب الأصلي
- [ ] تحديث النقاط صحيح

---

## 🎨 توصيات التصميم الإضافي

### Animations:
- **Freeze**: Ice crystals, snowflakes, blue glow
- **Hint**: Light bulb flash, golden glow, letter highlight
- **Steal**: Arrow animation بين اللاعبين, red spark particles

### Sound Effects:
- **Freeze**: cold wind sound + ice crackle
- **Hint**: light bulb ding + notification sound
- **Steal**: whoosh + alarm sound

### Visual Hierarchy:
- Frozen player: Overlay شبه شفاف مع رسالة واضحة
- Other players: Notification صغيرة في الأعلى
- Buttons: متدرج الألوان، واضح الحالة (enabled/disabled)

---

## 📝 ملاحظات مهمة

1. **الترتيب**: لا تطبق مساعدات أخرى قبل اختبار Freeze كاملاً
2. **Database**: تأكد من حفظ عدد المساعدات في قاعدة البيانات
3. **Balance**: تأكد من عدم إفساد التوازن (المساعدات يجب أن تكون مساعدات فقط)
4. **Documentation**: حدّث الـ README وكل التوثيق

---

## 🚀 النسخة النهائية

بعد اختبار جميع المساعدات:
- ✅ نشر النظام للمستخدمين الفعليين
- ✅ جمع الفيدباك
- ✅ تعديلات التوازن حسب الحاجة
- ✅ إضافة animations نهائية
- ✅ Performance optimization
