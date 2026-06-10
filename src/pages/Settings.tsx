import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, Palette, RotateCcw, Save, ShieldCheck,
  Compass, Music, Radio, Image, Video, Wand2, Shield,
  Key, Eye, EyeOff, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { motion } from 'motion/react';
import { useRxStore } from '@/store/rxStore';
import type { ApiKeys } from '@/store/rxStore';

interface ApiKeyField {
  key: keyof ApiKeys;
  label: string;
  placeholder: string;
  hint: string;
}

const API_KEY_FIELDS: ApiKeyField[] = [
  { key: 'groq',             label: 'Groq API Key',            placeholder: 'gsk_…',       hint: 'console.groq.com → API Keys' },
  { key: 'openRouter',       label: 'OpenRouter API Key',      placeholder: 'sk-or-…',     hint: 'openrouter.ai → Keys' },
  { key: 'googleAI',         label: 'Google AI Studio Key',    placeholder: 'AIza…',       hint: 'aistudio.google.com → Get API Key' },
  { key: 'cloudinaryCloud',  label: 'Cloudinary Cloud Name',   placeholder: 'my-cloud',    hint: 'cloudinary.com → Dashboard' },
  { key: 'cloudinaryPreset', label: 'Cloudinary Upload Preset',placeholder: 'ml_default',  hint: 'Settings → Upload → Presets' },
];

const QUICK_ACTIONS = [
  { icon: <Music className="w-5 h-5" />,  label: 'Studio',    path: '/rx-studio',     color: '#BC13FE', bg: 'bg-[#BC13FE]/10 hover:bg-[#BC13FE]/20' },
  { icon: <Radio className="w-5 h-5" />,  label: 'Music',     path: '/rx-music',      color: '#00F2FF', bg: 'bg-[#00F2FF]/10 hover:bg-[#00F2FF]/20' },
  { icon: <Image className="w-5 h-5" />,  label: 'AI Images', path: '/rx-studio/cgi', color: '#00FF88', bg: 'bg-[#00FF88]/10 hover:bg-[#00FF88]/20' },
  { icon: <Video className="w-5 h-5" />,  label: 'AI Video',  path: '/rx-studio/vfx', color: '#FF6B35', bg: 'bg-[#FF6B35]/10 hover:bg-[#FF6B35]/20' },
  { icon: <Wand2 className="w-5 h-5" />,  label: 'Social',    path: '/rx-social',     color: '#E91E63', bg: 'bg-[#E91E63]/10 hover:bg-[#E91E63]/20' },
  { icon: <Shield className="w-5 h-5" />, label: 'Admin',     path: '/admin',         color: '#FFD700', bg: 'bg-[#FFD700]/10 hover:bg-[#FFD700]/20' },
];

