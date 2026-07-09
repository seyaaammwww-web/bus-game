
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { defaultAvatar } from '@/lib/designTokens';
import { PixelAvatar } from '@/components/ui/PixelAvatar';
import { Crown, PenTool, CheckCircle, Clock } from 'lucide-react';

interface ActiveGamePlayerGridProps {
    players: any[];
    currentPlayerId: string;
    submissions: Record<string, any>;
    timeLeft: number;
    typingPlayers?: Record<string, boolean>;
}

export function ActiveGamePlayerGrid({ players, currentPlayerId, submissions, timeLeft, typingPlayers = {} }: ActiveGamePlayerGridProps) {
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
                            "relative flex flex-col items-center p-4 rounded-sm border-[3px] border-[#350D7A] shadow-pixel-sm",
                            isMe
                                ? "bg-[#FFF3B6]"
                                : hasSubmitted
                                    ? "bg-[#D3F088]"
                                    : "bg-[#FFFEE5]"
                        )}
                    >
                        {/* Status Indicator */}
                        <div className="absolute top-2 right-2">
                            {hasSubmitted ? (
                                <div className="bg-[#44AF00] text-[#FFFEE2] p-1 rounded-sm border-2 border-[#350D7A] animate-bounce-slight">
                                    <CheckCircle className="w-4 h-4" />
                                </div>
                            ) : (
                                <div className="bg-[#FFFDCC] text-[#350D7A]/50 p-1 rounded-sm border-2 border-[#350D7A]/30">
                                    <PenTool className="w-4 h-4 animate-pulse" />
                                </div>
                            )}
                        </div>

                        {/* Player Content */}
                        <PixelAvatar
                            src={player.avatar || defaultAvatar(player.id)}
                            size="sm"
                            className="mb-1 z-10"
                        />
                        <p className="font-pixel-text text-sm mt-1 truncate max-w-[80px] text-center text-[#350D7A] font-bold leading-tight">
                            {player.name}
                        </p>





                        {/* "You" Badge */}
                        {isMe && (
                            <div className="absolute -bottom-3 bg-[#6714A8] text-[#FFFEE2] text-[10px] px-2 py-0.5 rounded-sm font-bold border-2 border-[#350D7A]">
                                أنت
                            </div>
                        )}

                        {/* Real Typing Indicator (privacy-safe — no answer content leaked) */}
                        {!hasSubmitted && !isMe && typingPlayers[player.id] && (
                            <div className="absolute bottom-2 left-2 flex gap-0.5">
                                <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1 h-1 bg-[#6714A8]" />
                                <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1 h-1 bg-[#6714A8]" />
                                <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1 h-1 bg-[#6714A8]" />
                            </div>
                        )}
                    </motion.div>
                );
            })}
        </div>
    );
}
