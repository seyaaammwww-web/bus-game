import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Bus, Plus, Sparkles, UserX, Lightbulb, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RetroCard } from '@/components/ui/RetroCard';

interface Slide {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
}

const slides: Slide[] = [
    {
        title: "أهلا بيك في أوتوبيس كومبليت! 🚌",
        description: "بص يا بطل، دي لعبة أوتوبيس كومبليت المصرية الأصيلة، بس بشكل جديد وحركات أكتر. جهز نفسك عشان هنبدأ الرحلة!",
        icon: <Bus className="w-20 h-20 text-[#4c1d95]" />,
        color: "text-primary",
        bgColor: "bg-primary"
    },
    {
        title: "إزاي تلعب؟ 🤔",
        description: "كل جولة بناخد حرف، ومطلوب منك تملا 5 خانات (ولد، بنت، بلد، حيوان، جماد) بسرعة. اللي بيخلص الأول بيوقف الأوتوبيس وكل الناس بعدها قدامها 10 ثواني بس!",
        icon: <Sparkles className="w-20 h-20 text-[#4c1d95]" />,
        color: "text-secondary",
        bgColor: "bg-secondary"
    },
    {
        title: "كلمتك صح بس مش موجودة؟ ➕",
        description: "النظام بتاعنا صارم وبيرفض الكلمات اللي مش في القائمة. لو لقيت كلمتك صح ومرفوضة، اضغط على علامة (+) في صفحة النتائج، والذكاء الاصطناعي هيراجعها ويرجعلك حقك!",
        icon: <Plus className="w-20 h-20 text-[#4c1d95]" />,
        color: "text-amber-500",
        bgColor: "bg-amber-500"
    },
    {
        title: "الجوكر (Wildcard) 🃏",
        description: "معاك 50 نقطة؟ تقدر تستخدم الجوكر! بضغطة واحدة هيملالك كل الخانات إجابات صحيحة وفي ثانية واحدة. بس خلي بالك، دي حركة للأزمات بس!",
        icon: <Lightbulb className="w-20 h-20 text-[#4c1d95]" />,
        color: "text-purple-600",
        bgColor: "bg-purple-600"
    },
    {
        title: "حركة الطرد (Banish) 🚫",
        description: "عايز تخلص من منافس قوي؟ بـ 40 نقطة تقدر تطرد أي لاعب من الجولة الحالية، مش هيقدر يجاوب ولا يجمع نقاط. بس استعملها في الوقت الصح!",
        icon: <UserX className="w-20 h-20 text-[#4c1d95]" />,
        color: "text-destructive",
        bgColor: "bg-destructive"
    },
    {
        title: "اكسب وخليك الـ MVP! 🏆",
        description: "جمع النقاط، استخدم المساعدات بذكاء، وخليك أسرع واحد في مصر. يالا بينا نبدأ اللعب؟",
        icon: <Trophy className="w-20 h-20 text-[#4c1d95]" />,
        color: "text-green-600",
        bgColor: "bg-green-600"
    }
];

interface InstructionSlidesProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function InstructionSlides({ isOpen, onClose }: InstructionSlidesProps) {
    const [currentSlide, setCurrentSlide] = useState(0);

    if (!isOpen) return null;

    const nextSlide = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const prevSlide = () => {
        if (currentSlide > 0) {
            setCurrentSlide(prev => prev - 1);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#2e1065]/80 backdrop-blur-sm"
                onClick={onClose}
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="w-full max-w-lg relative z-10"
            >
                <RetroCard className="p-0 overflow-hidden shadow-2xl">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-[#2e1065]/10 hover:bg-[#2e1065]/20 transition-colors z-20"
                    >
                        <X className="w-6 h-6 text-[#2e1065]" />
                    </button>

                    <div className="relative h-56 sm:h-64 flex items-center justify-center overflow-hidden border-b-[3px] border-[#2e1065] bg-[#FFFEF0]">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#2e1065 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentSlide}
                                initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
                                transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                                className={`w-32 h-32 ${slides[currentSlide].bgColor} flex items-center justify-center rounded-2xl shadow-[4px_4px_0_0_#2e1065] border-[3px] border-[#2e1065]`}
                            >
                                {slides[currentSlide].icon}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="p-8 text-center bg-[#FFFDD1]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentSlide}
                                initial={{ x: 50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <h2 className="text-2xl font-bold font-pixel-title mb-4 text-[#4c1d95]">
                                    {slides[currentSlide].title}
                                </h2>
                                <p className="text-sm sm:text-base text-[#4c1d95]/80 leading-relaxed font-pixel-text">
                                    {slides[currentSlide].description}
                                </p>
                            </motion.div>
                        </AnimatePresence>

                        <div className="mt-10 flex flex-col gap-4">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                {slides.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-3 transition-all duration-300 border border-[#2e1065] ${i === currentSlide ? 'w-8 bg-[#4c1d95]' : 'w-3 bg-[#FFFDD1]'
                                            }`}
                                    />
                                ))}
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <Button
                                    variant="outline"
                                    onClick={prevSlide}
                                    disabled={currentSlide === 0}
                                    className="flex-1"
                                >
                                    <ChevronLeft className="w-5 h-5 mr-2" />
                                    رجوع
                                </Button>
                                <Button
                                    onClick={nextSlide}
                                    className="flex-[2] text-lg"
                                >
                                    {currentSlide === slides.length - 1 ? 'فهمت الدنيا! ✅' : 'اللي بعده'}
                                    {currentSlide < slides.length - 1 && <ChevronRight className="w-5 h-5 ml-2" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                </RetroCard>
            </motion.div>
        </div>
    );
}

