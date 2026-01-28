import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown, User, Users, Globe, PawPrint, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Category, ValidatedAnswer } from '@shared/schema';

interface VoteCardProps {
  answer: ValidatedAnswer;
  onVote: (accepted: boolean) => void;
  canVote: boolean;
  index: number;
}

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

export function VoteCard({ answer, onVote, canVote, index }: VoteCardProps) {
  const Icon = categoryIcons[answer.category];

  return (
    <motion.div
      className="bg-card rounded-xl p-4 border border-card-border shadow-sm"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 ${categoryColors[answer.category]} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{answer.playerName}</p>
          <p className="font-bold text-lg">{answer.answer || '—'}</p>
        </div>
      </div>

      {canVote && answer.answer && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
            onClick={() => onVote(true)}
            data-testid={`button-vote-accept-${answer.playerId}-${answer.category}`}
          >
            <ThumbsUp className="w-4 h-4 ml-2" />
            صح
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => onVote(false)}
            data-testid={`button-vote-reject-${answer.playerId}-${answer.category}`}
          >
            <ThumbsDown className="w-4 h-4 ml-2" />
            غلط
          </Button>
        </div>
      )}

      {!canVote && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-accent" />
            <span>{answer.votes.accepted}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThumbsDown className="w-4 h-4 text-destructive" />
            <span>{answer.votes.rejected}</span>
          </div>
          {answer.isValid && (
            <span className={`font-bold ${answer.isUnique ? 'text-accent' : 'text-secondary'}`}>
              +{answer.score}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
