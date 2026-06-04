/**
 * AdminFeatureManager — Master toggles for every platform feature
 * God-mode ON/OFF switches with real-time persistence to rx_feature_flags
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Power, Music, Radio, Image, Video, Wand2, Users,
  ShoppingBag, MessageSquare, Globe, Shield, AlertTriangle,
  Save, RotateCcw, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/db/supabase';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { toast } from 'sonner';

interface ManagedFeature {
  id: string;
  flag_name: string;
  display_name: string;
  category: string;
  description: string;
  status: boolean;
  is_critical: boolean;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Studio: <Music className="w-4 h-4" />,
  Radio: <Radio className="w-4 h-4" />,
  'AI Tools': <Wand2 className="w-4 h-4" />,
  Social: <Users className="w-4 h-4" />,
  Shopping: <ShoppingBag className="w-4 h-4" />,
  Messaging: <MessageSquare className="w-4 h-4" />,
  System: <Globe className="w-4 h-4" />,
  Admin: <Shield className="w-4 h-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  Studio: '#BC13FE',
  Radio: '#00F2FF',
  'AI Tools': '#00FF88',
  Social: '#E91E63',
  Shopping: '#FF6B35',
  Messaging: '#FFD700',
  System: '#FF4444',
  Admin: '#9C27B0',
};

export default function AdminFeatureManager() {
  const navigate = useNavigate();
  const [features, setFeatures] = useState<ManagedFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState<Set<string>>(new Set());

  useEffect(() => { loadFeatures(); }, []);

  const loadFeatures = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rx_feature_flags')
      .select('*')
      .order('category', { ascending: true });
    if (!error && data) {
      setFeatures(data.map((f: Record<string, unknown>) => ({
        id: f.id as string,
        flag_name: f.flag_name as string,
        display_name: (f.description as string) || (f.flag_name as string).replace(/_/g, ' '),
        category: f.category as string,
        description: f.description as string,
        status: f.status as boolean,
        is_critical: f.is_critical as boolean,
      })));
    }
    setLoading(false);
  };

  const toggleFeature = (id: string) => {
    setFeatures(prev => prev.map(f => f.id === id ? { ...f, status: !f.status } : f));
    setChanged(prev => new Set(prev).add(id));
  };

  const saveChanges = async () => {
    setSaving(true);
    const updates = features.filter(f => changed.has(f.id));
    for (const f of updates) {
      await supabase.from('rx_feature_flags').update({ status: f.status }).eq('id', f.id);
    }
    setChanged(new Set());
    setSaving(false);
    toast.success(`${updates.length} feature${updates.length > 1 ? 's' : ''} updated`);
  };

  const resetAll = async () => {
    if (!confirm('Reset ALL features to ON?')) return;
    setSaving(true);
    for (const f of features) {
      await supabase.from('rx_feature_flags').update({ status: true }).eq('id', f.id);
    }
    await loadFeatures();
    setChanged(new Set());
    setSaving(false);
    toast.success('All features reset to ON');
  };

  const categories = [...new Set(features.map(f => f.category))];

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
              <div className="w-8 h-8 rounded-lg bg-[#BC13FE]/15 flex items-center justify-center border border-[#BC13FE]/20">
                <Power className="w-4 h-4 text-[#BC13FE]" />
              </div>
              <div>
                <h1 className="text-lg font-black text-white">Feature Management</h1>
                <p className="text-[10px] text-white/40">Master toggles for the entire platform</p>
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={resetAll} disabled={saving} className="border-white/10 text-xs">
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset All
              </Button>
              <Button
                size="sm"
                onClick={saveChanges}
                disabled={changed.size === 0 || saving}
                className={`text-xs font-bold ${changed.size > 0 ? 'bg-[#BC13FE] hover:bg-[#BC13FE]/90' : 'bg-white/10'}`}
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {saving ? 'Saving...' : `Save (${changed.size})`}
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map(cat => {
                const catFeatures = features.filter(f => f.category === cat);
                const allOn = catFeatures.every(f => f.status);
                const color = CATEGORY_COLORS[cat] || '#BC13FE';
                return (
                  <motion.div
                    key={cat}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div style={{ color }}>{CATEGORY_ICONS[cat] || <Power className="w-4 h-4" />}</div>
                      <h2 className="text-sm font-bold" style={{ color }}>{cat}</h2>
                      <Badge variant="outline" className="text-[10px] border-white/10">
                        {catFeatures.filter(f => f.status).length}/{catFeatures.length} ON
                      </Badge>
                      {allOn && <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF88]" />}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {catFeatures.map(f => (
                        <Card
                          key={f.id}
                          className={`
                            border rounded-xl p-3 transition-all cursor-pointer
                            ${f.status ? 'border-white/10 bg-white/[0.03]' : 'border-white/5 bg-white/[0.01] opacity-60'}
                            ${changed.has(f.id) ? 'ring-1 ring-[#BC13FE]/30' : ''}
                          `}
                          onClick={() => toggleFeature(f.id)}
                        >
                          <CardContent className="p-0 flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${f.status ? 'bg-white/5' : 'bg-white/[0.02]'}`}>
                              <Power className={`w-4 h-4 ${f.status ? 'text-[#00FF88]' : 'text-white/20'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-white truncate">{f.display_name}</div>
                              <div className="text-[10px] text-white/30 truncate">{f.flag_name}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {f.is_critical && (
                                <AlertTriangle className="w-3 h-3 text-[#FF4444]" />
                              )}
                              <Switch checked={f.status} />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </motion.div>
                );
              })}

              {features.length === 0 && (
                <div className="text-center py-20">
                  <Power className="w-12 h-12 text-white/10 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No feature flags found in database</p>
                  <p className="text-white/20 text-xs mt-1">Seed rx_feature_flags table first</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminAuthGuard>
  );
}
