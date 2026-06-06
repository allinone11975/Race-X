import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Info, Diamond, Wallet, ShoppingCart, Cloud, ShieldCheck,
  Clapperboard, Music, Users, MessageSquare, Globe, Trophy,
  Lock, BarChart3, Cpu, Flag, Shield, Gamepad2, Sparkles,
  Compass, Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { useRxStore, isAdminRole } from '@/store/rxStore';

interface HubSection {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  desc: string;
}

const MAIN_HUBS: HubSection[] = [
  { label: 'RX Studio',     path: '/rx-studio',       icon: Clapperboard, color: '#00F2FF', desc: 'AI filmmaking tools' },
  { label: 'RX Social',     path: '/rx-social',        icon: Users,        color: '#BC13FE', desc: 'Feed, reels, creators' },
  { label: 'RX Magic Chat', path: '/rx-magic-chat',    icon: MessageSquare,color: '#00F2FF', desc: 'Groq AI director' },
  { label: 'RX Music',      path: '/rx-music',         icon: Music,        color: '#BC13FE', desc: 'Beat & compose' },
  { label: 'RX Shopping',   path: '/rx-shopping',      icon: ShoppingCart, color: '#00FF88', desc: 'AI-curated shop' },
  { label: 'Marketplace',   path: '/marketplace',      icon: Globe,        color: '#FFD700', desc: 'Buy/sell assets' },
  // Omniverse — primary nav entry for all users
  { label: 'Omniverse',     path: '/gateway',          icon: Compass,      color: '#BC13FE', desc: 'Platform navigator' },
];

const FEATURE_LINKS: HubSection[] = [
  { label: 'Wallet', path: '/wallet', icon: Wallet, color: '#00F2FF', desc: 'Diamonds & transactions' },
  { label: 'Creator Dashboard', path: '/creator-dashboard', icon: BarChart3, color: '#BC13FE', desc: 'Analytics & ranking' },
  { label: 'Cloud Vault', path: '/vault', icon: Cloud, color: '#00FF88', desc: 'File storage' },
  { label: 'KYC', path: '/kyc', icon: ShieldCheck, color: '#FFD700', desc: 'Identity verification' },
  { label: 'Leaderboard', path: '/rx-social/leaderboard', icon: Trophy, color: '#FFD700', desc: 'Top creators' },
  { label: 'VR Mode', path: '/vr', icon: Gamepad2, color: '#00F2FF', desc: 'Three.js immersive' },
  { label: 'Festival Themes', path: '/festival-themes', icon: Sparkles, color: '#BC13FE', desc: 'Seasonal UI' },
];

const ADMIN_LINKS: HubSection[] = [
  { label: 'Admin Portal', path: '/admin', icon: Shield, color: '#FF4444', desc: 'God Mode' },
  { label: 'Economy Control', path: '/admin/economy', icon: Diamond, color: '#FFD700', desc: 'Diamond ledger' },
  { label: 'User Manager', path: '/admin/users', icon: Users, color: '#00F2FF', desc: 'Ban / verify users' },
  { label: 'Lockdown', path: '/admin/lockdown', icon: Lock, color: '#FF4444', desc: 'Kill switch' },
  { label: 'KYC Review', path: '/admin/kyc', icon: ShieldCheck, color: '#00FF88', desc: 'Verify identities' },
  { label: 'RX Kernel', path: '/rx-kernel', icon: Cpu, color: '#00F2FF', desc: 'System config' },
  { label: 'Feature Flags', path: '/feature-flags', icon: Flag, color: '#BC13FE', desc: 'Toggle features' },
  { label: 'Analytics', path: '/analytics', icon: BarChart3, color: '#00FF88', desc: 'BI dashboard' },
  { label: 'Moderation', path: '/moderation', icon: Shield, color: '#FF6B35', desc: 'Content safety' },
];

