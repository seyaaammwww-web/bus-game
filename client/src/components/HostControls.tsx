import React from 'react';
import { useGame } from '../lib/gameContext';
import { Button } from './ui/button';
import { Player } from '@shared/schema';
import { Plus, Minus, UserMinus, CheckCircle, XCircle } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "./ui/tooltip";

interface HostControlsProps {
    type: 'player_row' | 'overall';
    targetPlayer?: Player;
}

export const HostControls: React.FC<HostControlsProps> = ({ type, targetPlayer }) => {
    const { isHost, hostAdjustScore, kickPlayer, hostResolveVotes, state } = useGame();

    if (!isHost) return null;

    if (type === 'player_row' && targetPlayer) {
        const isMe = targetPlayer.id === state.playerId;

        return (
            <div className="flex items-center gap-1 ml-auto">
                <TooltipProvider>
                    <div className="flex items-center bg-slate-800/50 rounded-lg p-1 border border-slate-700">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                    onClick={() => hostAdjustScore(targetPlayer.id, -10)}
                                >
                                    <Minus className="w-3 h-3" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 border-slate-700 text-[10px] font-pixel">خسم 10 نقاط</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-green-400 hover:text-green-300 hover:bg-green-400/10"
                                    onClick={() => hostAdjustScore(targetPlayer.id, 10)}
                                >
                                    <Plus className="w-3 h-3" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 border-slate-700 text-[10px] font-pixel">إضافة 10 نقاط</TooltipContent>
                        </Tooltip>
                    </div>

                    {!isMe && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-500/10 ml-2"
                                    onClick={() => {
                                        if (confirm(`هل أنت متأكد من طرد ${targetPlayer.name}؟`)) {
                                            kickPlayer(targetPlayer.id);
                                        }
                                    }}
                                >
                                    <UserMinus className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 border-slate-700 text-[10px] font-pixel">طرد اللاعب</TooltipContent>
                        </Tooltip>
                    )}
                </TooltipProvider>
            </div>
        );
    }

    if (type === 'overall') {
        const hasPendingVotes = state.room?.voteQueue && state.room.voteQueue.length > 0;

        return (
            <div className="flex flex-wrap gap-2 items-center">
                {hasPendingVotes && (
                    <Button
                        onClick={hostResolveVotes}
                        variant="outline"
                        size="sm"
                        className="h-8 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 font-pixel text-[10px]"
                    >
                        <CheckCircle className="w-3 h-3 mr-2" />
                        إنهاء جميع التصويتات
                    </Button>
                )}
            </div>
        );
    }

    return null;
};
