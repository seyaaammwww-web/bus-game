# 📚 دليل استخدام التحسينات

هذا الدليل يوضح كيفية استخدام جميع التحسينات التي تم تطبيقها على لعبة الأوتوبيس المصري.

---

## 🎯 الفهرس السريع

1. [مراقبة الأداء](#مراقبة-الأداء)
2. [الأمان و Rate Limiting](#الأمان-و-rate-limiting)
3. [إدارة الأخطاء](#إدارة-الأخطاء)
4. [مؤشرات التحميل](#مؤشرات-التحميل)
5. [Lazy Loading](#lazy-loading)
6. [تحسين الرسوم المتحركة](#تحسين-الرسوم-المتحركة)
7. [الوصول والتنقل](#الوصول-والتنقل)

---

## مراقبة الأداء

### استيراد المكتبة
```typescript
import { performanceMonitor, usePerformanceMonitoring } from '@/lib/performance';
```

### الاستخدام في مكون
```typescript
function GameDashboard() {
  const metrics = usePerformanceMonitoring();

  return (
    <div>
      <p>FPS الحالي: {metrics.fps}</p>
      <p>متوسط الذاكرة: {metrics.avgMemory}MB</p>
      <p>الأداء: {metrics.isPerformanceOptimal ? '✅ ممتاز' : '⚠️ منخفضة'}</p>
    </div>
  );
}
```

### التحذيرات التلقائية
```typescript
const warning = performanceMonitor.getPerformanceWarning();
if (warning) {
  console.warn(warning);
  // قد تكون: "Low FPS detected" أو "High memory usage detected"
}
```

### مسح السجل
```typescript
performanceMonitor.clearMetrics();
```

---

## الأمان و Rate Limiting

### 1. منع الـ Spam

#### على جانب العميل
```typescript
import { votingRateLimiter, messageRateLimiter } from '@/lib/security';

// التصويت
if (!votingRateLimiter.isAllowed(`vote_${playerId}`)) {
  console.error('تصويت بسرعة كبيرة!');
  return;
}

// الرسائل
if (!messageRateLimiter.isAllowed(`message_${playerId}`)) {
  console.error('رسائل بسرعة كبيرة!');
  return;
}

// معرفة عدد الطلبات المتبقية
const remaining = votingRateLimiter.getRemaining(`vote_${playerId}`);
console.log(`طلبات متبقية: ${remaining}`);
```

#### على جانب الخادم
```typescript
import { validateVotingAction, validateMessageAction } from '@/server/middleware/securityMiddleware';

// التحقق من التصويت
const result = validateVotingAction(playerId, playerRole, voteData);
if (!result.allowed) {
  return res.status(429).json({ error: result.reason });
}

// التحقق من الرسائل
const msgResult = validateMessageAction(playerId, playerRole, message);
if (!msgResult.allowed) {
  return res.status(429).json({ error: msgResult.reason });
}

const sanitized = msgResult.sanitized; // رسالة مطهرة من XSS
```

### 2. التحقق من الصلاحيات

```typescript
import { validatePlayerPermission, canPerformAction } from '@/lib/security';

// التحقق من الدور
const isHost = validatePlayerPermission('host', ['host']);
const canParticipate = validatePlayerPermission('participant', ['participant', 'host']);

// التحقق من العملية
const canVote = canPerformAction('participant', 'vote'); // true
const canOverride = canPerformAction('spectator', 'override'); // false
```

### 3. تسجيل العمليات (Audit Log)

```typescript
import { auditLogger } from '@/server/middleware/securityMiddleware';

// تسجيل عملية
auditLogger.log({
  timestamp: Date.now(),
  playerId: 'player123',
  playerRole: 'host',
  action: 'override_vote',
  resourceId: 'vote_456',
  result: 'success',
  metadata: { voteValue: true }
});

// الاستعلام عن السجلات
const playerLogs = auditLogger.getLogs({ playerId: 'player123' });
const voteLogs = auditLogger.getLogs({ action: 'vote' });
```

---

## إدارة الأخطاء

### تسجيل الأخطاء
```typescript
import { errorLogger, ErrorSeverity } from '@/lib/errorLogger';

// خطأ عادي
errorLogger.log('خطأ عادي', ErrorSeverity.LOW);

// تحذير
errorLogger.log('تحذير مهم', ErrorSeverity.MEDIUM, {
  component: 'VotingOverlay',
  context: { playerId: '123' }
});

// خطأ حرج (يُرسل تلقائياً إلى webhook)
errorLogger.log('خطأ حرج!', ErrorSeverity.CRITICAL, {
  component: 'GameManager',
  stack: error.stack
});
```

### الحصول على رسائل صديقة للمستخدم
```typescript
import { getUserErrorMessage } from '@/lib/errorLogger';

const message = getUserErrorMessage('NETWORK_ERROR');
// "حدث خطأ في الاتصال. تحقق من اتصالك بالإنترنت."

const messages = {
  NETWORK_ERROR: 'خطأ شبكة',
  TIMEOUT: 'انتهت المهلة',
  SERVER_ERROR: 'خطأ الخادم',
  // ... إلخ
};
```

### عرض الأخطاء للمستخدم
```typescript
function MyComponent() {
  const [error, setError] = useState<string | null>(null);

  const handleVote = async () => {
    try {
      // عملية التصويت
    } catch (err) {
      const message = err instanceof Error 
        ? getUserErrorMessage(err.message)
        : 'حدث خطأ غير معروف';
      
      setError(message);
      errorLogger.log(message, ErrorSeverity.MEDIUM);
    }
  };

  return (
    <>
      {error && <div className="alert alert-error">{error}</div>}
      <button onClick={handleVote}>صوّت</button>
    </>
  );
}
```

---

## مؤشرات التحميل

### استخدام مؤشرات التحميل
```typescript
import { LoadingSpinner } from '@/components/LoadingSpinner';

// مؤشر بسيط
<LoadingSpinner size="md" variant="spinner" />

// مع تسمية
<LoadingSpinner 
  size="lg" 
  variant="dots"
  label="جاري التحميل..."
/>

// ملء الشاشة
<LoadingSpinner 
  fullScreen 
  variant="bars"
  label="يرجى الانتظار..."
/>

// أنواع المؤشرات
// - spinner: مؤشر دوار
// - dots: نقاط متحركة
// - bars: أعمدة متحركة
// - pulse: نبضة ضوء
```

---

## Lazy Loading

### تحميل الصور بكسل
```typescript
import { LazyImage, LazyProgressiveImage } from '@/components/LazyLoader';

// صورة بسيطة
<LazyImage 
  src="image.png" 
  alt="صورة"
  className="w-full h-auto"
/>

// صورة متدرجة (جودة منخفضة أولاً)
<LazyProgressiveImage
  lowSrc="image-low.jpg"
  highSrc="image-high.jpg"
  alt="صورة"
  className="w-full"
/>
```

### تحميل الحاويات
```typescript
import { LazyContainer } from '@/components/LazyLoader';

<LazyContainer 
  onVisible={() => console.log('مرئي الآن!')}
  threshold={0.25}
>
  <ExpensiveComponent />
</LazyContainer>
```

### تحميل البيانات بكسل
```typescript
import { useLazyData, fetchWithRetry } from '@/components/LazyLoader';

function PlayerStats() {
  const { data, loading, error } = useLazyData(
    () => fetchWithRetry('/api/players/123/stats'),
    []
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <div>خطأ: {error.message}</div>;
  
  return <div>{JSON.stringify(data)}</div>;
}
```

### كشف الرؤية
```typescript
import { useInView } from '@/components/LazyLoader';

function MyComponent() {
  const [ref, isInView] = useInView({ threshold: 0.5 });

  return (
    <div ref={ref}>
      {isInView ? 'مرئي' : 'غير مرئي'}
    </div>
  );
}
```

---

## تحسين الرسوم المتحركة

### الحصول على إعدادات الرسوم المتحركة
```typescript
import { useAnimationConfig } from '@/lib/animationOptimizer';

function AnimatedCard() {
  const { shouldAnimate, getVariant, getDuration, getDelay } = useAnimationConfig();

  return (
    <motion.div
      initial="hidden"
      animate={shouldAnimate ? 'visible' : 'hidden'}
      variants={getVariant('moderate')}
      transition={{ duration: getDuration(400) }}
    >
      محتوى
    </motion.div>
  );
}
```

### مستويات التعقيد
```typescript
// رسوم بسيطة (فقط opaciy و scale)
const simple = getVariant('simple');

// رسوم متوسطة (opacity, scale, y مع spring)
const moderate = getVariant('moderate');

// رسوم معقدة (كل شيء مع rotation)
const complex = getVariant('complex');
```

### تعطيل الرسوم المتحركة على الأجهزة الضعيفة
```typescript
import { animationOptimizer } from '@/lib/animationOptimizer';

// تعطيل
animationOptimizer.disableAnimations();

// تفعيل
animationOptimizer.enableAnimations();

// التحقق
if (!animationOptimizer.shouldAnimate()) {
  console.log('الرسوم المتحركة معطلة');
}
```

---

## الوصول والتنقل

### استخدام ARIA Labels
```typescript
// أوفرلاي
<motion.div
  role="dialog"
  aria-modal="true"
  aria-label="نافذة التصويت"
  onKeyDown={(e) => {
    if (e.key === 'Escape') onClose();
  }}
>
  {children}
</motion.div>

// مجموعة تصويت
<div
  role="group"
  aria-label="التصويت على الإجابة"
  tabIndex={0}
>
  {items}
</div>

// حالة التحميل
<div
  role="status"
  aria-live="polite"
  aria-label="جاري التحميل"
>
  <LoadingSpinner />
</div>
```

### اختصارات لوحة المفاتيح
```typescript
// إغلاق الأوفرلاي بـ ESC
onKeyDown={(e) => {
  if (e.key === 'Escape') {
    onClose();
    e.stopPropagation();
  }
}}

// التنقل بـ Tab (تلقائي)
// Enter لتفعيل الأزرار (تلقائي)
```

---

## 📊 أمثلة عملية

### مثال 1: مكون تصويت محسّن
```typescript
import { memo, useState, useCallback } from 'react';
import { votingRateLimiter } from '@/lib/security';
import { errorLogger, ErrorSeverity } from '@/lib/errorLogger';
import { useAnimationConfig } from '@/lib/animationOptimizer';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const VotingButton = memo(function VotingButton({
  itemId,
  playerId,
  onVote
}: {
  itemId: string;
  playerId: string;
  onVote: (vote: 'yes' | 'no') => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { shouldAnimate, getVariant } = useAnimationConfig();

  const handleVote = useCallback(async (vote: 'yes' | 'no') => {
    // Rate limiting
    if (!votingRateLimiter.isAllowed(`vote_${playerId}`)) {
      setError('تصويت بسرعة كبيرة');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onVote(vote);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'خطأ غير معروف';
      setError(message);
      errorLogger.log(message, ErrorSeverity.MEDIUM, {
        component: 'VotingButton'
      });
    } finally {
      setLoading(false);
    }
  }, [playerId, onVote]);

  if (loading) return <LoadingSpinner size="sm" />;

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}
      <motion.button
        onClick={() => handleVote('yes')}
        initial="hidden"
        animate={shouldAnimate ? 'visible' : 'hidden'}
        variants={getVariant('simple')}
      >
        نعم
      </motion.button>
    </div>
  );
});

export default VotingButton;
```

### مثال 2: قائمة لاعبين مع lazy loading
```typescript
import { LazyContainer, LazyImage } from '@/components/LazyLoader';
import { memo } from 'react';

const PlayerCard = memo(({ player }: { player: Player }) => (
  <LazyContainer threshold={0.25}>
    <div className="player-card">
      <LazyImage
        src={player.avatar}
        alt={player.name}
        className="w-12 h-12 rounded-full"
      />
      <h3>{player.name}</h3>
      <p>النقاط: {player.score}</p>
    </div>
  </LazyContainer>
));

export function PlayersList({ players }: { players: Player[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {players.map(player => (
        <PlayerCard key={player.id} player={player} />
      ))}
    </div>
  );
}
```

---

## 🧪 الاختبار

### تشغيل اختبارات الاستجابة
```bash
npx playwright test tests/responsiveness.spec.ts
```

### مراقبة الأداء أثناء التطوير
```bash
npm run dev
# ثم افتح DevTools وراقب الـ Console و Performance
```

### بناء للإنتاج
```bash
npm run build
# تحقق من الأخطاء
npm run check
```

---

## 💡 أفضل الممارسات

1. ✅ استخدم `React.memo` للمكونات التي تتكرر كثيراً
2. ✅ استخدم `useCallback` لتجنب إعادة إنشاء الدوال
3. ✅ استخدم `LazyContainer` للمحتوى الثقيل
4. ✅ سجّل جميع الأخطاء الحرجة
5. ✅ استخدم ARIA labels للتحسين الوصول
6. ✅ اختبر على الأجهزة الحقيقية
7. ✅ راقب الأداء بانتظام

---

## ❓ الأسئلة الشائعة

**س: هل يمكن تعطيل مؤشرات التحميل؟**
ج: نعم، في الإنتاج يمكن تقليل مدة المؤشرات.

**س: كيف أرسل أخطاء إلى Discord؟**
ج: أضف webhook URL عند إنشاء ErrorLogger:
```typescript
const errorLogger = new ErrorLogger('https://discord.webhook.url');
```

**س: هل rate limiting يعمل تلقائياً؟**
ج: نعم، لكن يجب التحقق منه يدويًا على جانب الخادم.

**س: كيف أختبر على أجهزة مختلفة؟**
ج: استخدم Playwright أو DevTools Chrome.

---

تم تحديث هذا الدليل: **27 فبراير 2026**

للمزيد من المساعدة، راجع `IMPROVEMENTS_SUMMARY.md`.
