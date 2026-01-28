import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check, X, User, Users, Globe, PawPrint, Box, AlertTriangle, Gavel, LogOut } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useGame } from '@/lib/gameContext';
import { categories, type Category } from '@shared/schema';

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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-accent/5 to-muted/30 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={disconnect}
            className="text-destructive hover:bg-destructive/10"
            data-testid="button-exit-referee"
          >
            <LogOut className="w-5 h-5" />
          </Button>
          <span className="text-xs text-muted-foreground/60">BY MOHAMED SEYAM</span>
        </div>

        <motion.div
          className="text-center mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <motion.div
            className="w-20 h-20 bg-gradient-to-br from-accent to-accent/80 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Gavel className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold mb-2">مراجعة الحكم</h1>
          {isReferee ? (
            <p className="text-accent font-medium">أنت الحكم! راجع الإجابات واخصم اللي مش صح</p>
          ) : (
            <p className="text-muted-foreground">
              الحكم <span className="font-bold text-accent">{referee?.name}</span> بيراجع الإجابات...
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-accent" />
                  الجولة {room.currentRound + 1} - حرف {round.letter}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {categories.map((category) => {
                const Icon = categoryIcons[category];
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 ${categoryColors[category]} rounded-lg flex items-center justify-center`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-bold">{category}</span>
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
                            className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${deducted
                              ? 'bg-destructive/10 border-destructive/30 opacity-60'
                              : 'bg-card border-card-border hover:border-primary/30'
                              }`}
                            layout
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                                {submission.playerName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{submission.playerName}</p>
                                <p className={`text-lg ${deducted ? 'line-through text-muted-foreground' : ''}`}>
                                  {answer}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {deducted ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-destructive text-sm font-bold flex items-center gap-1">
                                    <X className="w-4 h-4" />
                                    مرفوض
                                  </span>
                                  {isReferee && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="w-8 h-8 text-muted-foreground"
                                      onClick={() => {
                                        // TODO: Add ability to UNDO deduction if needed, for now we just show it's rejected
                                      }}
                                    >
                                      <span className="text-xs">تراجع</span>
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${score === 20 ? 'bg-green-500/20 text-green-600' :
                                    score === 10 ? 'bg-yellow-500/20 text-yellow-600' :
                                      'bg-muted text-muted-foreground'
                                    }`}>
                                    {score} نقطة
                                  </span>

                                  {isReferee && score > 0 && (
                                    <div className="flex gap-1">
                                      {/* Toggle Unique/Duplicate Button */}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-8 w-8 rounded-full ${score === 10 ? 'text-amber-500 bg-amber-500/10' : 'text-blue-500 bg-blue-500/10'}`}
                                        onClick={() => refereeToggleUnique(submission.playerId, category)}
                                        title={score === 10 ? "اجعلها فريدة (20 نقطة)" : "اجعلها مكررة (10 نقاط)"}
                                      >
                                        <Users className="w-4 h-4" />
                                      </Button>

                                      {/* Quick Reject Button */}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:bg-destructive/20 rounded-full"
                                        onClick={() => refereeDeduct(submission.playerId, category, "رفض الحكم")}
                                        title="رفض سريع"
                                      >
                                        <X className="w-5 h-5" />
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
            </CardContent>
          </Card>
        </motion.div>

        {refereeDeductions.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-4"
          >
            <Card className="border-destructive/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-destructive flex items-center gap-2">
                  <X className="w-4 h-4" />
                  الخصومات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {refereeDeductions.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-destructive/10 rounded-lg text-sm">
                    <span>
                      <span className="font-bold">{d.playerName}</span>
                      <span className="text-muted-foreground mx-1">-</span>
                      <span>{d.answer}</span>
                    </span>
                    <span className="text-destructive font-bold">-{d.pointsDeducted}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {isReferee && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-accent to-accent/80"
              onClick={refereeApprove}
              data-testid="button-referee-approve"
            >
              <Check className="w-6 h-6 ml-2" />
              اعتماد النتائج
            </Button>
          </motion.div>
        )}

        {!isReferee && (
          <motion.div
            className="text-center p-4"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <p className="text-muted-foreground">في انتظار اعتماد الحكم...</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
