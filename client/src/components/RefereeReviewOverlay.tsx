import { motion } from 'framer-motion';
import { Gavel, CheckCircle, XCircle, Users, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGame } from '@/lib/gameContext';
import { RetroCard } from '@/components/ui/RetroCard';
import type { ValidatedAnswer } from '@shared/schema';

export function RefereeReviewOverlay() {
    const { state, refereeApprove, currentPlayer } = useGame();
    const room = state.room;

    if (!room || room.phase !== 'referee_review') return null;
    if (!currentPlayer || !currentPlayer.isReferee) return null;

    const currentRound = room.rounds[room.currentRound];
    if (!currentRound) return null;

    const allAnswers = currentRound.validatedAnswers || [];

    // Group answers by player
    const answersByPlayer = allAnswers.reduce((acc, answer) => {
        if (!acc[answer.playerId]) {
            acc[answer.playerId] = [];
        }
        acc[answer.playerId].push(answer);
        return acc;
    }, {} as Record<string, ValidatedAnswer[]>);

    const handleApprove = () => {
        refereeApprove();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-4xl my-8"
            >
                <RetroCard className="border-[4px] border-[#7c3aed] shadow-[0_0_50px_rgba(124,58,237,0.3)]">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-2 bg-[#7c3aed] text-white px-4 py-2 rounded-full border-2 border-[#4c1d95] mb-2 shadow-[2px_2px_0_0_#2e1065]">
                            <Gavel className="w-5 h-5" />
                            <span className="font-bold font-pixel-text">مراجعة الحكم</span>
                        </div>
                        <h2 className="text-2xl font-bold text-[#4c1d95] font-pixel-title">
                            راجع إجابات اللاعبين
                        </h2>
                        <p className="text-sm text-[#7c3aed] mt-1">
                            الجولة {room.currentRound + 1} من {room.totalRounds}
                        </p>
                    </div>

                    {/* Answers Grid */}
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto mb-6 px-2">
                        {Object.entries(answersByPlayer).map(([playerId, answers]) => {
                            const player = room.players.find(p => p.id === playerId);
                            if (!player) return null;

                            return (
                                <div key={playerId} className="bg-[#FFFDD1] p-4 rounded-xl border-2 border-[#4c1d95]">
                                    {/* Player Header */}
                                    <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-[#4c1d95]/20">
                                        <Users className="w-4 h-4 text-[#7c3aed]" />
                                        <span className="font-bold text-[#4c1d95] font-pixel-text">
                                            {player.name}
                                        </span>
                                        {player.isHost && <Crown className="w-4 h-4 text-yellow-500" />}
                                    </div>

                                    {/* Answers */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {answers.map((answer, idx) => (
                                            <div
                                                key={idx}
                                                className={`p-2 rounded-lg border-2 ${answer.isValid
                                                    ? 'bg-green-50 border-green-500'
                                                    : 'bg-red-50 border-red-500'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <p className="text-xs text-gray-600 font-bold">
                                                            {answer.category}
                                                        </p>
                                                        <p className="text-lg font-bold text-[#4c1d95] font-pixel-text">
                                                            {answer.answer || '(فارغ)'}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {answer.isValid ? (
                                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                                        ) : (
                                                            <XCircle className="w-5 h-5 text-red-600" />
                                                        )}
                                                    </div>
                                                </div>
                                                {answer.reason && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {answer.reason}
                                                    </p>
                                                )}
                                                {answer.score !== undefined && (
                                                    <p className="text-xs font-bold text-[#7c3aed] mt-1">
                                                        {answer.score} نقطة
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Approve Button */}
                    <div className="text-center">
                        <Button
                            onClick={handleApprove}
                            className="h-14 px-8 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold font-pixel-title text-xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1 shadow-lg"
                        >
                            <CheckCircle className="w-6 h-6 mr-2" />
                            الموافقة على النتائج
                        </Button>
                        <p className="text-xs text-[#4c1d95]/60 mt-2">
                            سيتم الانتقال للجولة التالية بعد الموافقة
                        </p>
                    </div>
                </RetroCard>
            </motion.div>
        </motion.div>
    );
}
