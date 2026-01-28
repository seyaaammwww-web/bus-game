import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Bus, Plus, Sparkles, UserX, Lightbulb, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Slide {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
}

const slides: Slide[] = [
    {
        title: "أهلا بيك في أوتوبيس كومبليت! 🚌",
        description: "بص يا بطل، دي لعبة أوتوبيس كومبليت المصرية الأصيلة، بس بشكل جديد وحركات أكتر. جهز نفسك عشان هنبدأ الرحلة!",
        icon: <Bus className="w-16 h-16 text-white" />,
        color: "bg-primary"
    },
    {
        title: "إزاي تلعب؟ 🤔",
        description: "كل جولة بناخد حرف، ومطلوب منك تملا 5 خانات (ولد، بنت، بلد، حيوان، جماد) بسرعة. اللي بيخلص الأول بيوقف الأوتوبيس وكل الناس بعدها قدامها 10 ثواني بس!",
        icon: <Sparkles className="w-16 h-16 text-white" />,
        color: "bg-secondary"
    },
    {
        title: "كلمتك صح بس مش موجودة؟ ➕",
        description: "النظام بتاعنا صارم وبيرفض الكلمات اللي مش في القائمة. لو لقيت كلمتك صح ومرفوضة، اضغط على علامة (+) في صفحة النتائج، والذكاء الاصطناعي هيراجعها ويرجعلك حقك!",
        icon: <Plus className="w-16 h-16 text-white" />,
        color: "bg-amber-500"
    },
    {
        title: "الجوكر (Wildcard) 🃏",
        description: "معاك 50 نقطة؟ تقدر تستخدم الجوكر! بضغطة واحدة هيملالك كل الخانات إجابات صحيحة وفي ثانية واحدة. بس خلي بالك، دي حركة للأزمات بس!",
        icon: <Lightbulb className="w-16 h-16 text-white" />,
        color: "bg-purple-600"
    },
    {
        title: "حركة الطرد (Banish) 🚫",
        description: "عايز تخلص من منافس قوي؟ بـ 40 نقطة تقدر تطرد أي لاعب من الجولة الحالية، مش هيقدر يجاوب ولا يجمع نقاط. بس استعملها في الوقت الصح!",
        icon: <UserX className="w-16 h-16 text-white" />,
        color: "bg-destructive"
    },
    {
        title: "اكسب وخليك الـ MVP! 🏆",
        description: "جمع النقاط، استخدم المساعدات بذكاء، وخليك أسرع واحد في مصر. يالا بينا نبدأ اللعب؟",
        icon: <Trophy className="w-16 h-16 text-white" />,
        color: "bg-green-600"
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
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-background w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative z-10 border border-border"
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/5 hover:bg-black/10 transition-colors z-20"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="relative h-48 sm:h-64 flex items-center justify-center overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentSlide}
                            initial={{ scale: 0.8, opacity: 0, rotateY: 90 }}
                            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                            exit={{ scale: 0.8, opacity: 0, rotateY: -90 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                            className={`w-full h-full ${slides[currentSlide].color} flex items-center justify-center`}
                        >
                            {slides[currentSlide].icon}
                        </motion.div>
                    </AnimatePresence>
                    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent" />
                </div>

                <div className="p-8 text-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentSlide}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <h2 className="text-2xl font-bold mb-4 text-primary">
                                {slides[currentSlide].title}
                            </h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                {slides[currentSlide].description}
                            </p>
                        </motion.div>
                    </AnimatePresence>

                    <div className="mt-10 flex flex-col gap-4">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            {slides.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-2 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-primary/20'
                                        }`}
                                />
                            ))}
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <Button
                                variant="outline"
                                onClick={prevSlide}
                                disabled={currentSlide === 0}
                                className="rounded-xl px-4 h-12 flex-1 border-2"
                            >
                                <ChevronLeft className="w-5 h-5 mr-2" />
                                رجوع
                            </Button>
                            <Button
                                onClick={nextSlide}
                                className="rounded-xl px-4 h-12 flex-[2] text-lg font-bold bg-gradient-to-r from-primary to-secondary shadow-lg hover:shadow-xl transition-shadow"
                            >
                                {currentSlide === slides.length - 1 ? 'فهمت الدنيا! ✅' : 'اللي بعده'}
                                {currentSlide < slides.length - 1 && <ChevronRight className="w-5 h-5 ml-2" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
