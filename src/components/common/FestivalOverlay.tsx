import { motion, AnimatePresence } from 'motion/react';
import type { FestivalTheme } from '@/store/rxStore';

const CONFIGS: Record<FestivalTheme, { emoji: string; count: number; label: string } | null> = {
  default: null,
  diwali: { emoji: '🪔', count: 12, label: 'diya' },
  christmas: { emoji: '❄️', count: 18, label: 'snowflake' },
  eid: { emoji: '🌙', count: 8, label: 'crescent' },
  newyear: { emoji: '✨', count: 20, label: 'sparkle' },
  halloween: { emoji: '🎃', count: 10, label: 'pumpkin' },
};

export default function FestivalOverlay({ theme }: { theme: FestivalTheme }) {
  const config = CONFIGS[theme];
  if (!config) return null;

  const particles = Array.from({ length: config.count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 6,
    duration: 4 + Math.random() * 4,
    size: 16 + Math.random() * 16,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute select-none"
            style={{ left: `${p.x}%`, top: -40, fontSize: p.size }}
            animate={{ y: '110vh', rotate: [0, 180, 360], opacity: [1, 0.8, 0] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
          >
            {config.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
