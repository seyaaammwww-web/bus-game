/**
 * توحيد ثوابت الاعدادات اللعبة
 * تعريف واحد لكل قيمة لتجنب التضارب والأخطاء
 */

export const GAME_CONFIG = {
    // مدة الجولة الأساسية
    ROUND_DURATION_MS: 45000, // 45 ثانية
    
    // مدة التصويت
    VOTE_DURATION_MS: 30000, // 30 ثانية
    
    // مدة وضع السرعة (Rush Mode)
    RUSH_MODE_DURATION_MS: 10000, // 10 ثواني
    
    // الحد الأقصى للاعبين في غرفة واحدة
    MAX_PLAYERS: 50,
    
    // الحد الأقصى لعدد الغرف
    MAX_ROOMS: 100,
    
    // مدة timeout الـ pong
    PONG_TIMEOUT_MS: 60000, // 60 ثانية
    
    // مدة مسح الاتصالات الميتة
    CLEANUP_INTERVAL_MS: 15000, // 15 ثانية
    
    // مدة الـ heartbeat من الخادم
    HEARTBEAT_INTERVAL_MS: 30000, // 30 ثانية
    
    // حد أقصى لحجم الرسالة
    MAX_MESSAGE_SIZE: 65536, // 64 KB
    
    // حد أقصى للطلبات من لاعب واحد (تقييم سرعة)
    RATE_LIMIT_REQUESTS: 100,
    
    // مدة نافذة تقييم السرعة
    RATE_LIMIT_WINDOW_MS: 60000, // دقيقة واحدة
} as const;

// Export للقيم الفردية للاستخدام المباشر
export const {
    ROUND_DURATION_MS,
    VOTE_DURATION_MS,
    RUSH_MODE_DURATION_MS,
    MAX_PLAYERS,
    MAX_ROOMS,
    PONG_TIMEOUT_MS,
    CLEANUP_INTERVAL_MS,
    HEARTBEAT_INTERVAL_MS,
    MAX_MESSAGE_SIZE,
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_WINDOW_MS,
} = GAME_CONFIG;
