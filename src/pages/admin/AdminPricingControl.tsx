/**
 * AdminPricingControl — Dynamic pricing & premium toggles
 * Switch any feature between Free and Premium, adjust diamond costs live
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Tag, Diamond, ToggleLeft, ToggleRight,
  Save, RotateCcw, Coins, Zap, Music, Radio, Image,
  Video, Wand2, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/db/supabase';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { toast } from 'sonner';

interface PricingItem {
  id: string;
  feature_key: string;
  display_name: string;
  category: string;
  is_premium: boolean;
  diamond_cost: number;
  unit: string;
  description: string;
}

const ICONS: Record<string, React.ReactNode> = {
  studio_mode: <Music className="w-4 h-4" />,
  radio_mode: <Radio className="w-4 h-4" />,
  ai_images: <Image className="w-4 h-4" />,
  ai_video: <Video className="w-4 h-4" />,
  ai_tools: <Wand2 className="w-4 h-4" />,
};

const COLORS: Record<string, string> = {
  studio_mode: '#BC13FE',
  radio_mode: '#00F2FF',
  ai_images: '#00FF88',
  ai_video: '#FF6B35',
  ai_tools: '#FFD700',
};

export default function AdminPricingControl() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState<Set<string>>(new Set());

  useEffect(() => { loadPricing(); }, []);

  const loadPricing = async () => {
    setLoading(true);
    // Try loading from rx_feature_flags (which has diamond_cost concept via config)
    const { data, error } = await supabase
      .from('rx_feature_flags')
      .select('*')
      .order('category', { ascending: true });

    if (!error && data) {
      const mapped = data
        .filter((f: Record<string, unknown>) => f.category === 'Economy' || f.category === 'Studio' || f.category === 'AI Tools')
        .map((f: Record<string, unknown>) => {
          const config = (f.rollout_config as Record<string, unknown>) || {};
          return {
            id: f.id as string,
            feature_key: f.flag_name as string,
            display_name: (f.description as string) || (f.flag_name as string).replace(/_/g, ' '),
            category: f.category as string,
            is_premium: config.is_premium === true,
            diamond_cost: (config.diamond_cost as number) || 0,
            unit: (config.unit as string) || 'use',
            description: f.description as string,
          };
        });
      setItems(mapped);
    }
    setLoading(false);
  };

  const togglePremium = (id: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, is_premium: !it.is_premium } : it));
    setChanged(prev => new Set(prev).add(id));
  };

  const updateCost = (id: string, cost: number) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, diamond_cost: Math.max(0, cost) } : it));
    setChanged(prev => new Set(prev).add(id));
  };

  const saveChanges = async () => {
    setSaving(true);
    const updates = items.filter(it => changed.has(it.id));
    for (const it of updates) {
      const config = { is_premium: it.is_premium, diamond_cost: it.diamond_cost, unit: it.unit };
      await supabase.from('rx_feature_flags').update({ rollout_config: config }).eq('id', it.id);
    }
    setChanged(new Set());
    setSaving(false);
    toast.success(`${updates.length} pricing rule${updates.length > 1 ? 's' : ''} saved`);
  };

  const resetDefaults = async () => {
    if (!confirm('Reset all pricing to defaults (Free, 0 diamonds)?')) return;
    setSaving(true);
    for (const it of items) {
      await supabase.from('rx_feature_flags').update({
        rollout_config: { is_premium: false, diamond_cost: 0, unit: 'use' }
      }).eq('id', it.id);
    }
    await loadPricing();
    setChanged(new Set());
    setSaving(false);
    toast.success('All pricing reset to Free defaults');
  };

  const totalRevenue = items.reduce((sum, it) => it.is_premium ? sum + it.diamond_cost * 100 : sum, 0);
  const premiumCount = items.filter(it => it.is_premium).length;

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-[#0A0A0F] text-white">
        {/* Header */}
        <div className="border-b border-white/8 bg-[#0A0A0F]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="text-white/60 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FFD700]/15 flex items-center justify-center border border-[#FFD700]/20">
                <Tag className="w-4 h-4 text-[#FFD700]" />
              </div>
              <div>
                <h1 className="text-lg font-black text-white">Dynamic Pricing</h1>
                <p className="text-[10px] text-white/40">Free / Premium toggles & diamond cost editor</p>
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={resetDefaults} disabled={saving} className="border-white/10 text-xs">
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
              </Button>
              <Button
                size="sm"
                onClick={saveChanges}
                disabled={changed.size === 0 || saving}
                className={`text-xs font-bold ${changed.size > 0 ? 'bg-[#FFD700] text-black hover:bg-[#FFD700]/90' : 'bg-white/10'}`}
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {saving ? 'Saving...' : `Save (${changed.size})`}
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: <Coins className="w-4 h-4" />, label: 'Premium Features', value: `${premiumCount}/${items.length}`, color: '#FFD700' },
              { icon: <Diamond className="w-4 h-4" />, label: 'Avg. Cost', value: items.length ? `${Math.round(items.reduce((s, it) => s + it.diamond_cost, 0) / items.length)} 💎` : '0', color: '#BC13FE' },
              { icon: <TrendingUp className="w-4 h-4" />, label: 'Est. Revenue', value: `${totalRevenue} 💎/mo`, color: '#00FF88' },
            ].map(stat => (
              <Card key={stat.label} className="bg-white/5 border-white/8 p-3 flex items-center gap-3">
                <div style={{ color: stat.color }}>{stat.icon}</div>
                <div>
                  <div className="text-lg font-black" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-[10px] text-white/40">{stat.label}</div>
                </div>
              </Card>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(it => {
                const color = COLORS[it.feature_key] || '#BC13FE';
                const icon = ICONS[it.feature_key] || <Zap className="w-4 h-4" />;
                return (
                  <motion.div
                    key={it.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`
                      flex items-center gap-4 p-3 rounded-xl border transition-all
                      ${changed.has(it.id) ? 'border-[#FFD700]/30 bg-[#FFD700]/5' : 'border-white/8 bg-white/[0.02]'}
                    `}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${color}15`, color }}
                    >
                      {icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{it.display_name}</span>
                        <Badge
                          className={`text-[10px] ${it.is_premium ? 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/20' : 'bg-[#00FF88]/15 text-[#00FF88] border-[#00FF88]/20'}`}
                        >
                          {it.is_premium ? 'PREMIUM' : 'FREE'}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-white/30 truncate">{it.description}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-white/40">Diamond Cost</span>
                        <div className="flex items-center gap-1">
                          <Diamond className="w-3 h-3 text-[#BC13FE]" />
                          <Input
                            type="number"
                            min={0}
                            value={it.diamond_cost}
                            onChange={(e) => updateCost(it.id, parseInt(e.target.value) || 0)}
                            className="w-16 h-7 text-xs bg-white/5 border-white/10 text-white text-center"
                            disabled={!it.is_premium}
                          />
                          <span className="text-[10px] text-white/30">/{it.unit}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-1 min-w-[60px]">
                        <span className="text-[10px] text-white/40">Mode</span>
                        <button onClick={() => togglePremium(it.id)} className="flex items-center gap-1">
                          {it.is_premium ? (
                            <ToggleRight className="w-6 h-6 text-[#FFD700]" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-white/20" />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {items.length === 0 && (
                <div className="text-center py-20">
                  <Tag className="w-12 h-12 text-white/10 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No pricing rules found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminAuthGuard>
  );
}
