import { motion } from 'framer-motion';
import { User, Users, Globe, PawPrint, Box } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Category } from '@shared/schema';

interface CategoryInputProps {
  category: Category;
  value: string;
  onChange: (value: string) => void;
  letter: string;
  index: number;
  disabled?: boolean;
}

const categoryConfig: Record<Category, { icon: any; color: string; placeholder: string }> = {
  'ولد': { icon: User, color: 'bg-blue-500', placeholder: 'اسم ولد' },
  'بنت': { icon: Users, color: 'bg-pink-500', placeholder: 'اسم بنت' },
  'بلد': { icon: Globe, color: 'bg-green-500', placeholder: 'اسم بلد' },
  'حيوان': { icon: PawPrint, color: 'bg-amber-500', placeholder: 'اسم حيوان' },
  'جماد': { icon: Box, color: 'bg-purple-500', placeholder: 'اسم جماد' },
};

export function CategoryInput({ category, value, onChange, letter, index, disabled }: CategoryInputProps) {
  const config = categoryConfig[category];
  const Icon = config.icon;

  return (
    <motion.div
      className="flex items-center gap-3 bg-card rounded-xl p-3 border border-card-border shadow-sm"
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
    >
      <div className={`w-12 h-12 ${config.color} rounded-xl flex items-center justify-center shrink-0`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1">
        <label className="text-sm font-medium text-muted-foreground mb-1 block">
          {category}
        </label>
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${config.placeholder} بحرف ${letter}`}
          disabled={disabled}
          className="text-lg font-medium border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
          data-testid={`input-category-${category}`}
        />
      </div>
    </motion.div>
  );
}
