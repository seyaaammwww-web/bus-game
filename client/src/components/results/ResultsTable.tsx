
import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Shield, Users, Trophy } from 'lucide-react';
import { PixelAvatar } from '@/components/ui/PixelAvatar';
import { cn } from '@/lib/utils';
import { categories, type Category } from '@shared/schema';

// Helper for category icons/colors (Reusing logic for consistency)
import { User, Box, Globe, PawPrint } from 'lucide-react';

const categoryIcons: Record<Category, any> = {
    'ولد': User,
    'بنت': Users,
    'بلد': Globe,
    'حيوان': PawPrint,
    'جماد': Box,
};

interface ResultsTableProps {
    round: any;
    players: any[];
    currentPlayerId: string;
    isReferee: boolean;
    onRefereeToggle: (playerId: string, category: string) => void;
    onRefereeDeduct: (playerId: string, category: string) => void;
    onAppeal: (playerId: string, category: string, answer: string) => void;
}

export function ResultsTable({
    round,
    players,
    currentPlayerId,
    isReferee,
    onRefereeToggle,
    onRefereeDeduct,
    onAppeal
}: ResultsTableProps) {

    return (
        <div className="flex flex-col gap-4">
            {/* Table Headers - Hidden on small mobile, visible on tablet+ */}
            <div className="hidden md:grid grid-cols-[1.5fr,repeat(5,1fr)] gap-2 px-4 py-2 bg-[#4c1d95] text-[#FFFDD1] rounded-t-xl border-b-4 border-[#2e1065] font-pixel-text text-sm shadow-md">
                <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <span>اللاعب</span>
                </div>
                {categories.map(cat => {
                    const Icon = categoryIcons[cat];
                    return (
                        <div key={cat} className="flex items-center justify-center gap-1">
                            <Icon className="w-3 h-3 opacity-70" />
                            <span>{cat}</span>
                        </div>
                    );
                })}
            </div>

            <div className="space-y-3">
                {round.submissions.map((submission: any, idx: number) => {
                    const isMe = submission.playerId === currentPlayerId;
                    const player = players.find(p => p.id === submission.playerId);

                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

                    return (
                        <motion.div
                            key={submission.playerId}
                            initial={isMobile ? { opacity: 0 } : { x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={isMobile ? { duration: 0.2 } : { delay: idx * 0.1 }}
                            className={cn(
                                "relative group rounded-xl border-[3px] overflow-hidden transition-all duration-300",
                                isMe
                                    ? "bg-[#e9d5ff] border-[#7c3aed] shadow-[0_0_15px_rgba(124,58,237,0.3)]"
                                    : "bg-white border-[#e5e7eb] shadow-sm hover:border-[#a78bfa]"
                            )}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-[1.5fr,repeat(5,1fr)] bg-white/50">
                                {/* Player Info Column (Desktop: Col 1, Mobile: Header) */}
                                <div className={cn(
                                    "flex items-center gap-3 p-3 border-b-2 md:border-b-0 md:border-l-2 border-dashed",
                                    isMe ? "border-[#7c3aed]/30 bg-[#7c3aed]/5" : "border-gray-200 bg-gray-50"
                                )}>

                                    <div className="flex-1 min-w-0">
                                        <div className={cn("font-bold font-pixel-text truncate", isMe ? "text-[#5b21b6]" : "text-gray-700")}>
                                            {player?.name}
                                        </div>
                                        <div className="text-xs text-gray-400 font-pixel-text md:hidden">
                                            {isMe ? 'أنت' : 'لاعب'}
                                        </div>
                                    </div>
                                    <div className="text-xl font-bold font-pixel-title text-[#4c1d95]">
                                        +{calculateTotalScore(round, submission.playerId)}
                                    </div>
                                </div>

                                {/* Answers Columns (Desktop: Cols 2-6, Mobile: Grid) */}
                                {categories.map((cat) => {
                                    const answer = submission.answers[cat];
                                    const validation = round.validatedAnswers.find(
                                        (v: any) => v.playerId === submission.playerId && v.category === cat
                                    );
                                    const isValid = validation?.isValid;
                                    const score = validation?.score || 0;

                                    // Status Color Logic
                                    let statusClass = "bg-gray-50/50";
                                    if (answer) {
                                        if (isValid) statusClass = score > 10 ? "bg-green-50" : "bg-green-50/30";
                                        else statusClass = "bg-red-50";
                                    }

                                    return (
                                        <div
                                            key={cat}
                                            className={cn(
                                                "relative p-3 flex md:flex-col items-center justify-between md:justify-center gap-2 transition-colors border-b md:border-b-0 border-gray-100 last:border-0 md:border-r md:border-gray-100",
                                                statusClass
                                            )}
                                            onClick={() => {
                                                if (isMe && !isValid && answer && !isReferee) {
                                                    onAppeal(submission.playerId, cat, answer);
                                                }
                                            }}
                                        >
                                            {/* Mobile Category Label */}
                                            <div className="md:hidden flex items-center gap-2 w-24 shrink-0 text-gray-400 text-xs font-bold">
                                                {React.createElement(categoryIcons[cat], { className: "w-3 h-3" })}
                                                {cat}
                                            </div>

                                            {/* The Answer */}
                                            <div className="flex-1 text-center md:w-full">
                                                {answer ? (
                                                    <span className={cn(
                                                        "font-bold text-sm md:text-base break-words block",
                                                        isValid ? "text-[#15803d]" : "text-[#b91c1c] line-through decoration-2 decoration-red-300"
                                                    )}>
                                                        {answer}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300 text-xs font-pixel-text">-</span>
                                                )}
                                            </div>

                                            {/* Score Badge */}
                                            <div className="shrink-0 md:absolute md:top-1 md:left-1">
                                                {answer && (
                                                    isValid ? (
                                                        <span className={cn(
                                                            "text-[10px] px-1.5 py-0.5 rounded border shadow-sm font-bold font-pixel-text",
                                                            score > 10
                                                                ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                                                                : "bg-green-100 text-green-700 border-green-200"
                                                        )}>
                                                            {score}
                                                        </span>
                                                    ) : (
                                                        <X className="w-4 h-4 text-red-400 opacity-50" />
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

function calculateTotalScore(round: any, playerId: string) {
    let total = 0;
    round.validatedAnswers.filter((v: any) => v.playerId === playerId).forEach((v: any) => {
        if (v.isValid) total += (v.score || 0);
    });
    return total;
}
