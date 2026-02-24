
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PixelAvatar } from '@/components/ui/PixelAvatar';
import { Crown, PenTool, CheckCircle, Clock } from 'lucide-react';

interface ActiveGamePlayerGridProps {
    players: any[];
    currentPlayerId: string;
    submissions: Record<string, any>;
    timeLeft: number;
}

export function ActiveGamePlayerGrid({ players, currentPlayerId, submissions, timeLeft }: ActiveGamePlayerGridProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 w-full">
            {players.filter(p => p.id !== currentPlayerId).map((player, index) => {
                const hasSubmitted = !!submissions[player.id];
                const isMe = player.id === currentPlayerId;

                return (
                    <motion.div
                        key={player.id}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className={cn(
                            "relative flex flex-col items-center p-4 rounded-xl border-[3px] shadow-[4px_4px_0_0_rgba(0,0,0,0.2)] transition-all",
                            isMe
                                ? "bg-[#e9d5ff] border-[#7c3aed]"
                                : hasSubmitted
                                    ? "bg-[#dcfce7] border-[#22c55e]"
                                    : "bg-white border-[#e5e7eb]"
                        )}
                    >
                        {/* Status Indicator */}
                        <div className="absolute top-2 right-2">
                            {hasSubmitted ? (
                                <div className="bg-green-500 text-white p-1 rounded-md shadow-sm animate-bounce-slight">
                                    <CheckCircle className="w-4 h-4" />
                                </div>
                            ) : (
                                <div className="bg-gray-200 text-gray-500 p-1 rounded-md shadow-sm">
                                    <PenTool className="w-4 h-4 animate-pulse" />
                                </div>
                            )}
                        </div>





                        {/* "You" Badge */}
                        {isMe && (
                            <div className="absolute -bottom-3 bg-[#7c3aed] text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm border-2 border-white">
                                أنت
                            </div>
                        )}

                        {/* Real Typing Indicator (Driven by Delta Sync Patches) */}
                        {!hasSubmitted && !isMe && (player.draftAnswers && Object.values(player.draftAnswers).some((v: any) => v.trim() !== '')) && (
                            <div className="absolute bottom-2 left-2 flex gap-0.5">
                                <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1 h-1 bg-gray-400 rounded-full" />
                                <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1 h-1 bg-gray-400 rounded-full" />
                                <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1 h-1 bg-gray-400 rounded-full" />
                            </div>
                        )}
                    </motion.div>
                );
            })}
        </div>
    );
}
