/**
 * FESTIVAL THEMES — Theme switcher with live preview
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import RxBadge from '@/components/common/RxBadge';
import { supabase } from '@/db/supabase';
import { useRxStore } from '@/store/rxStore';
import type { FestivalTheme } from '@/store/rxStore';
import type { FestivalThemeConfig } from '@/types/race-x';

const THEME_EMOJIS: Record<string, string> = {
  default: '🌌', diwali: '🪔', christmas: '❄️', eid: '🌙', newyear: '✨', halloween: '🎃',
};

export default function FestivalThemesPage() {
  const navigate = useNavigate();
  const { festivalTheme, setFestivalTheme } = useRxStore();
  const [themes, setThemes] = useState<FestivalThemeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => { fetchThemes(); }, []);

  const fetchThemes = async () => {
    const { data } = await supabase.from('festival_themes').select('*').order('created_at');
    setThemes(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const applyTheme = async (theme: FestivalThemeConfig) => {
    setApplying(theme.theme_name);
    // Apply CSS variables
    document.documentElement.style.setProperty('--festival-primary', theme.primary_color);
    document.documentElement.style.setProperty('--festival-secondary', theme.secondary_color);
    document.documentElement.style.setProperty('--app-background-color', theme.background_color);
    setFestivalTheme(theme.theme_name as FestivalTheme);
    toast.success(`${THEME_EMOJIS[theme.theme_name] || '🎉'} ${theme.display_name} theme applied!`);
    setApplying(null);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#BC13FE]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/gateway')} className="p-2 rounded-lg border border-white/10 hover:border-[#BC13FE]/40 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <RxBadge label="THEMES" variant="purple" />
        <div>
          <h1 className="text-sm font-bold tracking-widest">FESTIVAL THEMES</h1>
          <p className="text-[10px] text-muted-foreground">Platform-wide seasonal experiences</p>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl border border-[#BC13FE]/20 bg-[#BC13FE]/5 text-xs text-[#BC13FE] flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0" />
          Festival themes add particle effects and transform the platform's color palette globally.
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-32 rounded-xl bg-white/5 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {themes.map((theme, i) => {
              const isActive = festivalTheme === theme.theme_name;
              return (
                <motion.button
                  key={theme.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.07 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => applyTheme(theme)}
                  className={`relative p-4 rounded-xl border text-left transition-all overflow-hidden ${isActive ? 'border-white/40' : 'border-white/10 hover:border-white/25'}`}
                  style={{ backgroundColor: `${theme.background_color}` }}
                >
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 opacity-40" style={{ background: `linear-gradient(135deg, ${theme.primary_color}20, ${theme.secondary_color}20)` }} />

                  <div className="relative">
                    <div className="text-3xl mb-2">{THEME_EMOJIS[theme.theme_name] || '🎉'}</div>
                    <p className="text-xs font-bold text-white text-balance">{theme.display_name}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.primary_color }} />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.secondary_color }} />
                    </div>
                  </div>

                  {isActive && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {applying === theme.theme_name && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
