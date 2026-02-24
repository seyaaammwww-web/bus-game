import React, { useState } from 'react';
import { useGame } from '../lib/gameContext';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { History, X, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AuditLog: React.FC = () => {
    const { state } = useGame();
    const [isOpen, setIsOpen] = useState(false);
    const auditLog = state.room?.auditLog || [];

    if (auditLog.length === 0) return null;

    return (
        <div className="fixed bottom-20 left-4 z-50 pointer-events-none">
            <div className="pointer-events-auto">
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Card className="w-80 h-96 mb-4 flex flex-col bg-slate-900/95 border-slate-700 shadow-2xl overflow-hidden backdrop-blur-sm">
                                <div className="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                                    <div className="flex items-center gap-2 text-slate-200">
                                        <History className="w-4 h-4 text-cyan-400" />
                                        <span className="font-pixel text-xs tracking-wider">سجل المضيف</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-slate-400 hover:text-white"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>

                                <ScrollArea className="flex-1 p-2">
                                    <div className="space-y-2">
                                        {[...auditLog].reverse().map((entry, i) => {
                                            const host = state.room?.players.find(p => p.id === entry.hostId);
                                            const target = state.room?.players.find(p => p.id === entry.targetId);

                                            return (
                                                <div
                                                    key={`${entry.timestamp}-${i}`}
                                                    className="p-2 rounded bg-slate-800/40 border border-slate-700/50 text-[10px] space-y-1"
                                                >
                                                    <div className="flex justify-between text-slate-500 font-mono italic">
                                                        <span>جولة {entry.round}</span>
                                                        <span>{new Date(entry.timestamp).toLocaleTimeString('ar-EG', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                                    </div>
                                                    <div className="text-slate-300">
                                                        <span className="text-cyan-400 font-bold">{host?.name || 'مضيف'}</span>
                                                        {' '}
                                                        <span className="text-slate-400">{entry.details}</span>
                                                        {target && (
                                                            <>
                                                                {' '}على{' '}
                                                                <span className="text-pink-400 font-bold">{target.name}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                <Button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
            font-pixel text-[10px] h-10 gap-2 px-4 shadow-lg transition-all duration-300
            ${isOpen
                            ? 'bg-slate-700 hover:bg-slate-600 text-white'
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white animate-pulse-subtle'
                        }
          `}
                >
                    <History className="w-4 h-4" />
                    {isOpen ? 'إغلاق السجل' : 'سجل المضيف'}
                    {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                </Button>
            </div>
        </div>
    );
};
