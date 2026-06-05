/**
 * Omniverse Control Card — Dashboard hub for feature toggles & quick stats
 * Shown on main dashboard when user selects "Card View" in settings
 */
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  Music, Radio, Image, Video, Wand2, Shield, Zap,
  Activity, TrendingUp, Users, Diamond, ChevronRight
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/db/supabase';
import { useRxStore } from '@/store/rxStore';

interface FeatureState {
  studio_mode: boolean;
  radio_mode: boolean;
  ai_images: boolean;
  ai_video: boolean;
  ai_tools: boolean;
  social_feed: boolean;
}

const FEATURE_LABELS: Record<keyof FeatureState, string> = {
  studio_mode: 'Studio Mode',
  radio_mode: 'Live Radio',
  ai_images: 'AI Images',
  ai_video: 'AI Video',
  ai_tools: 'AI Tools',
  social_feed: 'Social Feed',
};

const FEATURE_ICONS: Record<keyof FeatureState, React.ReactNode> = {
  studio_mode: <Music className="w-4 h-4" />,
  radio_mode: <Radio className="w-4 h-4" />,
  ai_images: <Image className="w-4 h-4" />,
  ai_video: <Video className="w-4 h-4" />,
  ai_tools: <Wand2 className="w-4 h-4" />,
  social_feed: <Users className="w-4 h-4" />,
};

const FEATURE_COLORS: Record<keyof FeatureState, string> = {
  studio_mode: '#BC13FE',
  radio_mode: '#00F2FF',
  ai_images: '#00FF88',
  ai_video: '#FF6B35',
  ai_tools: '#FFD700',
  social_feed: '#E91E63',
};

export default function OmniverseControlCard() {
  const navigate = useNavigate();
  const { user } = useRxStore();
  const [features, setFeatures] = useState<FeatureState>({
    studio_mode: true, radio_mode: true, ai_images: true,
    ai_video: true, ai_tools: true, social_feed: true,
  });
  const [stats, setStats] = useState({ users: 0, online: 0, renders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeatureFlags();
    loadStats();
  }, []);

  const loadFeatureFlags = async () => {
    const { data } = await supabase.from('rx_feature_flags').select('flag_name, status');
    if (data) {
      const map: Partial<FeatureState> = {};
      data.forEach((f: { flag_name: string; status: boolean }) => {
        if (f.flag_name in FEATURE_LABELS) {
          (map as Record<string, boolean>)[f.flag_name] = f.status;
        }
      });
      setFeatures(prev => ({ ...prev, ...map }));
    }
    setLoading(false);
  };

  const loadStats = async () => {
    const { count: users } = await supabase.from('users').select('*', { count: 'exact', head: true });
    setStats({ users: users ?? 0, online: Math.floor((users ?? 0) * 0.15), renders: 0 });
  };

  const toggleFeature = async (key: keyof FeatureState) => {
    const newVal = !features[key];
    setFeatures(prev => ({ ...prev, [key]: newVal }));
    await supabase.from('rx_feature_flags').update({ status: newVal }).eq('flag_name', key);
  };

  if (loading) {
    return (
      <Card className="bg-white/5 border-white/10 p-5 rounded-2xl animate-pulse">
        <div className="h-6 w-32 bg-white/10 rounded mb-4" />
        <div className="grid grid-cols-2 gap-2">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-10 bg-white/10 rounded-lg" />)}
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="bg-[#0A0A0F]/80 border border-white/10 backdrop-blur-xl rounded-2xl p-5 overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#BC13FE]/20 to-[#00F2FF]/20 flex items-center justify-center border border-[#BC13FE]/20">
              <Zap className="w-4 h-4 text-[#BC13FE]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Omniverse Control</h3>
              <p className="text-[10px] text-white/40">Global feature toggles</p>
            </div>
          </div>
          {user?.is_admin && (
            <button
              onClick={() => navigate('/admin')}
              className="text-[10px] flex items-center gap-1 text-[#BC13FE] hover:underline"
            >
              Admin <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.keys(FEATURE_LABELS) as (keyof FeatureState)[]).map(key => (
            <button
              key={key}
              onClick={() => toggleFeature(key)}
              className={`
                flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left
                ${features[key]
                  ? 'border-white/15 bg-white/5 hover:bg-white/10'
                  : 'border-white/5 bg-white/[0.02] opacity-50'
                }
              `}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: features[key] ? `${FEATURE_COLORS[key]}15` : 'transparent',
                  color: features[key] ? FEATURE_COLORS[key] : '#666',
                }}
              >
                {FEATURE_ICONS[key]}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-white truncate">{FEATURE_LABELS[key]}</div>
                <div className="text-[9px] text-white/40">{features[key] ? 'ON' : 'OFF'}</div>
              </div>
              <div className="ml-auto">
                <Switch checked={features[key]} className="scale-75" />
              </div>
            </button>
          ))}
        </div>

        {/* Stats Row */}
        <div className="flex gap-3 mt-4 pt-3 border-t border-white/5">
          {[
            { icon: <Users className="w-3 h-3" />, label: 'Users', value: stats.users, color: '#00F2FF' },
            { icon: <Activity className="w-3 h-3" />, label: 'Online', value: stats.online, color: '#00FF88' },
            { icon: <Diamond className="w-3 h-3" />, label: 'Diamonds', value: user?.diamonds ?? 0, color: '#FFD700' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div style={{ color: s.color }}>{s.icon}</div>
              <span className="text-[11px] font-bold" style={{ color: s.color }}>{s.value}</span>
              <span className="text-[9px] text-white/30">{s.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
