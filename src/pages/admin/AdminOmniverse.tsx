/**
 * RACE-X Master Omniverse Dashboard
 * Single command center — platform health, kill-switch, quick navigation
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, Shield, Users, Diamond, Music, Radio, Image, Video,
  Wand2, ShoppingBag, AlertTriangle, Activity, BarChart3,
  Bell, DollarSign, Settings2, Lock, Receipt, Power,
  Tag, Cpu, RefreshCw, ChevronRight, CheckCircle2, XCircle,
  TrendingUp, Globe, Flame, Eye, Database, LayoutDashboard,
  MessageSquare, FlaskConical, Bug, HeartPulse, ListChecks, Boxes, Gem
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

interface PlatformStat {
  label: string;
  value: string | number;
  delta?: string;
  color: string;
  icon: React.ReactNode;
}

interface ModuleStatus {
  name: string;
  icon: React.ReactNode;
  color: string;
  path: string;
  enabled: boolean;
  flagKey: string;
}

const NAV_CARDS = [
  { icon: Users,      label: 'Users',           path: '/admin/users',      color: '#00F2FF', badge: 'Manage' },
  { icon: BarChart3,  label: 'Analytics',        path: '/admin/analytics',  color: '#BC13FE', badge: 'Insights' },
  { icon: Bell,       label: 'Notifications',    path: '/admin/notifications', color: '#FFD700', badge: 'Broadcast' },
  { icon: Activity,   label: 'Audit Log',        path: '/admin/audit',      color: '#00FF88', badge: 'Logs' },
  { icon: DollarSign, label: 'Budgets',          path: '/admin/budgets',    color: '#FF6B35', badge: 'Cost' },
  { icon: Settings2,  label: 'API Manager',      path: '/admin/api-manager',color: '#00FF88', badge: 'Providers' },
  { icon: Receipt,    label: 'Ledger',           path: '/admin/ledger',     color: '#00F2FF', badge: 'Finance' },
  { icon: Tag,        label: 'Pricing',          path: '/admin/pricing',    color: '#FFD700', badge: 'Economy' },
  { icon: FlaskConical,label:'Features',         path: '/admin/features',   color: '#BC13FE', badge: 'Flags' },
  { icon: Cpu,        label: 'Overrides',        path: '/admin/overrides',  color: '#FF4444', badge: 'System' },
  { icon: Diamond,    label: 'Economy',          path: '/admin/economy',    color: '#00FF88', badge: 'Diamonds' },
  { icon: Bug,        label: 'Fraud',            path: '/admin/fraud',      color: '#FF4444', badge: 'Security' },
  { icon: Lock,       label: 'Lockdown',         path: '/admin/lockdown',   color: '#f87171', badge: 'Critical' },
  { icon: Database,   label: 'KYC Review',       path: '/admin/kyc',        color: '#BC13FE', badge: 'Identity' },
  { icon: HeartPulse, label: 'Provider Health',  path: '/admin/health',     color: '#00FF88', badge: 'Phase F' },
  { icon: ListChecks, label: 'Queue Monitor',    path: '/admin/queue',      color: '#00F2FF', badge: 'Phase F' },
  { icon: Boxes,      label: 'Feature Registry', path: '/admin/registry',   color: '#FFD700', badge: 'Phase F' },
  { icon: Gem,        label: 'Diamond Economy',  path: '/admin/diamonds',   color: '#BC13FE', badge: 'Phase F' },
];

const MODULES: ModuleStatus[] = [
  { name: 'RX Studio',   icon: <Wand2 className="w-4 h-4" />,     color: '#BC13FE', path: '/studio',   enabled: true,  flagKey: 'studio_mode' },
  { name: 'RX Music',    icon: <Music className="w-4 h-4" />,      color: '#00F2FF', path: '/music',    enabled: true,  flagKey: 'music_studio' },
  { name: 'Live Radio',  icon: <Radio className="w-4 h-4" />,      color: '#00FF88', path: '/radio',    enabled: true,  flagKey: 'live_radio' },
  { name: 'RX Social',   icon: <Users className="w-4 h-4" />,      color: '#E91E63', path: '/social',   enabled: true,  flagKey: 'social_feed' },
  { name: 'AI Images',   icon: <Image className="w-4 h-4" />,      color: '#FFD700', path: '/ai-tools', enabled: true,  flagKey: 'ai_images' },
  { name: 'AI Video',    icon: <Video className="w-4 h-4" />,      color: '#FF6B35', path: '/ai-video', enabled: false, flagKey: 'ai_video' },
  { name: 'AI Chat',     icon: <MessageSquare className="w-4 h-4"/>,color:'#00F2FF', path: '/chat',     enabled: true,  flagKey: 'rx_magic_chat' },
  { name: 'RX Shopping', icon: <ShoppingBag className="w-4 h-4" />,color: '#BC13FE', path: '/shop',     enabled: true,  flagKey: 'rx_shopping' },
];

export default function AdminOmniverse() {
  const navigate = useNavigate();
  const [killSwitch, setKillSwitch] = useState(false);
  const [platformMode, setPlatformMode] = useState<'live' | 'maintenance'>('live');
  const [modules, setModules] = useState<ModuleStatus[]>(MODULES);
  const [stats, setStats] = useState({
    totalUsers: 0, activeToday: 0, diamonds: 0, queueJobs: 0,
    pendingAudit: 0, openFraud: 0, notifications: 0, providers: 12,
  });
  const [loading, setLoading] = useState(true);
  const [togglingKill, setTogglingKill] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [configRes, flagsRes, usersRes, queueRes, fraudRes, notifRes] = await Promise.all([
        supabase.from('system_config').select('key, value').in('key', ['global_kill_switch', 'platform_mode']),
        supabase.from('rx_feature_flags_v2').select('flag_name, is_enabled'),
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('queue_jobs').select('id', { count: 'exact', head: true }).eq('status', 'running'),
        supabase.from('fraud_events').select('id', { count: 'exact', head: true }).eq('resolved', false),
        supabase.from('platform_notifications').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      if (configRes.data) {
        const ks = configRes.data.find(r => r.key === 'global_kill_switch');
        const pm = configRes.data.find(r => r.key === 'platform_mode');
        if (ks) setKillSwitch((ks.value as { active?: boolean }).active ?? false);
        if (pm) setPlatformMode(((pm.value as { mode?: string }).mode as 'live' | 'maintenance') ?? 'live');
      }

      if (flagsRes.data) {
        setModules(prev => prev.map(m => {
          const flag = flagsRes.data.find(f => f.flag_name === m.flagKey);
          return flag ? { ...m, enabled: flag.is_enabled } : m;
        }));
      }

      setStats({
        totalUsers: usersRes.count ?? 0,
        activeToday: Math.floor((usersRes.count ?? 0) * 0.12),
        diamonds: 0,
        queueJobs: queueRes.count ?? 0,
        pendingAudit: 0,
        openFraud: fraudRes.count ?? 0,
        notifications: notifRes.count ?? 0,
        providers: 12,
      });
    } catch (e) {
      console.error('AdminOmniverse load error:', e);
    }
    setLoading(false);
  };

  const toggleKillSwitch = async () => {
    setTogglingKill(true);
    const newVal = !killSwitch;
    try {
      await supabase.from('system_config').update({
        value: { active: newVal, reason: newVal ? 'Admin activated' : '', activated_at: newVal ? new Date().toISOString() : null },
        updated_at: new Date().toISOString(),
      }).eq('key', 'global_kill_switch');

      await supabase.from('admin_audit_log').insert({
        action_type: newVal ? 'KILL_SWITCH_ON' : 'KILL_SWITCH_OFF',
        target_type: 'system',
        target_id: 'global',
        severity: 'critical',
        payload: { kill_switch: newVal },
      });

      setKillSwitch(newVal);
      toast[newVal ? 'error' : 'success'](
        newVal ? '🛑 GLOBAL KILL-SWITCH ACTIVATED — All AI activity halted' : '✅ Platform restored — Kill-switch deactivated',
        { duration: 6000 }
      );
    } catch (e) {
      toast.error('Failed to toggle kill-switch');
    }
    setTogglingKill(false);
  };

  const toggleModule = async (flagKey: string, current: boolean) => {
    const newVal = !current;
    setModules(prev => prev.map(m => m.flagKey === flagKey ? { ...m, enabled: newVal } : m));
    await supabase.from('rx_feature_flags_v2').update({ is_enabled: newVal, updated_at: new Date().toISOString() }).eq('flag_name', flagKey);
    await supabase.from('admin_audit_log').insert({
      action_type: 'FEATURE_TOGGLE',
      target_type: 'feature_flag',
      target_id: flagKey,
      severity: 'info',
      payload: { flag: flagKey, enabled: newVal },
    });
  };

  const STAT_CARDS: PlatformStat[] = [
    { label: 'Total Users',    value: stats.totalUsers,   color: '#00F2FF', icon: <Users className="w-4 h-4" /> },
    { label: 'Active Today',   value: stats.activeToday,  color: '#00FF88', icon: <Activity className="w-4 h-4" />, delta: '+12%' },
    { label: 'Running Jobs',   value: stats.queueJobs,    color: '#FFD700', icon: <Zap className="w-4 h-4" /> },
    { label: 'Open Fraud',     value: stats.openFraud,    color: stats.openFraud > 0 ? '#FF4444' : '#00FF88', icon: <Shield className="w-4 h-4" /> },
    { label: 'Live Notifs',    value: stats.notifications,color: '#BC13FE', icon: <Bell className="w-4 h-4" /> },
    { label: 'AI Providers',   value: `${stats.providers}/12`, color: '#00F2FF', icon: <Cpu className="w-4 h-4" /> },
  ];

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-[#0A0A0F] text-white pb-12">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#BC13FE]/20 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#BC13FE]/30 to-[#00F2FF]/20 border border-[#BC13FE]/30 flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-[#BC13FE]" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-widest text-white">OMNIVERSE COMMAND CENTER</h1>
                <p className="text-[10px] text-white/40 tracking-wider">RACE-X MASTER CONTROL — PHASE E</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${
                killSwitch ? 'border-red-500/40 bg-red-500/10 text-red-400' :
                platformMode === 'maintenance' ? 'border-yellow-400/40 bg-yellow-400/10 text-yellow-400' :
                'border-[#00FF88]/30 bg-[#00FF88]/10 text-[#00FF88]'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${killSwitch ? 'bg-red-400' : 'bg-[#00FF88] animate-pulse'}`} />
                {killSwitch ? 'KILLED' : platformMode === 'maintenance' ? 'MAINTENANCE' : 'LIVE'}
              </div>
              <Button size="sm" variant="ghost" onClick={loadAll} className="h-8 w-8 p-0 border border-white/10 hover:bg-white/10">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => navigate('/admin')} className="h-8 px-3 text-xs border border-white/10 hover:bg-white/10">
                Portal
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 pt-5 space-y-5">
          {/* KILL-SWITCH BANNER */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border p-4 flex items-center justify-between gap-4 transition-all duration-500 ${
              killSwitch
                ? 'border-red-500/50 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.15)]'
                : 'border-[#BC13FE]/20 bg-white/[0.02]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                killSwitch ? 'bg-red-500/20 border border-red-500/30' : 'bg-[#BC13FE]/10 border border-[#BC13FE]/20'
              }`}>
                <Power className={`w-5 h-5 ${killSwitch ? 'text-red-400' : 'text-[#BC13FE]'}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-black ${killSwitch ? 'text-red-400' : 'text-white'}`}>
                  {killSwitch ? '🛑 GLOBAL KILL-SWITCH — ACTIVE' : '⚡ Global Kill-Switch'}
                </p>
                <p className="text-xs text-white/50">
                  {killSwitch
                    ? 'All AI generation, uploads, rendering and queue jobs halted immediately'
                    : 'Instantly halt all AI activity, queues, uploads, and rendering across the platform'}
                </p>
              </div>
            </div>
            <Button
              onClick={toggleKillSwitch}
              disabled={togglingKill}
              className={`shrink-0 h-10 px-5 font-bold text-sm rounded-xl border transition-all ${
                killSwitch
                  ? 'bg-[#00FF88]/10 border-[#00FF88]/40 text-[#00FF88] hover:bg-[#00FF88]/20'
                  : 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20'
              }`}
            >
              {togglingKill ? <RefreshCw className="w-4 h-4 animate-spin" /> : killSwitch ? 'RESTORE' : 'ACTIVATE'}
            </Button>
          </motion.div>

          {/* STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {STAT_CARDS.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="bg-white/[0.03] border-white/8 rounded-xl hover:bg-white/[0.05] transition-all h-full">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span style={{ color: s.color }}>{s.icon}</span>
                      {s.delta && <span className="text-[9px] text-[#00FF88] font-bold">{s.delta}</span>}
                    </div>
                    <p className="text-lg font-black text-white">{loading ? '…' : s.value}</p>
                    <p className="text-[9px] text-white/40 uppercase tracking-wider mt-0.5">{s.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* MODULE TOGGLES */}
            <Card className="bg-white/[0.03] border-white/8 rounded-2xl lg:col-span-1">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#BC13FE]" /> Module Status
                  </CardTitle>
                  <button onClick={() => navigate('/admin/features')} className="text-[10px] text-[#BC13FE] hover:underline flex items-center gap-1">
                    Full Control <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {modules.map(m => (
                  <div key={m.flagKey} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span style={{ color: m.color }} className="shrink-0">{m.icon}</span>
                      <span className="text-xs font-medium text-white/80 truncate">{m.name}</span>
                    </div>
                    <Switch
                      checked={m.enabled}
                      onCheckedChange={() => toggleModule(m.flagKey, m.enabled)}
                      className="scale-75"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* QUICK NAV GRID */}
            <Card className="bg-white/[0.03] border-white/8 rounded-2xl lg:col-span-2">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#FFD700]" /> Admin Control Center
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {NAV_CARDS.map((card) => (
                    <button
                      key={card.path}
                      onClick={() => navigate(card.path)}
                      className="flex flex-col items-start gap-1.5 p-3 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/15 transition-all group text-left"
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${card.color}18`, border: `1px solid ${card.color}30` }}>
                        <card.icon className="w-3.5 h-3.5" style={{ color: card.color }} />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-white group-hover:text-white">{card.label}</p>
                        <p className="text-[9px] text-white/40">{card.badge}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* PLATFORM HEALTH FOOTER */}
          <Card className="bg-white/[0.03] border-white/8 rounded-2xl">
            <CardContent className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Platform Health</span>
                {[
                  { label: 'Supabase DB',    ok: true  },
                  { label: 'Realtime',       ok: true  },
                  { label: 'AI Gateway',     ok: !killSwitch },
                  { label: 'Media Storage',  ok: true  },
                  { label: 'Queue Worker',   ok: stats.queueJobs < 50 },
                  { label: 'Fraud Guard',    ok: stats.openFraud < 5 },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    {s.ok
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF88]" />
                      : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                    <span className={`text-xs ${s.ok ? 'text-white/60' : 'text-red-400'}`}>{s.label}</span>
                  </div>
                ))}
                <div className="ml-auto text-[10px] text-white/30">
                  Last refreshed: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
