/**
 * Cost Protection Engine
 * Daily/weekly/monthly provider limits, auto-throttling, spend tracking
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, DollarSign, Plus, Save, RefreshCw, AlertTriangle,
  TrendingUp, BarChart3, Edit2, Trash2, CheckCircle2, XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

interface Budget {
  id: string;
  provider_name: string;
  budget_type: 'daily' | 'weekly' | 'monthly';
  limit_usd: number;
  spent_usd: number;
  period_start: string;
  period_end: string;
  is_active: boolean;
  alert_threshold: number;
}

const PROVIDERS = [
  'suno','udio','beatoven','soundraw','aiva','mubert',
  'musicgen','audioldm','riffusion','boomy','soundful','stability'
];

const TYPE_COLOR = {
  daily:   '#00F2FF',
  weekly:  '#BC13FE',
  monthly: '#FFD700',
};

const BLANK: Omit<Budget, 'id'> = {
  provider_name: PROVIDERS[0], budget_type: 'daily',
  limit_usd: 5.0, spent_usd: 0,
  period_start: new Date().toISOString().split('T')[0],
  period_end: new Date().toISOString().split('T')[0],
  is_active: true, alert_threshold: 0.80,
};

export default function AdminBudgets() {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Budget> | null>(null);
  const [saving, setSaving] = useState(false);
  const [globalCap, setGlobalCap] = useState('');
  const [zeroCostMode, setZeroCostMode] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('cost_budgets').select('*').order('budget_type').order('provider_name');
    setBudgets((data as Budget[]) ?? []);

    const { data: cfg } = await supabase.from('system_config').select('value').eq('key', 'zero_cost_mode').maybeSingle();
    if (cfg) setZeroCostMode((cfg.value as { enabled?: boolean }).enabled ?? false);
    setLoading(false);
  };

  const openNew = () => { setEditing({ ...BLANK }); setOpen(true); };
  const openEdit = (b: Budget) => { setEditing({ ...b }); setOpen(true); };

  const save = async () => {
    if (!editing?.provider_name || !editing?.limit_usd) { toast.error('Provider and limit required'); return; }
    setSaving(true);
    try {
      const periodEnd = editing.budget_type === 'daily'
        ? editing.period_start
        : editing.budget_type === 'weekly'
        ? new Date(new Date(editing.period_start!).getTime() + 7 * 86400000).toISOString().split('T')[0]
        : new Date(new Date(editing.period_start!).getFullYear(), new Date(editing.period_start!).getMonth() + 1, 0).toISOString().split('T')[0];

      const payload = { ...editing, period_end: periodEnd, updated_at: new Date().toISOString() };

      if (editing.id) {
        await supabase.from('cost_budgets').update(payload).eq('id', editing.id);
        await supabase.from('admin_audit_log').insert({ action_type: 'BUDGET_UPDATE', target_type: 'provider', target_id: editing.provider_name, severity: 'info', payload: { limit: editing.limit_usd, type: editing.budget_type } });
        toast.success('Budget updated');
      } else {
        await supabase.from('cost_budgets').insert(payload);
        await supabase.from('admin_audit_log').insert({ action_type: 'BUDGET_CREATE', target_type: 'provider', target_id: editing.provider_name, severity: 'info', payload: { limit: editing.limit_usd, type: editing.budget_type } });
        toast.success('Budget created');
      }
      setOpen(false); setEditing(null); load();
    } catch (e) { toast.error('Save failed'); }
    setSaving(false);
  };

  const del = async (id: string, name: string) => {
    await supabase.from('cost_budgets').delete().eq('id', id);
    await supabase.from('admin_audit_log').insert({ action_type: 'BUDGET_DELETE', target_type: 'provider', target_id: name, severity: 'warning' });
    setBudgets(prev => prev.filter(b => b.id !== id));
    toast.success('Budget removed');
  };

  const toggleZeroCost = async () => {
    const newVal = !zeroCostMode;
    await supabase.from('system_config').update({ value: { enabled: newVal, cache_first: true, prefer_free_tier: newVal } }).eq('key', 'zero_cost_mode');
    await supabase.from('admin_audit_log').insert({ action_type: 'ZERO_COST_TOGGLE', target_type: 'system', severity: 'warning', payload: { enabled: newVal } });
    setZeroCostMode(newVal);
    toast[newVal ? 'success' : 'info'](newVal ? '💰 Zero-Cost Mode ON — cache-first, free providers preferred' : 'Zero-Cost Mode OFF');
  };

  const totalSpent = budgets.reduce((s, b) => s + b.spent_usd, 0);
  const totalLimit = budgets.reduce((s, b) => s + b.limit_usd, 0);
  const overBudget = budgets.filter(b => b.spent_usd >= b.limit_usd * b.alert_threshold);

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-[#0A0A0F] text-white pb-12">
        <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#FF6B35]/10 px-4 py-3">
          <div className="flex items-center gap-3 max-w-6xl mx-auto">
            <button onClick={() => navigate('/admin/omniverse')} className="p-2 rounded-lg border border-white/10 hover:bg-white/5 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <DollarSign className="w-4 h-4 text-[#FF6B35] shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-black tracking-widest">COST PROTECTION ENGINE</h1>
              <p className="text-[10px] text-white/40">Daily · weekly · monthly provider budgets · auto-throttle · spend alerts</p>
            </div>
            <Button size="sm" onClick={openNew} className="h-8 px-3 text-xs bg-[#FF6B35]/10 border border-[#FF6B35]/30 text-[#FF6B35] hover:bg-[#FF6B35]/20">
              <Plus className="w-3 h-3 mr-1" /> Budget
            </Button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-5 space-y-5">
          {/* Summary + Zero-Cost Mode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white/[0.03] border-white/8 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Total Spend</p>
                  <BarChart3 className="w-4 h-4 text-[#FF6B35]" />
                </div>
                <p className="text-2xl font-black text-[#FF6B35]">${totalSpent.toFixed(4)}</p>
                <p className="text-xs text-white/40">of ${totalLimit.toFixed(2)} limit</p>
                <div className="h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-[#FF6B35] rounded-full transition-all"
                    style={{ width: totalLimit > 0 ? `${Math.min((totalSpent / totalLimit) * 100, 100)}%` : '0%' }} />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/[0.03] border-white/8 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Budget Alerts</p>
                  <AlertTriangle className="w-4 h-4 text-[#FFD700]" />
                </div>
                <p className={`text-2xl font-black ${overBudget.length > 0 ? 'text-[#FFD700]' : 'text-[#00FF88]'}`}>
                  {overBudget.length}
                </p>
                <p className="text-xs text-white/40">providers near/over limit</p>
                {overBudget.slice(0, 2).map(b => (
                  <p key={b.id} className="text-[10px] text-[#FFD700] mt-1">{b.provider_name} ({b.budget_type})</p>
                ))}
              </CardContent>
            </Card>
            <Card className={`rounded-2xl border transition-all ${zeroCostMode ? 'border-[#00FF88]/30 bg-[#00FF88]/5' : 'border-white/8 bg-white/[0.03]'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Zero-Cost Mode</p>
                  <DollarSign className={`w-4 h-4 ${zeroCostMode ? 'text-[#00FF88]' : 'text-white/30'}`} />
                </div>
                <p className={`text-sm font-black mb-1 ${zeroCostMode ? 'text-[#00FF88]' : 'text-white/60'}`}>
                  {zeroCostMode ? 'ACTIVE — Cache-First' : 'Inactive'}
                </p>
                <p className="text-[10px] text-white/40 mb-3">Prefer free-tier providers, maximize cache reuse</p>
                <Button size="sm" onClick={toggleZeroCost}
                  className={`h-8 px-3 text-xs font-bold border transition-all ${
                    zeroCostMode
                      ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                      : 'bg-[#00FF88]/10 border-[#00FF88]/30 text-[#00FF88] hover:bg-[#00FF88]/20'
                  }`}>
                  {zeroCostMode ? 'Deactivate' : 'Activate'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Budget List grouped by type */}
          {(['daily', 'weekly', 'monthly'] as const).map(type => {
            const typeBudgets = budgets.filter(b => b.budget_type === type);
            if (typeBudgets.length === 0) return null;
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLOR[type] }} />
                  <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: TYPE_COLOR[type] }}>
                    {type} budgets
                  </h3>
                  <Badge className="text-[9px] px-1.5 py-0 bg-white/5 border-white/10 text-white/40">{typeBudgets.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {typeBudgets.map(b => {
                    const pct = b.limit_usd > 0 ? (b.spent_usd / b.limit_usd) * 100 : 0;
                    const alert = pct >= b.alert_threshold * 100;
                    return (
                      <motion.div key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Card className={`rounded-xl border transition-all ${alert ? 'border-[#FFD700]/30 bg-[#FFD700]/[0.02]' : 'border-white/8 bg-white/[0.02]'}`}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1">
                                  {alert && <AlertTriangle className="w-3 h-3 text-[#FFD700] shrink-0" />}
                                  <p className="text-xs font-bold text-white truncate">{b.provider_name}</p>
                                </div>
                                <div className="flex items-baseline gap-1 mb-1">
                                  <span className={`text-base font-black ${alert ? 'text-[#FFD700]' : 'text-white'}`}>
                                    ${b.spent_usd.toFixed(4)}
                                  </span>
                                  <span className="text-xs text-white/40">/ ${b.limit_usd.toFixed(2)}</span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-1">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${Math.min(pct, 100)}%`,
                                      backgroundColor: pct >= 100 ? '#FF4444' : pct >= b.alert_threshold * 100 ? '#FFD700' : TYPE_COLOR[type]
                                    }}
                                  />
                                </div>
                                <p className="text-[9px] text-white/30">{b.period_start} → {b.period_end}</p>
                              </div>
                              <div className="flex flex-col gap-1">
                                <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:bg-white/5">
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button onClick={() => del(b.id, b.provider_name)} className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {!loading && budgets.length === 0 && (
            <div className="py-16 text-center text-white/30">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No budgets configured yet</p>
              <p className="text-xs mt-1">Add limits per provider to protect against overspend</p>
              <Button onClick={openNew} className="mt-4 h-9 px-4 text-xs bg-[#FF6B35]/10 border border-[#FF6B35]/30 text-[#FF6B35] hover:bg-[#FF6B35]/20">
                <Plus className="w-3 h-3 mr-1" /> Add First Budget
              </Button>
            </div>
          )}
        </div>

        {/* Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-[#0F0F1A] border-white/10 text-white max-w-[calc(100%-2rem)] md:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-sm font-black">{editing?.id ? 'Edit Budget' : 'Add Budget'}</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Provider</label>
                  <Select value={editing.provider_name} onValueChange={v => setEditing(p => ({ ...p!, provider_name: v }))}>
                    <SelectTrigger className="h-9 bg-white/5 border-white/10 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#0F0F1A] border-white/10">
                      {PROVIDERS.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Budget Type</label>
                  <Select value={editing.budget_type} onValueChange={v => setEditing(p => ({ ...p!, budget_type: v as Budget['budget_type'] }))}>
                    <SelectTrigger className="h-9 bg-white/5 border-white/10 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#0F0F1A] border-white/10">
                      {['daily','weekly','monthly'].map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Limit (USD)</label>
                    <Input type="number" step="0.01" min="0"
                      value={editing.limit_usd ?? ''}
                      onChange={e => setEditing(p => ({ ...p!, limit_usd: parseFloat(e.target.value) || 0 }))}
                      className="bg-white/5 border-white/10 text-xs h-9" />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Alert At (%)</label>
                    <Input type="number" step="5" min="50" max="100"
                      value={Math.round((editing.alert_threshold ?? 0.8) * 100)}
                      onChange={e => setEditing(p => ({ ...p!, alert_threshold: (parseInt(e.target.value) || 80) / 100 }))}
                      className="bg-white/5 border-white/10 text-xs h-9" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Period Start</label>
                  <Input type="date" value={editing.period_start ?? ''} onChange={e => setEditing(p => ({ ...p!, period_start: e.target.value }))}
                    className="bg-white/5 border-white/10 text-xs h-9" />
                </div>
                <div className="flex justify-end pt-1">
                  <Button onClick={save} disabled={saving} className="h-9 px-5 bg-[#FF6B35]/10 border border-[#FF6B35]/30 text-[#FF6B35] hover:bg-[#FF6B35]/20 text-xs font-bold">
                    {saving ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                    {editing.id ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminAuthGuard>
  );
}
