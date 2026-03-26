
import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Shield, Users, Trophy, MessageSquarePlus, Flag } from 'lucide-react';
import { PixelAvatar } from '@/components/ui/PixelAvatar';
import { cn } from '@/lib/utils';
import { useGame } from '@/lib/gameContext'; // FIX (#3): Phase 3 - Player Appeals
import { categories, type Category } from '@shared/schema';
import { ValidationStamp } from '@/components/ui/ValidationStamp';

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
    isHost?: boolean;
    // PHANTOM-3: Optional — only provided during referee_review phase
    onRefereeToggle?: (playerId: string, category: Category) => void;
    onRefereeDeduct?: (playerId: string, category: Category) => void;
}

export function ResultsTable({
    round,
    players,
    currentPlayerId,
    isReferee,
    isHost,
    onRefereeToggle,
    onRefereeDeduct
}: ResultsTableProps) {
    const { sendAppeal } = useGame();
    const canOverride = isReferee || isHost;

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

            <motion.div
                className="space-y-3"
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: {},
                    visible: {
                        transition: {
                            staggerChildren: 0.3, // 300ms delay between each player
                        }
                    }
                }}
            >
                {round.submissions.map((submission: any, idx: number) => {
                    const isMe = submission.playerId === currentPlayerId;
                    const player = players.find(p => p.id === submission.playerId);

                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
                    const totalScore = calculateTotalScore(round, submission.playerId);

                    return (
                        <motion.div
                            key={`${submission.playerId}-${totalScore}`}
                            variants={{
                                hidden: { opacity: 0, y: 50, scale: 0.9 },
                                visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 20 } }
                            }}
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
                                        +{totalScore}
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
                                                statusClass,
                                                isMe && !isValid && answer && !isReferee ? 'cursor-pointer group/cell' : ''
                                            )}
                                        >
                                            {/* Mobile Category Label */}
                                            <div className="md:hidden flex items-center gap-2 w-24 shrink-0 text-gray-400 text-xs font-bold">
                                                {React.createElement(categoryIcons[cat], { className: "w-3 h-3" })}
                                                {cat}
                                            </div>

                                            {/* FIX (#3): Phase 3 Host Appeal Visual Badge */}
                                            {validation?.appealedBy && validation.appealedBy.length > 0 && (
                                                <div className="absolute top-1 right-1" title={`تم الاستئناف بواسطة ${validation.appealedBy.length} لاعبين`}>
                                                    <Flag className="w-4 h-4 text-yellow-500 fill-yellow-500 animate-pulse" />
                                                </div>
                                            )}

                                            {/* The Answer */}
                                            <div className="flex-1 text-center md:w-full relative">
                                                {answer ? (
                                                    <span className={cn(
                                                        "font-bold text-sm md:text-base break-words block relative z-10",
                                                        isValid ? "text-[#15803d]" : "text-[#b91c1c] line-through decoration-2 decoration-red-300"
                                                    )}>
                                                        {answer}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300 text-xs font-pixel-text">-</span>
                                                )}

                                                {/* JUICY: Validation Stamp */}
                                                <ValidationStamp
                                                    isValid={isValid || false}
                                                    show={answer !== undefined && answer !== "" && isReferee}
                                                    size="sm"
                                                    position="center"
                                                />
                                            </div>

                                            {/* Score Badge */}
                                            <div className="shrink-0 md:absolute md:top-1 md:left-1 flex flex-col gap-1 items-center">
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

                                                {/* Host / Referee Toggle Button — only shown when callbacks are wired up (referee_review phase) */}
                                                {canOverride && answer && onRefereeToggle && (
                                                    <button
                                                        onClick={() => onRefereeToggle(submission.playerId, cat)}
                                                        className="p-1 rounded bg-black/10 hover:bg-black/20 transition-colors mt-1"
                                                        title="تعديل احتساب الكلمة"
                                                    >
                                                        <Shield className="w-3 h-3 text-[#4c1d95]" />
                                                    </button>
                                                )}

                                                {/* FIX (#3): Phase 3 Player Appeal Control */}
                                                {!canOverride && answer && submission.playerId !== currentPlayerId && (
                                                    <button
                                                        onClick={() => sendAppeal(submission.playerId, cat)}
                                                        disabled={validation?.appealedBy?.includes(currentPlayerId)}
                                                        className={cn(
                                                            "p-1 rounded mt-1 transition-colors",
                                                            validation?.appealedBy?.includes(currentPlayerId)
                                                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                                                : "bg-yellow-100 hover:bg-yellow-200 text-yellow-600"
                                                        )}
                                                        title={validation?.appealedBy?.includes(currentPlayerId) ? "لقد قمت بإبلاغ هذه الكلمة" : "إبلاغ المضيف عن هذه الإجابة"}
                                                    >
                                                        <Flag className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>
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
