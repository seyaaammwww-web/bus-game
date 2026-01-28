# نظام المساعدات (Power-ups) - التوثيق التقني

## نظرة عامة
نظام يسمح للاعبين باستخدام مساعدات خاصة أثناء اللعب، بدء من الـ Freeze Time كأول مساعدة.

## آلية الحصول على المساعدات
- اللاعب يحصل على `1 freeze` عند تجميع **100 نقطة**
- اللاعب يحصل على `2 freeze` عند تجميع **200 نقطة**
- اللاعب يحصل على **3 freeze** (وكل المساعدات الأخرى x3) عند تجميع **350 نقطة**

## مساعدة Freeze Time (تجميد الوقت)

### الوصف
تجميد الوقت للاعب الذي فعّلها، مما يسمح له بكتابة الإجابات بدون ضغط زمني.

### سلوك النظام

#### للاعب الذي فعّل Freeze:
1. ✅ الوقت يتوقف **له فقط**
2. ✅ زر "Complete" يصير **مفتوح حتى لو ما كتب كل الإجابات**
3. ✅ يظهر **Ice overlay animation** على الشاشة
4. ✅ يمكنه كتابة الإجابات اللي يعرفها فقط والضغط Complete
5. ✅ باقي اللاعبين ينتظرونه في **Referee Review screen**

#### للاعبين الآخرين:
1. 📍 يظهر **"FREEZE" notification** مع animation fade من تحت
2. ⏱️ الوقت يسير **عادي** لهم
3. 👁️ يظهرلهم اسم اللاعب الذي جمد الوقت
4. ⏳ يتم نقلهم إلى **Waiting/Referee Review screen**

### القواعد المنطقية الصارمة
1. ❌ لا يمكن استخدام مساعدة إذا كانت مساعدة أخرى **مستخدمة بالفعل في الجولة**
2. ❌ **نفس اللاعب فقط** يمكنه استخدام نفس المساعدة
3. 🔄 المساعدات تُعاد تعيينها مع **كل جولة جديدة**
4. ⏹️ المساعدة المستخدمة تُستنفذ نهائياً (يُطرح عدد من powerUps)

### رسالة المساعدة

```
🥶 تــم تــجــمــيــد الــوقــت!
تمتع بوقتك براحتك واكتب الإجابات اللي أنت عارفها
```

---

## البنية التقنية

### Server-side (gameManager.ts)

#### إنشاء جولة جديدة
```typescript
const round: Round = {
  // ...
  powerUpUsedInRound: false,  // يتتبع استخدام أي مساعدة
  frozenPlayerId: null,        // معرّف اللاعب المجمد
  frozenPlayerTimeLeft: 0,     // الوقت المتبقي للاعب المجمد
};
```

#### تفعيل Freeze
```typescript
private activateFreeze(ws: WebSocket): void {
  // 1. التحقق من وجود مساعدات
  // 2. التحقق من عدم استخدام مساعدة سابقة في الجولة
  // 3. تقليل عدد المساعدات
  // 4. تعيين حالة الفريز
  // 5. إخطار اللاعبين
}
```

#### تقديم الإجابات
```typescript
submitAnswers(ws: WebSocket, answers: RoundAnswers): void {
  // يسمح بإجابات ناقصة إذا كان اللاعب مجمداً
  const isFrozen = round.frozenPlayerId === playerInfo.playerId;
  if (isFrozen) {
    // قبول إجابات ناقصة ✅
  }
}
```

#### إنهاء الجولة
```typescript
private endRound(room: GameRoom): void {
  // إذا كان هناك لاعب مجمد لم يقدم إجاباته:
  if (round.frozenPlayerId && !hasSubmitted) {
    // انتظر حتى يقدم الإجابات (لا تنتقل للـ ai_processing)
    return;
  }
  // إذا قدم جميع اللاعبين (بما فيهم المجمد):
  // انتقل لـ ai_processing والتصحيح
}
```

### Client-side (gameContext.tsx)

#### حالة النظام
```typescript
const [isFrozen, setIsFrozen] = useState(false);

// عند استقبال `player_frozen` message:
if (message.payload.frozen) {
  setIsFrozen(true); // تفعيل الـ UI
}
```

#### إعادة التعيين
```typescript
case 'round_start':
  setIsFrozen(false); // إعادة تعيين عند جولة جديدة
  break;
```

### UI Components

#### `FreezePowerUp.tsx`
- زر الـ Freeze في الأعلى
- يظهر عدد المساعدات المتاحة
- animation عند التفعيل

#### `FreezeOverlay.tsx`
- Overlay للاعب المجمد فقط
- Ice crystal animations
- رسالة التجميد المركزية

#### `FreezeNotification.tsx`
- Notification للاعبين الآخرين
- "FREEZE" text مع animation fade
- اسم اللاعب الذي جمد الوقت

### Messages تبادل البيانات

#### Client → Server
```json
{
  "type": "activate_powerup",
  "payload": { "type": "freeze" }
}
```

#### Server → All Players
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

#### Server → Frozen Player
```json
{
  "type": "player_frozen",
  "payload": {
    "frozen": true,
    "message": "الوقت متوقف لك! أكمل إجاباتك واضغط باص كومبليت"
  }
}
```

#### Server → Other Players
```json
{
  "type": "player_frozen",
  "payload": {
    "frozen": false,
    "message": "في انتظار انتهاء اللاعب الذي جمد الوقت..."
  }
}
```

---

## Flow الرسم البياني

```
Freeze Power-up Flow:
├─ اللاعب يضغط زر Freeze
├─ Server يتحقق:
│  ├─ هل لديه مساعدات؟ ✓
│  └─ هل استُخدمت مساعدة سابقة؟ ✓
├─ تفعيل الفريز
├─ Server يخطر الجميع
├─ اللاعب المجمد:
│  ├─ يرى Ice overlay
│  ├─ الوقت متوقف له
│  ├─ يكتب إجابات ناقصة OK ✅
│  └─ يضغط Complete
├─ باقي اللاعبين:
│  ├─ يرون "FREEZE" notification
│  ├─ الوقت يسير عادي
│  └─ ينتظرون في Referee screen
└─ جميع اللاعبين قدموا
   └─ Server → ai_processing → evaluation
```

---

## حالات استثنائية

| الحالة | السلوك |
|--------|--------|
| اللاعب ليس لديه مساعدات | ❌ رسالة خطأ |
| مساعدة مستخدمة بالفعل | ❌ رسالة خطأ |
| اللعبة لم تكن في مرحلة playing | ❌ تجاهل |
| اللاعب المجمد لم يقدم إجابات | ⏳ انتظار |

---

## الخطوات التالية (المساعدات الأخرى)

1. **Hint** - تلميح لحرف من الإجابة
2. **Steal** - سرقة إجابة من لاعب آخر

المنطقية ستكون متشابهة مع التحقق من:
- توفر المساعدات
- عدم استخدام مساعدة سابقة في الجولة
- تأثير واضح على اللاعبين الآخرين
