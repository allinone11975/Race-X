/**
 * App Distribution & PWA Install Panel
 * Admin manages app icon, branding, install links, deep links, referral codes
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Globe, Download, Share2, Link, QrCode,
  Smartphone, Monitor, Zap, Settings2, Save, RefreshCw,
  CheckCircle2, Copy, ExternalLink, Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

interface PwaConfig {
  app_name: string;
  short_name: string;
  theme_color: string;
  bg_color: string;
  install_enabled: boolean;
  referral_enabled: boolean;
  deep_link_base: string;
}

const DEFAULT_CONFIG: PwaConfig = {
  app_name: 'RACE-X Omniverse',
  short_name: 'RACE-X',
  theme_color: '#BC13FE',
  bg_color: '#0A0A0F',
  install_enabled: true,
  referral_enabled: true,
  deep_link_base: '',
};

export default function AdminAppDistribution() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<PwaConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appUrl, setAppUrl] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setAppUrl(window.location.origin);
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase.from('system_config').select('value').eq('key', 'pwa_config').maybeSingle();
    if (data?.value) setConfig({ ...DEFAULT_CONFIG, ...(data.value as Partial<PwaConfig>) });
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    await supabase.from('system_config').update({ value: config as unknown as Record<string, unknown>, updated_at: new Date().toISOString() }).eq('key', 'pwa_config');
    await supabase.from('admin_audit_log').insert({
      action_type: 'PWA_CONFIG_UPDATE', target_type: 'system', severity: 'info',
      payload: config as unknown as Record<string, unknown>,
    });
    toast.success('App distribution config saved');
    setSaving(false);
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  const SHARE_LINKS = [
    { label: 'App URL',           value: appUrl,                    key: 'app' },
    { label: 'Studio Direct',     value: `${appUrl}/studio`,        key: 'studio' },
    { label: 'Music Direct',      value: `${appUrl}/music`,         key: 'music' },
    { label: 'Social Direct',     value: `${appUrl}/social`,        key: 'social' },
    { label: 'Install Prompt',    value: `${appUrl}/?install=1`,    key: 'install' },
    { label: 'Referral Template', value: `${appUrl}/?ref=REPLACE`,  key: 'ref' },
  ];

  const PWA_CHECKLIST = [
    { label: 'manifest.json linked',       ok: true },
    { label: 'Theme color set',             ok: !!config.theme_color },
    { label: 'App name configured',         ok: !!config.app_name },
    { label: 'Install prompts enabled',     ok: config.install_enabled },
    { label: 'HTTPS / secure origin',       ok: appUrl.startsWith('https') || appUrl.includes('localhost') },
    { label: 'Service worker ready',        ok: false },
    { label: 'Offline fallback',            ok: false },
  ];

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-[#0A0A0F] text-white pb-12">
        <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#BC13FE]/10 px-4 py-3">
          <div className="flex items-center gap-3 max-w-5xl mx-auto">
            <button onClick={() => navigate('/admin/omniverse')} className="p-2 rounded-lg border border-white/10 hover:bg-white/5 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Package className="w-4 h-4 text-[#BC13FE] shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-black tracking-widest">APP DISTRIBUTION</h1>
              <p className="text-[10px] text-white/40">PWA install · branding · share links · deep links · referral</p>
            </div>
            <Button size="sm" onClick={save} disabled={saving} className="h-8 px-3 text-xs bg-[#BC13FE]/10 border border-[#BC13FE]/30 text-[#BC13FE] hover:bg-[#BC13FE]/20">
              {saving ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
              Save
            </Button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* PWA Config */}
            <Card className="bg-white/[0.03] border-white/8 rounded-2xl">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-[#BC13FE]" /> App Branding
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">App Name (Full)</label>
                  <Input value={config.app_name} onChange={e => setConfig(p => ({ ...p, app_name: e.target.value }))}
                    className="h-9 bg-white/5 border-white/10 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Short Name (home screen)</label>
                  <Input value={config.short_name} onChange={e => setConfig(p => ({ ...p, short_name: e.target.value }))}
                    className="h-9 bg-white/5 border-white/10 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Theme Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={config.theme_color}
                        onChange={e => setConfig(p => ({ ...p, theme_color: e.target.value }))}
                        className="h-9 w-12 rounded cursor-pointer bg-transparent border border-white/10" />
                      <Input value={config.theme_color} onChange={e => setConfig(p => ({ ...p, theme_color: e.target.value }))}
                        className="h-9 bg-white/5 border-white/10 text-xs flex-1" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Background Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={config.bg_color}
                        onChange={e => setConfig(p => ({ ...p, bg_color: e.target.value }))}
                        className="h-9 w-12 rounded cursor-pointer bg-transparent border border-white/10" />
                      <Input value={config.bg_color} onChange={e => setConfig(p => ({ ...p, bg_color: e.target.value }))}
                        className="h-9 bg-white/5 border-white/10 text-xs flex-1" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Deep Link Base URL</label>
                  <Input value={config.deep_link_base || appUrl}
                    onChange={e => setConfig(p => ({ ...p, deep_link_base: e.target.value }))}
                    placeholder={appUrl}
                    className="h-9 bg-white/5 border-white/10 text-xs" />
                </div>
                <div className="space-y-2 pt-1">
                  {[
                    { key: 'install_enabled' as const, label: 'Enable Install Prompts' },
                    { key: 'referral_enabled' as const, label: 'Enable Referral System' },
                  ].map(opt => (
                    <label key={opt.key} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/5 cursor-pointer">
                      <span className="text-sm text-white/70">{opt.label}</span>
                      <Switch checked={config[opt.key]} onCheckedChange={v => setConfig(p => ({ ...p, [opt.key]: v }))} className="scale-75" />
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* PWA Checklist */}
            <Card className="bg-white/[0.03] border-white/8 rounded-2xl">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#00F2FF]" /> PWA Readiness
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {PWA_CHECKLIST.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 py-1.5">
                    {item.ok
                      ? <CheckCircle2 className="w-4 h-4 text-[#00FF88] shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-white/20 shrink-0" />}
                    <span className={`text-sm ${item.ok ? 'text-white/80' : 'text-white/35'}`}>{item.label}</span>
                    {!item.ok && <Badge className="text-[9px] px-1.5 py-0 bg-white/5 border-white/10 text-white/30 ml-auto">Pending</Badge>}
                  </motion.div>
                ))}

                {/* Preview card */}
                <div className="mt-4 p-3 rounded-xl border border-white/10 bg-black/30">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Install Preview</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#BC13FE]/20 border border-[#BC13FE]/20 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-[#BC13FE]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{config.app_name}</p>
                      <p className="text-[10px] text-white/40">{appUrl.replace('https://', '').replace('http://', '')}</p>
                    </div>
                    <button className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                      style={{ backgroundColor: config.theme_color }}>
                      Install
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Share & Deep Links */}
          <Card className="bg-white/[0.03] border-white/8 rounded-2xl">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#00FF88]" /> Shareable Links
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {SHARE_LINKS.map(link => (
                  <div key={link.key} className="flex items-center gap-2 p-2.5 rounded-xl border border-white/8 bg-white/[0.02] group">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">{link.label}</p>
                      <p className="text-xs text-white/70 truncate">{link.value}</p>
                    </div>
                    <button onClick={() => copyText(link.value, link.key)}
                      className="p-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-all shrink-0">
                      {copied === link.key
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF88]" />
                        : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a href={link.value} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-all shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Deployment Info */}
          <Card className="bg-white/[0.03] border-white/8 rounded-2xl">
            <CardContent className="px-4 py-4">
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Platform</p>
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-[#00F2FF]" />
                    <span className="text-sm font-bold text-white">Web App (PWA)</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Dev Branch</p>
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-[#FFD700]" />
                    <span className="text-sm font-bold text-[#FFD700]">dev (auto-deploy)</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Main Branch</p>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF88]" />
                    <span className="text-sm font-bold text-white/60">Manual merge only</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Architecture</p>
                  <div className="flex items-center gap-2">
                    <Monitor className="w-3.5 h-3.5 text-[#BC13FE]" />
                    <span className="text-sm font-bold text-white">React + Supabase + Vite</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