export default function GatewayPage() {
  const navigate = useNavigate();
  const { user, unreadNotifications } = useRxStore();
  const userIsAdmin = isAdminRole(user?.role);

  const renderSection = (title: string, items: HubSection[], delay = 0) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="mb-6">
      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-[#00F2FF] animate-pulse" />
        {title}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.path}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delay + i * 0.04 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(item.path)}
              className="relative p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06] transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: `${item.color}15`, border: `1px solid ${item.color}30` }}>
                <Icon className="w-4 h-4" style={{ color: item.color }} />
              </div>
              <p className="text-sm font-bold text-white leading-tight text-balance">{item.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 text-pretty">{item.desc}</p>
              {/* Notification badge on social */}
              {item.path === '/rx-social' && unreadNotifications > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#BC13FE] text-[9px] text-white flex items-center justify-center font-bold">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-[#00F2FF]/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#BC13FE]/5 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00F2FF]/20 bg-[#00F2FF]/5 mb-4">
            <div className="w-2 h-2 rounded-full bg-[#00F2FF] animate-pulse" />
            <span className="text-[10px] text-[#00F2FF] tracking-widest font-bold">RACE-X OMNIVERSE</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-balance">
            <span className="bg-gradient-to-r from-[#00F2FF] via-white to-[#BC13FE] bg-clip-text text-transparent">
              THE GATEWAY
            </span>
          </h1>
          {user && (
            <p className="text-sm text-muted-foreground mt-2">
              Welcome back, <span className="text-[#00F2FF] font-medium">@{user.username}</span>
              {' · '}
              <span className="text-[#FFD700]">💎 {user.diamonds.toLocaleString()}</span>
              {userIsAdmin && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FF4444]/10 border border-[#FF4444]/30 text-[#FF4444] text-[10px] font-bold uppercase tracking-wider">
                  <Shield className="w-2.5 h-2.5" />
                  {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </span>
              )}
            </p>
          )}
        </motion.div>

        {renderSection('Main Platforms', MAIN_HUBS, 0.1)}
        {renderSection('Creator Tools', FEATURE_LINKS, 0.3)}

        {/* Admin section — only visible to admin/super_admin roles */}
        {userIsAdmin && renderSection('Admin Controls', ADMIN_LINKS, 0.5)}

        {/* Admin quick-launch strip — Omniverse + Director for admins */}
        {userIsAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="mb-6 flex gap-3"
          >
            <button
              onClick={() => navigate('/admin/omniverse')}
              className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl border border-[#BC13FE]/30 bg-[#BC13FE]/5 hover:border-[#BC13FE]/60 hover:bg-[#BC13FE]/10 transition-all text-left"
            >
              <Compass className="w-5 h-5 shrink-0 text-[#BC13FE]" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white text-balance">Omniverse Dashboard</p>
                <p className="text-[10px] text-muted-foreground text-pretty">Platform command center</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/rx-magic-chat')}
              className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl border border-[#00F2FF]/30 bg-[#00F2FF]/5 hover:border-[#00F2FF]/60 hover:bg-[#00F2FF]/10 transition-all text-left"
            >
              <Zap className="w-5 h-5 shrink-0 text-[#00F2FF]" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white text-balance">AI Director</p>
                <p className="text-[10px] text-muted-foreground text-pretty">Cinematic AI assistant</p>
              </div>
            </button>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          className="flex justify-center gap-3 pt-4">
          <Button onClick={() => navigate('/settings')} variant="ghost" size="sm"
            className="text-xs border border-white/10 text-muted-foreground">
            Settings
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs border border-white/10 text-muted-foreground gap-1.5">
                <Info className="w-3.5 h-3.5" />Tester Guide
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-[#0A0A0F] border-[#00F2FF]/20">
              <DialogHeader>
                <DialogTitle className="text-[#00F2FF]">RACE-X Tester Guide</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm text-muted-foreground">
                {[
                  '1. Try all 19 AI Studio tools under RX Studio → Tools Hub',
                  '2. Beat Studio: load a preset and hit Play',
                  '3. Music Composer: generate a 15s cinematic track',
                  '4. Social Search: find a creator by username',
                  '5. Cloud Vault: upload a file and verify it appears',
                  '6. Wallet: check diamond balance and transaction history',
                  '7. VR Mode: orbit the Three.js scene with mouse/touch',
                  '8. Festival Themes: apply Diwali or Christmas theme',
                  '9. Admin (admin accounts): test Economy Control + Lockdown',
                ].map((s, i) => <p key={i}>{s}</p>)}
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>
      </div>
    </div>
  );
}
