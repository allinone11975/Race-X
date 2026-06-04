/**
 * Floating Omniverse Button — Global quick-access trigger
 * Bottom-left corner, expandable radial menu
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap, Music, Radio, Image, Video, Wand2, Shield,
  X, Compass, Cpu, ChevronUp, Settings, LayoutDashboard
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRxStore } from '@/store/rxStore';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  path: string;
  color: string;
  bg: string;
}

const ACTIONS: QuickAction[] = [
  { icon: <Music className="w-5 h-5" />, label: 'Studio', path: '/music', color: '#BC13FE', bg: 'bg-[#BC13FE]/15' },
  { icon: <Radio className="w-5 h-5" />, label: 'Radio', path: '/radio', color: '#00F2FF', bg: 'bg-[#00F2FF]/15' },
  { icon: <Image className="w-5 h-5" />, label: 'AI Images', path: '/ai-tools', color: '#00FF88', bg: 'bg-[#00FF88]/15' },
  { icon: <Video className="w-5 h-5" />, label: 'AI Video', path: '/ai-video', color: '#FF6B35', bg: 'bg-[#FF6B35]/15' },
  { icon: <Wand2 className="w-5 h-5" />, label: 'Social', path: '/social', color: '#E91E63', bg: 'bg-[#E91E63]/15' },
  { icon: <Shield className="w-5 h-5" />, label: 'Admin', path: '/admin', color: '#FFD700', bg: 'bg-[#FFD700]/15' },
];

export default function FloatingOmniverseButton() {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useRxStore();
  const isAdmin = user?.is_admin ?? false;

  // Hide on admin pages
  const hiddenPaths = ['/admin'];
  const isHidden = hiddenPaths.some(p => location.pathname.startsWith(p));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 2000);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isHidden) return null;

  const handleAction = (path: string) => {
    setOpen(false);
    if (path === '/admin' && !isAdmin) {
      navigate('/admin');
      return;
    }
    navigate(path);
  };

  return (
    <div ref={ref} className="fixed bottom-6 left-6 z-[100] flex flex-col items-center">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
            className="mb-3 flex flex-col gap-2 items-center"
          >
            {ACTIONS.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleAction(action.path)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 backdrop-blur-md ${action.bg} hover:brightness-125 transition-all group`}
                style={{ color: action.color }}
              >
                {action.icon}
                <span className="text-xs font-semibold whitespace-nowrap">{action.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(!open)}
        className={`
          w-14 h-14 rounded-full flex items-center justify-center
          border-2 shadow-lg shadow-[#BC13FE]/20 backdrop-blur-md
          transition-all duration-300
          ${open
            ? 'bg-[#FF4444]/20 border-[#FF4444]/50 rotate-180'
            : 'bg-[#0A0A0F]/80 border-[#BC13FE]/50 hover:border-[#BC13FE] hover:shadow-[#BC13FE]/40'
          }
          ${pulse && !open ? 'animate-pulse ring-2 ring-[#BC13FE]/30' : ''}
        `}
      >
        {open ? (
          <X className="w-6 h-6 text-[#FF4444]" />
        ) : (
          <Compass className="w-7 h-7 text-[#BC13FE]" />
        )}
      </motion.button>

      {!open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -bottom-5 text-[9px] text-[#BC13FE]/60 font-bold tracking-wider uppercase"
        >
          Omniverse
        </motion.div>
      )}
    </div>
  );
}