export default function Settings() {
  const navigate = useNavigate();
  const [bgColor, setBgColor] = useState('#000000');
  const [isLoading, setIsLoading] = useState(false);
  const [showKeys, setShowKeys] = useState<Partial<Record<string, boolean>>>({});
  const omniverseView = useRxStore((s) => s.omniverseView);
  const setOmniverseView = useRxStore((s) => s.setOmniverseView);
  const apiKeys = useRxStore((s) => s.apiKeys);
  const setApiKey = useRxStore((s) => s.setApiKey);
  const user = useRxStore((s) => s.user);

  const isAdmin = user?.is_admin ?? JSON.parse(localStorage.getItem('race-x-user') || '{}')?.is_admin;

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    const { data, error } = await supabase
      .from('app_configurations')
      .select('config_value')
      .eq('config_key', 'background_color')
      .maybeSingle();
    if (!error && data) setBgColor(data.config_value.color || '#000000');
  };

  const handleSaveBgColor = async () => {
    if (!isAdmin) { toast.error('Only admins can change global settings'); return; }
    setIsLoading(true);
    const { error } = await supabase
      .from('app_configurations')
      .update({ config_value: { color: bgColor, type: 'solid' }, updated_at: new Date().toISOString() })
      .eq('config_key', 'background_color');
    if (error) {
      toast.error('Failed to update background color');
    } else {
      toast.success('App background updated globally');
      window.dispatchEvent(new Event('app-config-changed'));
    }
    setIsLoading(false);
  };

  const handleReset = async () => {
    setBgColor('#000000');
    if (isAdmin) await handleSaveBgColor();
  };

  const handleSaveApiKey = (key: keyof typeof apiKeys, value: string) => {
    setApiKey(key, value);
    toast.success('API key saved locally');
  };

  return (
    <div className="min-h-screen carbon-fiber p-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-2xl font-bold gradient-text">Settings</h1>
        </div>

        {/* ── Omniverse Quick Launch ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-[#0A0A0F]/80 border border-[#BC13FE]/20 rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Compass className="w-5 h-5 text-[#BC13FE]" />
                Omniverse Quick Launch
              </CardTitle>
              <CardDescription>Jump to any section of RACE-X instantly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => navigate(action.path)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border border-white/10 transition-all ${action.bg}`}
                    style={{ color: action.color }}
                  >
                    {action.icon}
                    <span className="text-[11px] font-bold">{action.label}</span>
                  </button>
                ))}
              </div>

              {/* View preference */}
              <div className="pt-3 border-t border-white/5">
                <p className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wider">Gateway Style (AI Director button)</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOmniverseView('floating')}
                    className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border text-xs font-semibold transition-all ${
                      omniverseView === 'floating'
                        ? 'border-[#BC13FE]/40 bg-[#BC13FE]/10 text-[#BC13FE]'
                        : 'border-white/10 bg-white/5 text-white/50 hover:text-white/80'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" /> Floating
                  </button>
                  <button
                    onClick={() => setOmniverseView('card')}
                    className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border text-xs font-semibold transition-all ${
                      omniverseView === 'card'
                        ? 'border-[#00F2FF]/40 bg-[#00F2FF]/10 text-[#00F2FF]'
                        : 'border-white/10 bg-white/5 text-white/50 hover:text-white/80'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" /> Card
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── API Configuration ──────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="bg-[#0A0A0F]/80 border border-[#00F2FF]/15 rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="w-5 h-5 text-[#00F2FF]" />
                API Configuration
              </CardTitle>
              <CardDescription>
                Keys stored locally — used for direct AI calls &amp; multi-provider rotation.
                Groq → OpenRouter → Google AI auto-rotate on rate limits.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {API_KEY_FIELDS.map((field) => {
                const val = apiKeys[field.key] ?? '';
                const isVisible = showKeys[field.key];
                return (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs font-semibold text-white/70 flex items-center justify-between">
                      {field.label}
                      {val && <CheckCircle className="w-3 h-3 text-[#00FF88]" />}
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={isVisible ? 'text' : 'password'}
                          value={val}
                          onChange={(e) => setApiKey(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="pr-10 bg-white/5 border-white/10 text-white text-xs font-mono placeholder:text-white/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKeys((s) => ({ ...s, [field.key]: !s[field.key] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                        >
                          {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveApiKey(field.key, val)}
                        className="border-white/10 text-white/60 hover:text-white text-xs"
                      >
                        Save
                      </Button>
                    </div>
                    <p className="text-[10px] text-white/30">{field.hint}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Admin Settings ─────────────────────────────────────────────────── */}
        {isAdmin && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass-strong border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  God Mode: Global App Customization
                </CardTitle>
                <CardDescription>
                  These settings affect the application experience for all users.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium flex items-center gap-2">
                        <Palette className="w-4 h-4" /> App Background Color
                      </h3>
                      <p className="text-sm text-muted-foreground">Select a custom color for all users</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-12 h-12 rounded cursor-pointer bg-transparent border-2 border-primary/30"
                      />
                      <div className="w-12 h-12 rounded border border-border" style={{ backgroundColor: bgColor }} />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button className="flex-1 pill-button" onClick={handleSaveBgColor} disabled={isLoading}>
                      <Save className="w-4 h-4 mr-2" /> Apply Globally
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={handleReset} disabled={isLoading}>
                      <RotateCcw className="w-4 h-4" /> Reset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Standard Preferences ───────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="glass-strong border-border">
            <CardHeader><CardTitle>App Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <span>Dark Mode</span>
                <div className="w-10 h-5 bg-primary rounded-full relative">
                  <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <span>Data Saver Mode</span>
                <div className="w-10 h-5 bg-muted rounded-full relative">
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <span>Language</span>
                <span className="text-sm text-muted-foreground">English (Indian)</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Account ────────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-strong border-border">
            <CardHeader><CardTitle>Account</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => {
                localStorage.removeItem('race-x-user');
                navigate('/login');
              }}>
                Logout from this device
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/login')}>
                Add another account
              </Button>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}
