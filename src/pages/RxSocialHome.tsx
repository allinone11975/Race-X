/**
 * RACE-X · RxSocialHome — Facebook-style feed
 * Left sidebar (desktop) · top nav · stories · post composer · right sidebar
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Bell, Search, Home, PlusCircle, Film, MessageCircle,
  User, Users, Compass, Zap, Radio, ShoppingBag,
  Settings, LogOut, TrendingUp, ImageIcon, Smile,
  RefreshCw, ChevronRight, Diamond,
} from 'lucide-react';
import RxBadge from '@/components/common/RxBadge';
import PostCard from '@/components/social/PostCard';
import CreatePostModal from '@/components/social/CreatePostModal';
import { getPosts } from '@/db/api';
import type { Post } from '@/types/race-x';
import { supabase } from '@/db/supabase';

// ─── Sidebar nav items ────────────────────────────────────────────────────────
const NAV_MAIN = [
  { icon: Home,        label: 'Home',          path: '/rx-social' },
  { icon: Film,        label: 'Reels',         path: '/rx-social/reels' },
  { icon: Users,       label: 'Friends',       path: '/rx-social/search' },
  { icon: MessageCircle, label: 'Messages',    path: '/rx-social/messages' },
  { icon: Bell,        label: 'Notifications', path: '/rx-social/notifications' },
  { icon: Compass,     label: 'Explore',       path: '/rx-social/search' },
  { icon: TrendingUp,  label: 'Leaderboard',   path: '/rx-social/leaderboard' },
];

const NAV_SHORTCUTS = [
  { icon: Zap,        label: 'Rx Studio',   path: '/rx-studio',  color: 'text-[#00F2FF]' },
  { icon: Radio,      label: 'Rx Music',    path: '/rx-music',   color: 'text-[#BC13FE]' },
  { icon: ShoppingBag,label: 'Shopping',    path: '/rx-shopping',color: 'text-[#00FF88]' },
];

// ─── Story strip ─────────────────────────────────────────────────────────────
const STORY_COLORS = [
  'from-[#00F2FF]/40 to-[#0044FF]/20',
  'from-[#BC13FE]/40 to-[#6600CC]/20',
  'from-[#00FF88]/40 to-[#00AA55]/20',
  'from-[#FF6B00]/40 to-[#CC3300]/20',
  'from-[#FFD700]/40 to-[#CC9900]/20',
];

export default function RxSocialHome() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [notifCount] = useState(3);

  const [authUser, setAuthUser] = useState<{ id?: string; username?: string; avatar_url?: string; diamonds?: number }>({});

  useEffect(() => {
    // Try Supabase auth first, then fallback to localStorage
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from('users').select('id,username,avatar_url,diamonds').eq('id', data.user.id).maybeSingle()
          .then(({ data: u }) => {
            if (u) setAuthUser(u as typeof authUser);
          });
      } else {
        const stored = JSON.parse(localStorage.getItem('race-x-user') || '{}');
        setAuthUser(stored);
      }
    });
    loadPosts();
  }, []);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    const fetched = await getPosts(20, 0);
    setPosts(fetched);
    setLoading(false);
  }, []);

  // Suggested people (dummy until real follower graph)
  const suggested = [
    { name: 'RxCreator_01', mutual: 3 },
    { name: 'MusicMaestro',  mutual: 7 },
    { name: 'CinemaKing',    mutual: 1 },
  ];

  const trends = ['#RaceX', '#AIMusicEngine', '#Bollywood2025', '#NeonVibes', '#DiamondEconomy'];

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col">

      {/* ── TOP NAVIGATION BAR ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#0A0A0F]/95 backdrop-blur border-b border-white/8 h-14 flex items-center px-3 gap-2">
        {/* Logo */}
        <button onClick={() => navigate('/gateway')} className="shrink-0 flex items-center gap-1.5 mr-1">
          <span className="text-lg font-black gradient-text tracking-wider">RACE-X</span>
          <RxBadge label="SOCIAL" className="hidden md:inline-flex" />
        </button>

        {/* Search */}
        <div className="relative flex-1 max-w-xs hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search Race-X…"
            className="pl-8 h-8 bg-white/8 border-white/10 text-white text-xs rounded-full placeholder:text-muted-foreground focus-visible:ring-[#00F2FF]/30"
          />
        </div>

        {/* Mobile nav icons */}
        <div className="flex items-center gap-0.5 ml-auto">
          {[
            { icon: Home,          path: '/rx-social',               active: true  },
            { icon: Film,          path: '/rx-social/reels',          active: false },
            { icon: Users,         path: '/rx-social/search',         active: false },
            { icon: MessageCircle, path: '/rx-social/messages',       active: false },
          ].map(({ icon: Icon, path, active }) => (
            <Button key={path} variant="ghost" size="icon"
              onClick={() => navigate(path)}
              className={`h-9 w-9 md:h-10 md:w-12 rounded-lg ${active ? 'text-[#00F2FF] border-b-2 border-[#00F2FF] rounded-b-none' : 'text-muted-foreground hover:text-white'}`}
            >
              <Icon className="w-5 h-5" />
            </Button>
          ))}

          {/* Notifications */}
          <div className="relative">
            <Button variant="ghost" size="icon" onClick={() => navigate('/rx-social/notifications')}
              className="h-9 w-9 rounded-full bg-white/8 text-muted-foreground hover:text-white"
            >
              <Bell className="w-4 h-4" />
            </Button>
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center">
                {notifCount}
              </span>
            )}
          </div>

          {/* Avatar */}
          <button onClick={() => navigate('/rx-social/profile')} className="ml-1">
            <Avatar className="w-8 h-8 ring-2 ring-[#00F2FF]/40">
              <AvatarImage src={authUser.avatar_url ?? ''} />
              <AvatarFallback className="bg-gradient-to-br from-[#00F2FF]/30 to-[#BC13FE]/30 text-white text-xs font-bold">
                {(authUser.username ?? 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </header>

      {/* ── MAIN LAYOUT ────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-w-0 max-w-6xl mx-auto w-full gap-0 md:gap-4 px-0 md:px-4 pt-0 md:pt-4 pb-16 md:pb-4">

        {/* ── LEFT SIDEBAR (desktop only) ─────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 gap-1 sticky top-16 h-[calc(100vh-3.5rem)] overflow-y-auto pb-4">
          {/* User card */}
          <button onClick={() => navigate('/rx-social/profile')} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors mb-1">
            <Avatar className="w-9 h-9 ring-2 ring-[#00F2FF]/40 shrink-0">
              <AvatarImage src={authUser.avatar_url ?? ''} />
              <AvatarFallback className="bg-gradient-to-br from-[#00F2FF]/30 to-[#BC13FE]/30 text-white font-bold text-sm">
                {(authUser.username ?? 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{authUser.username ?? 'You'}</p>
              <p className="text-[10px] text-[#00FF88] flex items-center gap-0.5">
                <Diamond className="w-2.5 h-2.5" /> {authUser.diamonds ?? 0} Diamonds
              </p>
            </div>
          </button>

          {/* Main nav */}
          {NAV_MAIN.map(({ icon: Icon, label, path }) => (
            <button key={label} onClick={() => navigate(path)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/8 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center shrink-0">
                <Icon className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-sm font-medium text-white">{label}</span>
            </button>
          ))}

          <div className="my-2 border-t border-white/8" />

          {/* Shortcuts */}
          <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Shortcuts</p>
          {NAV_SHORTCUTS.map(({ icon: Icon, label, path, color }) => (
            <button key={label} onClick={() => navigate(path)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/8 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center shrink-0">
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <span className="text-sm text-white/80">{label}</span>
            </button>
          ))}

          <div className="mt-auto pt-4 flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} className="h-8 w-8 text-muted-foreground">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/login')} className="h-8 w-8 text-muted-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </aside>

        {/* ── CENTER FEED ─────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 space-y-3 px-0 md:px-2">

          {/* Stories */}
          <div className="bg-[#1C1C27] rounded-2xl border border-white/8 p-3 overflow-x-auto">
            <div className="flex gap-2">
              {/* Add story */}
              <button
                onClick={() => navigate('/rx-studio/editor')}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[72px]"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00F2FF]/20 to-[#BC13FE]/20 border-2 border-dashed border-[#00F2FF]/40 flex items-center justify-center">
                  <PlusCircle className="w-6 h-6 text-[#00F2FF]" />
                </div>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">Create Story</span>
              </button>

              {/* Dummy stories */}
              {Array.from({ length: 8 }, (_, i) => (
                <button key={i} className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[72px]">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${STORY_COLORS[i % STORY_COLORS.length]} ring-2 ring-[#00F2FF]/50`} />
                  <span className="text-[10px] text-muted-foreground truncate w-full text-center">User {i + 1}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Post Composer */}
          <div className="bg-[#1C1C27] rounded-2xl border border-white/8 p-3">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarImage src={authUser.avatar_url ?? ''} />
                <AvatarFallback className="bg-gradient-to-br from-[#00F2FF]/30 to-[#BC13FE]/30 text-white text-sm font-bold">
                  {(authUser.username ?? 'U')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => setCreateOpen(true)}
                className="flex-1 bg-white/5 hover:bg-white/8 border border-white/10 rounded-full px-4 py-2.5 text-sm text-muted-foreground text-left transition-colors"
              >
                What's on your mind, {authUser.username?.split(' ')[0] ?? 'Malik'}?
              </button>
            </div>
            <div className="flex items-center border-t border-white/8 pt-2 gap-0.5">
              {[
                { icon: ImageIcon, label: 'Photo/Video',  color: 'text-green-400' },
                { icon: Film,      label: 'Reel',          color: 'text-[#BC13FE]'  },
                { icon: Smile,     label: 'Feeling',       color: 'text-yellow-400' },
              ].map(({ icon: Icon, label, color }) => (
                <Button key={label} variant="ghost" size="sm" onClick={() => setCreateOpen(true)}
                  className="flex-1 gap-1.5 text-xs font-medium text-muted-foreground hover:text-white"
                >
                  <Icon className={`w-4 h-4 ${color}`} /> {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Feed */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-[#1C1C27] rounded-2xl border border-white/8 p-4 space-y-3 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 bg-white/10 rounded w-1/3" />
                      <div className="h-2 bg-white/5 rounded w-1/4" />
                    </div>
                  </div>
                  <div className="h-4 bg-white/10 rounded" />
                  <div className="h-4 bg-white/5 rounded w-3/4" />
                  <div className="h-32 bg-white/5 rounded-xl" />
                </div>
              ))}
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-3">
              {posts.map(post => (
                <PostCard key={post.id} post={post} currentUserId={authUser.id} />
              ))}
            </div>
          ) : (
            <div className="bg-[#1C1C27] rounded-2xl border border-white/8 py-16 text-center">
              <span className="text-4xl block mb-3">🌌</span>
              <p className="text-sm font-semibold text-white">No posts yet</p>
              <p className="text-xs text-muted-foreground mt-1">Be the first to post in the Race-X universe!</p>
              <Button onClick={() => setCreateOpen(true)} className="mt-4 bg-[#00F2FF]/20 border border-[#00F2FF]/40 text-[#00F2FF] text-xs">
                Create First Post
              </Button>
            </div>
          )}

          {posts.length > 0 && (
            <Button variant="ghost" onClick={loadPosts} className="w-full text-muted-foreground text-xs border border-white/8">
              <RefreshCw className="w-3.5 h-3.5 mr-2" /> Load more
            </Button>
          )}
        </main>

        {/* ── RIGHT SIDEBAR (desktop only) ────────────────────────────── */}
        <aside className="hidden xl:flex flex-col w-64 shrink-0 gap-3 sticky top-16 h-[calc(100vh-3.5rem)] overflow-y-auto pb-4">
          {/* Sponsored / RX promo */}
          <div className="bg-[#1C1C27] rounded-2xl border border-[#BC13FE]/20 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sponsored</p>
              <RxBadge label="AD" variant="purple" />
            </div>
            <div className="aspect-video rounded-xl bg-gradient-to-br from-[#BC13FE]/20 to-[#00F2FF]/20 flex items-center justify-center mb-2">
              <span className="text-3xl">🎵</span>
            </div>
            <p className="text-xs font-semibold text-white text-balance">Generate Your Song in 30 Seconds</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Rx Music Engine · 12 AI Providers</p>
            <Button size="sm" onClick={() => navigate('/rx-music')}
              className="mt-2 w-full text-xs bg-[#BC13FE]/20 border border-[#BC13FE]/40 text-[#BC13FE] hover:bg-[#BC13FE]/30"
            >
              Try Now
            </Button>
          </div>

          {/* People you may know */}
          <div className="bg-[#1C1C27] rounded-2xl border border-white/8 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-white">People You May Know</p>
              <button className="text-[10px] text-[#00F2FF]" onClick={() => navigate('/rx-social/search')}>See all</button>
            </div>
            <div className="space-y-2.5">
              {suggested.map(s => (
                <div key={s.name} className="flex items-center gap-2">
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarFallback className="bg-white/10 text-white text-xs">{s.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.mutual} mutual friends</p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] border border-[#00F2FF]/30 text-[#00F2FF] shrink-0" onClick={() => {}}>
                    Follow
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Trending */}
          <div className="bg-[#1C1C27] rounded-2xl border border-white/8 p-3">
            <p className="text-sm font-bold text-white mb-2">Trending in Race-X</p>
            <div className="space-y-1.5">
              {trends.map((t, i) => (
                <button key={t} className="flex items-center justify-between w-full group">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-4">{i + 1}</span>
                    <span className="text-xs text-[#00F2FF] group-hover:underline">{t}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>

          {/* Diamond balance widget */}
          <div className="bg-gradient-to-br from-[#00F2FF]/10 to-[#BC13FE]/10 rounded-2xl border border-[#00F2FF]/20 p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-white">Diamond Balance</p>
              <Badge className="bg-[#00F2FF]/10 text-[#00F2FF] border-[#00F2FF]/30 text-[9px]">Live</Badge>
            </div>
            <p className="text-2xl font-black text-[#00F2FF]">
              💎 {authUser.diamonds ?? 0}
            </p>
            <Button size="sm" onClick={() => navigate('/wallet')}
              className="mt-2 w-full text-xs bg-[#00F2FF]/20 border border-[#00F2FF]/40 text-[#00F2FF]"
            >
              Recharge
            </Button>
          </div>
        </aside>
      </div>

      {/* ── MOBILE BOTTOM NAV ───────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0F]/95 backdrop-blur border-t border-white/8 flex items-center justify-around px-1 h-14">
        {[
          { icon: Home,          path: '/rx-social',               active: true  },
          { icon: Film,          path: '/rx-social/reels',          active: false },
          { icon: PlusCircle,    path: null,                        active: false, action: () => setCreateOpen(true) },
          { icon: MessageCircle, path: '/rx-social/messages',       active: false },
          { icon: User,          path: '/rx-social/profile',        active: false },
        ].map(({ icon: Icon, path, active, action }, i) => (
          <Button key={i} variant="ghost" size="icon"
            onClick={() => action ? action() : path && navigate(path)}
            className={`h-10 w-10 rounded-xl ${active ? 'text-[#00F2FF]' : 'text-muted-foreground'} ${i === 2 ? 'bg-[#00F2FF]/20 border border-[#00F2FF]/30 text-[#00F2FF]' : ''}`}
          >
            <Icon className="w-5 h-5" />
          </Button>
        ))}
      </nav>

      {/* Create Post Modal */}
      <CreatePostModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        currentUser={authUser}
        onPostCreated={loadPosts}
      />
    </div>
  );
}
