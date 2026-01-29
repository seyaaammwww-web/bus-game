import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check, X, User, Users, Globe, PawPrint, Box, AlertTriangle, Gavel, LogOut, Crown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGame } from '@/lib/gameContext';
import { categories, type Category } from '@shared/schema';
import { RetroCard } from '@/components/ui/RetroCard';

const categoryIcons: Record<Category, any> = {
  'ولد': User,
  'بنت': Users,
  'بلد': Globe,
  'حيوان': PawPrint,
  'جماد': Box,
};

const categoryColors: Record<Category, string> = {
  'ولد': 'bg-blue-500',
  'بنت': 'bg-pink-500',
  'بلد': 'bg-green-500',
  'حيوان': 'bg-amber-500',
  'جماد': 'bg-purple-500',
};

export default function RefereeReview() {
  const { state, currentRound, isReferee, refereeDeduct, refereeToggleUnique, refereeApprove, referee, disconnect } = useGame();

  const room = state.room!;
  const round = currentRound;
  const validatedAnswers = round?.validatedAnswers || [];
  const submissions = round?.submissions || [];
  const refereeDeductions = room.refereeDeductions || [];

  const getAnswerScore = (playerId: string, category: Category) => {
    const answer = validatedAnswers.find(
      a => a.playerId === playerId && a.category === category
    );
    return answer?.score || 0;
  };

  const isDeducted = (playerId: string, category: Category) => {
    return refereeDeductions.some(
      d => d.playerId === playerId && d.category === category
    );
  };

  if (!round) {
    return (
      <div className="min-h-screen flex items-center justify-center font-pixel-text text-white">
        <p className="relative z-10 text-white animate-pulse">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 overflow-hidden relative text-white font-pixel-text">
      <div className="max-w-lg mx-auto relative z-10">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={disconnect}
            className="text-white hover:bg-white/10"
            data-testid="button-exit-referee"
          >
            <LogOut className="w-5 h-5" />
          </Button>
          <span className="text-[12px] text-[#2C0834] font-pixel-text tracking-tight animate-pulse font-bold">BY MOHAMED SEYAM</span>
        </div>

        <motion.div
          className="text-center mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <motion.div
            className="w-20 h-20 bg-[#2C0834] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl border-4 border-[#FFFDD1]"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Gavel className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-2xl font-pixel-title mb-2 text-white">مراجعة الحكم</h1>
          {isReferee ? (
            <p className="text-[#FFFDD1] font-bold font-pixel-text">أنت الحكم! راجع الإجابات واخصم اللي مش صح</p>
          ) : (
            <p className="text-[#FFFDD1] font-pixel-text">
              الحكم <span className="font-bold text-[#FFFDD1]">{referee?.name}</span> بيراجع الإجابات...
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <RetroCard className="mb-4">
            <div className="flex items-center justify-between font-pixel-title text-[#31093A] mb-4">
              <span className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent" />
                الجولة {room.currentRound + 1} - حرف {round.letter}
              </span>
            </div>
            <div className="space-y-6">
              {categories.map((category) => {
                const Icon = categoryIcons[category];
                return (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center gap-2 font-pixel-text">
                      <div className={`w-8 h-8 ${categoryColors[category]} flex items-center justify-center border-2 border-[#2C0834] shadow-[2px_2px_0_0_#2C0834]`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-bold text-[#31093A] text-lg">{category}</span>
                    </div>

                    <div className="grid gap-2">
                      {submissions.map((submission) => {
                        const answer = submission.answers[category];
                        if (!answer || !answer.trim()) return null;

                        const score = getAnswerScore(submission.playerId, category);
                        const deducted = isDeducted(submission.playerId, category);

                        return (
                          <motion.div
                            key={submission.playerId}
                            className={`flex items-center justify-between p-3 border-[3px] transition-all font-pixel-text ${deducted
                              ? 'bg-red-500/10 border-red-500/50 opacity-60'
                              : 'bg-white border-[#31093A] hover:shadow-[2px_2px_0_0_#2C0834]'
                              }`}
                            layout
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-[#31093A] text-white flex items-center justify-center text-sm font-bold border-2 border-[#2C0834]">
                                {submission.playerName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-xs text-[#31093A]/70">{submission.playerName}</p>
                                <p className={`text-base font-bold text-[#31093A] ${deducted ? 'line-through opacity-50' : ''}`}>
                                  {answer}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {deducted ? (
                                <span className="text-red-500 text-xs font-bold flex items-center gap-1">
                                  <X className="w-3 h-3" />
                                  مرفوض
                                </span>
                              ) : (
                                <>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${score === 20 ? 'bg-green-500/20 text-green-600' :
                                    score === 10 ? 'bg-yellow-500/20 text-yellow-600' :
                                      'bg-gray-100 text-[#31093A]/40'
                                    }`}>
                                    {score} نقطة
                                  </span>

                                  {isReferee && score > 0 && (
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 rounded-none border-2 border-[#31093A]/20 hover:bg-[#31093A] hover:text-white"
                                        onClick={() => refereeToggleUnique(submission.playerId, category)}
                                      >
                                        <Users className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-red-500 border-2 border-red-500/20 hover:bg-red-500 hover:text-white rounded-none"
                                        onClick={() => refereeDeduct(submission.playerId, category, "رفض الحكم")}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </RetroCard>
        </motion.div>

        {isReferee && (
          <Button
            className="w-full h-14 text-lg font-bold bg-[#2C0834] text-white shadow-xl font-pixel-title hover:bg-[#31093A]"
            onClick={refereeApprove}
            data-testid="button-referee-approve"
          >
            <Check className="w-6 h-6 ml-2" />
            اعتماد النتائج
          </Button>
        )}

        {!isReferee && (
          <motion.div
            className="text-center p-4 font-pixel-text text-[#FFFDD1] animate-pulse"
          >
            <p>في انتظار اعتماد الحكم...</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
