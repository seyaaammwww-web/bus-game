import { motion } from 'framer-motion';
import { Gavel, Timer, Users, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGame } from '@/lib/gameContext';

export default function RefereeWaiting() {
    const { state, currentRound, disconnect } = useGame();

    const room = state.room!;
    const round = currentRound;
    const letter = round?.letter || room.letters[room.currentRound];

    // Calculate submissions (excluding referee)
    const activePlayers = room.refereeId
        ? room.players.filter(p => p.id !== room.refereeId)
        : room.players;
    const submittedCount = round?.submissions.length || 0;
    const totalPlayers = activePlayers.length;

    return (
        <div className="min-h-screen bg-gradient-to-b from-accent/10 via-background to-muted/20 p-4">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={disconnect}
                        className="text-destructive hover:bg-destructive/10"
                        data-testid="button-exit-referee-waiting"
                    >
                        <LogOut className="w-5 h-5" />
                    </Button>
                    <span className="text-xs text-muted-foreground/60">BY MOHAMED SEYAM</span>
                </div>

                {/* Main Content */}
                <motion.div
                    className="text-center mb-8"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                >
                    <motion.div
                        className="w-24 h-24 bg-gradient-to-br from-accent to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl"
                        animate={{
                            scale: [1, 1.05, 1],
                            rotate: [0, 5, -5, 0]
                        }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    >
                        <Gavel className="w-12 h-12 text-white" />
                    </motion.div>

                    <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-accent to-amber-500 bg-clip-text text-transparent">
                        أنت الحكم! 👨‍⚖️
                    </h1>
                    <p className="text-muted-foreground">
                        استنى اللاعبين يخلصوا الجولة وبعدين هتراجع إجاباتهم
                    </p>
                </motion.div>

                {/* Round Info */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="border-2 border-accent/30 mb-6">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-muted-foreground">الجولة {room.currentRound + 1}</span>
                                <motion.div
                                    className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg"
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                >
                                    <span className="text-3xl font-bold text-white">{letter}</span>
                                </motion.div>
                            </div>

                            {/* Submissions Progress */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-accent" />
                                        اللاعبين المرسلين
                                    </span>
                                    <span className="font-bold text-accent">
                                        {submittedCount} / {totalPlayers}
                                    </span>
                                </div>

                                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-accent to-amber-500 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(submittedCount / totalPlayers) * 100}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>

                                {/* Player List */}
                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    {activePlayers.map((player) => {
                                        const hasSubmitted = round?.submissions.some(s => s.playerId === player.id);
                                        return (
                                            <motion.div
                                                key={player.id}
                                                className={`flex items-center gap-2 p-2 rounded-lg transition-all ${hasSubmitted
                                                        ? 'bg-green-500/20 border border-green-500/30'
                                                        : 'bg-muted/50 border border-transparent'
                                                    }`}
                                                animate={hasSubmitted ? { scale: [1, 1.05, 1] } : {}}
                                            >
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${hasSubmitted ? 'bg-green-500 text-white' : 'bg-muted-foreground/30'
                                                    }`}>
                                                    {hasSubmitted ? '✓' : player.name.charAt(0)}
                                                </div>
                                                <span className={`text-sm ${hasSubmitted ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                    {player.name}
                                                </span>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Timer Display */}
                <motion.div
                    className="text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Timer className="w-5 h-5" />
                        <span>الوقت المتبقي: </span>
                        <motion.span
                            className={`font-bold text-xl ${state.timeLeft <= 10 ? 'text-destructive' : 'text-primary'}`}
                            animate={state.timeLeft <= 10 ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ repeat: state.timeLeft <= 10 ? Infinity : 0, duration: 0.5 }}
                        >
                            {state.timeLeft}
                        </motion.span>
                        <span>ثانية</span>
                    </div>
                </motion.div>

                {/* Waiting Animation */}
                <motion.div
                    className="mt-8 text-center"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                >
                    <p className="text-muted-foreground text-sm">
                        ⏳ بانتظار انتهاء الجولة...
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
