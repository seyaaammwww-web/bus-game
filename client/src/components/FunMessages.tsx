import { motion, AnimatePresence } from 'framer-motion';

interface FunMessage {
  id: string;
  text: string;
  emoji: string;
  duration?: number;
}

interface FunMessagesProps {
  messages: FunMessage[];
}

const messageVariants = {
  initial: { y: -100, opacity: 0, scale: 0.5 },
  animate: { y: 0, opacity: 1, scale: 1 },
  exit: { y: 100, opacity: 0, scale: 0.5 },
};

export function FunMessages({ messages }: FunMessagesProps) {
  return (
    <div className="fixed top-32 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            variants={messageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 25,
            }}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full font-bold shadow-lg backdrop-blur-md border border-white/20 whitespace-nowrap text-center"
          >
            <motion.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {msg.emoji} {msg.text}
            </motion.span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Fun messages for different events
export const funMessages = {
  correctAnswer: [
    { emoji: '✅', text: 'إجابة صحيحة!' },
    { emoji: '🎉', text: 'عبقري!' },
    { emoji: '⭐', text: 'أنت النجم!' },
    { emoji: '💯', text: 'مثالي!' },
    { emoji: '🔥', text: 'نار! نار!' },
  ],
  
  wrongAnswer: [
    { emoji: '❌', text: 'الجواب خاطئ' },
    { emoji: '😅', text: 'حاول مرة أخرى' },
    { emoji: '🤔', text: 'هممم...' },
    { emoji: '😬', text: 'آوض!' },
    { emoji: '🎪', text: 'للأسف!' },
  ],

  busComplete: [
    { emoji: '🚌', text: 'اكتمل الخط!' },
    { emoji: '⚡', text: 'سرعة فائقة!' },
    { emoji: '💨', text: 'الجميع معاً!' },
    { emoji: '🏁', text: 'النهاية المثالية!' },
    { emoji: '🎊', text: 'انفجار سعادة!' },
  ],

  freezeActivated: [
    { emoji: '🧊', text: 'مجمد! يتحرك بنصف السرعة' },
    { emoji: '❄️', text: 'برد قارس!' },
    { emoji: '⛸️', text: 'سكة جليدية!' },
    { emoji: '🥶', text: 'فقد الشعور!' },
  ],

  wildcardUsed: [
    { emoji: '✨', text: 'جوكر سحري!' },
    { emoji: '🎴', text: 'الجميع ملؤوا!' },
    { emoji: '🪄', text: 'عصا السحر تتحدث!' },
    { emoji: '⭐', text: 'نجم هابط!' },
  ],

  banishActivated: [
    { emoji: '💀', text: 'تم الطرد من اللعبة!' },
    { emoji: '👻', text: 'طاردك شبح!' },
    { emoji: '🚫', text: 'خارج اللعبة!' },
    { emoji: '🌪️', text: 'تم إزالتك!' },
  ],

  powerUpUnlocked: [
    { emoji: '🎁', text: 'مساعدة جديدة!' },
    { emoji: '🏆', text: 'أنت تستحق!' },
    { emoji: '⚡', text: 'قوة جديدة!' },
    { emoji: '💎', text: 'كنز!' },
  ],

  roundWin: [
    { emoji: '👑', text: 'أنت الملك!' },
    { emoji: '🥇', text: 'المركز الأول!' },
    { emoji: '🎖️', text: 'بطل!' },
    { emoji: '🌟', text: 'نجم الجولة!' },
    { emoji: '🚀', text: 'انطلاق للقمة!' },
  ],

  lastChance: [
    { emoji: '⚠️', text: 'آخر فرصة!' },
    { emoji: '⏱️', text: 'الوقت ينفد!' },
    { emoji: '🔔', text: 'استيقظ!' },
    { emoji: '🎯', text: 'ركز الآن!' },
  ],

  tie: [
    { emoji: '🤝', text: 'تعادل! تصفية!' },
    { emoji: '⚖️', text: 'متساويان!' },
    { emoji: '🎪', text: 'نفس النقاط!' },
    { emoji: '🔄', text: 'تكرار!' },
  ],
};

export function getRandomMessage(
  category: keyof typeof funMessages
): FunMessage {
  const msgs = funMessages[category];
  const msg = msgs[Math.floor(Math.random() * msgs.length)];
  return {
    ...msg,
    id: `${Date.now()}-${Math.random()}`,
    duration: 3000,
  };
}
