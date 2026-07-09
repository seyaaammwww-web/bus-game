import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { RetroCard } from '@/components/ui/RetroCard';
import { ChevronRight, ChevronLeft, X, Trophy, Zap, Skull, Sparkles, Users, Gavel } from 'lucide-react';

interface TutorialProps {
    onClose: () => void;
}

export function Tutorial({ onClose }: TutorialProps) {
    const [step, setStep] = useState(0);

    const slides = [
        {
            title: "أهلاً بيك في أتوبيس كومبليت! 🚌",
            content: (
                <div className="space-y-4 text-center">
                    <p className="text-xl font-bold text-[#4c1d95]">لعبة الحروف اللي كلنا بنحبها..</p>
                    <p className="text-base text-[#6d28d9]">الهدف: املأ الخانات (ولد، بنت، حيوان..) بحرف معين أسرع من غيرك!</p>
                    <div className="flex justify-center gap-2 mt-4">
                        <span className="bg-amber-400 px-3 py-1.5 rounded-full text-sm font-semibold text-amber-950 shadow-sm">سرعة</span>
                        <span className="bg-purple-600 px-3 py-1.5 rounded-full text-sm font-semibold text-white shadow-sm">ذكاء</span>
                        <span className="bg-white px-3 py-1.5 rounded-full text-sm font-semibold text-[#4c1d95] shadow-sm border border-purple-200/50">تركيز</span>
                    </div>
                </div>
            ),
            icon: (
                <motion.img 
                    src="/assets/logo.png" 
                    alt="اتوبيس كومبليت"                   
                    className="w-32 h-auto mx-auto mb-4 object-contain"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                />
            )
        },
        {
            title: "نظام النقط المحدث ⭐",
            content: (
                <ul className="text-right space-y-3 px-4">
                    <li className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-xs">20</span>
                        <span className="font-bold text-[#4c1d95]">إجابة صحيحة ومميزة (محدش كتب زيها)</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center font-bold text-xs">10</span>
                        <span className="font-bold text-[#4c1d95]">إجابة صحيحة بس مكررة</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-xs">0</span>
                        <span className="font-bold text-[#4c1d95]">إجابة غلط أو فاضية</span>
                    </li>
                    <li className="flex items-center gap-2 border-t-2 border-dashed border-[#4c1d95]/20 pt-2 mt-2">
                        <Trophy className="w-5 h-5 text-orange-500" />
                        <span className="font-bold text-orange-600">بونص: 10 نقط لو قفلت الأتوبيس (Bus Complete) 3 مرات ورا بعض!</span>
                    </li>
                </ul>
            ),
            icon: <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        },
        {
            title: "المساعدات (Power-ups) 🔥",
            content: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-red-50 p-3 rounded-lg border-2 border-red-200 text-center">
                        <Skull className="w-8 h-8 text-red-500 mx-auto mb-2" />
                        <h4 className="font-bold text-red-700">الطرد (Banish)</h4>
                        <p className="text-xs text-red-600 font-bold my-1">400 نقطة</p>
                        <p className="text-[10px] text-red-500">جمد خصمك وامنعهم من الكتابة لجولة!</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg border-2 border-purple-200 text-center">
                        <Sparkles className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                        <h4 className="font-bold text-purple-700">الجوكر (Wildcard)</h4>
                        <p className="text-xs text-purple-600 font-bold my-1">200 نقطة</p>
                        <p className="text-[10px] text-purple-500">الكمبيوتر هيحللك الجولة كلها صح!</p>
                    </div>
                </div>
            ),
            icon: <Zap className="w-16 h-16 text-orange-500 mx-auto mb-4" />
        },
        {
            title: "أنظمة التحكيم الجديدة ⚖️",
            content: (
                <div className="space-y-4">
                    <div className="flex items-start gap-3 bg-white/50 p-3 rounded-lg border-2 border-[#4c1d95]/10">
                        <Users className="w-6 h-6 text-blue-600 mt-1" />
                        <div>
                            <h4 className="font-bold text-[#4c1d95] text-sm">التحكيم الديمقراطي</h4>
                            <p className="text-xs text-[#6d28d9]">اللاعبين بيصوتوا لبعض (مع/ضد). الأغلبية بتحكم!</p>
                        </div>
                    </div>
                    <div className="text-center font-bold text-[#4c1d95]/50 text-xs">- أو -</div>
                    <div className="flex items-start gap-3 bg-white/50 p-3 rounded-lg border-2 border-[#4c1d95]/10">
                        <Gavel className="w-6 h-6 text-green-600 mt-1" />
                        <div>
                            <h4 className="font-bold text-[#4c1d95] text-sm">حكم للمباراة</h4>
                            <p className="text-xs text-[#6d28d9]">اختاروا واحد يكون حكم، هو اللي بيقبل ويرفض ويعدل النتايج.</p>
                        </div>
                    </div>
                </div>
            ),
            icon: <Gavel className="w-16 h-16 text-[#4c1d95] mx-auto mb-4" />
        }
    ];

    const nextStep = () => setStep((s) => Math.min(s + 1, slides.length - 1));
    const prevStep = () => setStep((s) => Math.max(s - 1, 0));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-md"
            >
                <RetroCard className="relative overflow-hidden bg-white">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="absolute top-2 left-2 text-gray-400 hover:text-red-500 z-10"
                    >
                        <X className="w-5 h-5" />
                    </Button>

                    <div className="p-4 pt-8 min-h-[400px] flex flex-col items-center">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="w-full"
                            >
                                <div className="text-center mb-6">
                                    {slides[step].icon}
                                    <h2 className="text-2xl font-bold font-pixel-title text-[#4c1d95] mb-2">{slides[step].title}</h2>
                                </div>
                                <div className="font-pixel-text text-[#2e1065]">
                                    {slides[step].content}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="flex items-center justify-between mt-4 px-4 pb-2 border-t-2 border-[#4c1d95]/10 pt-4">
                        <Button
                            variant="outline"
                            onClick={prevStep}
                            disabled={step === 0}
                            className="font-bold font-pixel-text"
                        >
                            <ChevronRight className="w-4 h-4 ml-1" />
                            السابق
                        </Button>

                        <div />

                        {step === slides.length - 1 ? (
                            <Button
                                variant="default"
                                onClick={onClose}
                                className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold font-pixel-text"
                            >
                                يلا نبدأ!
                                <Sparkles className="w-4 h-4 mr-1" />
                            </Button>
                        ) : (
                            <Button
                                variant="default"
                                onClick={nextStep}
                                className="bg-[#4c1d95] hover:bg-[#3b0764] text-white font-bold font-pixel-text"
                            >
                                التالي
                                <ChevronLeft className="w-4 h-4 mr-1" />
                            </Button>
                        )}
                    </div>
                </RetroCard>
            </motion.div>
        </div>
    );
}
