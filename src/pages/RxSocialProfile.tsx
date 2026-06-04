/**
 * RACE-X · RxSocialProfile — Facebook-style cover + avatar overlap
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, UserPlus, MessageCircle, MoreHorizontal, Grid3X3, Film, Bookmark, Info, Diamond, Zap, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import RxBadge from '@/components/common/RxBadge';
import PostCard from '@/components/social/PostCard';
import { supabase } from '@/db/supabase';
import type { Post } from '@/types/race-x';

interface ProfileUser {
  id: string;
  username: string;
  avatar_url?: string;
  cover_photo_url?: string;
  bio?: string;
  website?: string;
  user_level: number;
  rx_points: number;
  diamonds: number;
  is_admin: boolean;
  successful_referrals: number;
  created_at: string;
}

const COVER_GRADIENTS = [
  'from-[#00F2FF]/40 via-[#0044FF]/20 to-[#BC13FE]/30',
  'from-[#BC13FE]/40 via-[#6600CC]/20 to-[#00F2FF]/30',
  'from-[#00FF88]/30 via-[#00AA55]/20 to-[#00F2FF]/30',
];

const LEVEL_BADGE: Record<number, { label: string; color: string }> = {
  1: { label: 'Rookie',    color: 'bg-gray-400/20 text-gray-300 border-gray-400/30' },
  2: { label: 'Creator',   color: 'bg-green-400/20 text-green-300 border-green-400/30' },
  3: { label: 'Pro',       color: 'bg-blue-400/20 text-blue-300 border-blue-400/30' },
  4: { label: 'Elite',     color: 'bg-purple-400/20 text-purple-300 border-purple-400/30' },
  5: { label: 'Legend',    color: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30' },
};

export default function RxSocialProfile() {
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const stored = JSON.parse(localStorage.getItem('race-x-user') || '{}');
    const uid = user?.id || stored?.id;

    if (uid) {
      const { data } = await supabase.from('users').select('*').eq('id', uid).maybeSingle();
      if (data) setProfileUser(data as ProfileUser);
      setIsOwnProfile(true);

      // Load stats
      const [flwrs, flwng, pcount] = await Promise.all([
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', uid),
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', uid),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      ]);
      setFollowersCount(flwrs.count ?? 0);
      setFollowingCount(flwng.count ?? 0);
      setPostsCount(pcount.count ?? 0);

      // Load posts
      setPostsLoading(true);
      const { data: userPosts } = await supabase
        .from('posts')
        .select('*, users!posts_user_id_fkey(username, avatar_url)')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(12);
      setPosts(Array.isArray(userPosts) ? userPosts.map((p: Record<string, unknown>) => ({
        ...p,
        user: p.users as Post['user'],
      })) as Post[] : []);
      setPostsLoading(false);
    }
  };

  const levelInfo = LEVEL_BADGE[Math.min(profileUser?.user_level ?? 1, 5)] ?? LEVEL_BADGE[1];
  const coverIdx = ((profileUser?.username?.charCodeAt(0) ?? 0) % COVER_GRADIENTS.length);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white pb-6">
      {/* Back */}
      <div className="sticky top-0 z-20 bg-[#0A0A0F]/80 backdrop-blur px-4 py-2 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/rx-social')} className="h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-bold text-white truncate">{profileUser?.username ?? 'Profile'}</span>
        {profileUser?.is_admin && <RxBadge label="ADMIN" variant="purple" />}
      </div>

      {/* ── COVER PHOTO ───────────────────────────────────────────── */}
      <div className="relative">
        <div className={`w-full h-44 md:h-56 bg-gradient-to-br ${COVER_GRADIENTS[coverIdx]} relative overflow-hidden`}>
          {profileUser?.cover_photo_url
            ? <img src={profileUser.cover_photo_url} className="w-full h-full object-cover" alt="cover" />
            : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl opacity-20">🎬</span>
              </div>
            )
          }
          {isOwnProfile && (
            <button className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white">
              <Camera className="w-3.5 h-3.5" /> Edit Cover
            </button>
          )}
        </div>

        {/* ── AVATAR OVERLAP ────────────────────────────────────────── */}
        <div className="absolute -bottom-12 left-4 md:left-6">
          <div className="relative">
            <Avatar className="w-24 h-24 md:w-28 md:h-28 ring-4 ring-[#0A0A0F]">
              <AvatarImage src={profileUser?.avatar_url ?? ''} />
              <AvatarFallback className="bg-gradient-to-br from-[#00F2FF]/40 to-[#BC13FE]/40 text-white text-3xl font-black">
                {(profileUser?.username ?? 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <button className="absolute bottom-0 right-0 w-7 h-7 bg-white/20 backdrop-blur border border-white/30 rounded-full flex items-center justify-center">
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── PROFILE INFO ──────────────────────────────────────────── */}
      <div className="mt-14 px-4 md:px-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-white">{profileUser?.username ?? 'Loading…'}</h1>
              <Badge className={`text-[9px] px-1.5 py-0 ${levelInfo.color}`}>
                {levelInfo.label}
              </Badge>
            </div>
            {profileUser?.bio && (
              <p className="text-sm text-white/70 mt-1 text-pretty">{profileUser.bio}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => {}} className="h-8 w-8 text-muted-foreground shrink-0">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 mt-3 text-center">
          {[
            { label: 'Posts',     value: postsCount,    icon: Grid3X3 },
            { label: 'Followers', value: followersCount, icon: null },
            { label: 'Following', value: followingCount, icon: null },
          ].map(s => (
            <button key={s.label} className="flex flex-col items-center min-w-0 hover:opacity-80">
              <span className="text-lg font-black text-white">{s.value}</span>
              <span className="text-[11px] text-muted-foreground">{s.label}</span>
            </button>
          ))}
          <div className="ml-auto flex flex-col items-center">
            <span className="text-lg font-black text-[#00F2FF] flex items-center gap-0.5">
              💎 {profileUser?.diamonds ?? 0}
            </span>
            <span className="text-[11px] text-muted-foreground">Diamonds</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          {isOwnProfile ? (
            <>
              <Button onClick={() => navigate('/settings')}
                className="flex-1 bg-white/10 border border-white/20 text-white text-sm font-semibold hover:bg-white/15"
              >
                Edit Profile
              </Button>
              <Button onClick={() => navigate('/wallet')}
                className="flex-1 bg-[#00F2FF]/15 border border-[#00F2FF]/30 text-[#00F2FF] text-sm font-semibold hover:bg-[#00F2FF]/25"
              >
                <Diamond className="w-3.5 h-3.5 mr-1.5" /> Wallet
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => {}} className="flex-1 bg-[#00F2FF]/20 border border-[#00F2FF]/40 text-[#00F2FF] text-sm font-semibold">
                <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Follow
              </Button>
              <Button onClick={() => {}} className="flex-1 bg-white/10 border border-white/20 text-white text-sm font-semibold">
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Message
              </Button>
            </>
          )}
        </div>

        {/* ── BADGES ROW ────────────────────────────────────────────── */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {[
            { icon: '💎', label: `Lv.${profileUser?.user_level ?? 1}` },
            { icon: '⚡', label: `${profileUser?.rx_points ?? 0} RX` },
            { icon: '🏆', label: `${profileUser?.successful_referrals ?? 0} Refs` },
            ...(profileUser?.is_admin ? [{ icon: '👑', label: 'Admin' }] : []),
          ].map(b => (
            <div key={b.label} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/8 border border-white/10 text-xs text-white/80 whitespace-nowrap shrink-0">
              <span>{b.icon}</span> {b.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── TABS ──────────────────────────────────────────────────── */}
      <div className="mt-4 px-0">
        <Tabs defaultValue="posts">
          <TabsList className="w-full rounded-none bg-transparent border-b border-white/8 p-0 h-10">
            {[
              { value: 'posts',  icon: Grid3X3,  label: 'Posts'  },
              { value: 'reels',  icon: Film,      label: 'Reels'  },
              { value: 'saved',  icon: Bookmark,  label: 'Saved'  },
              { value: 'about',  icon: Info,       label: 'About'  },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value}
                className="flex-1 h-10 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#00F2FF] data-[state=active]:text-[#00F2FF] text-muted-foreground text-xs gap-1"
              >
                <t.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Posts tab */}
          <TabsContent value="posts" className="p-4 space-y-3 mt-0">
            {postsLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />)}
              </div>
            ) : posts.length > 0 ? (
              posts.map(p => <PostCard key={p.id} post={p} currentUserId={profileUser?.id} />)
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <Grid3X3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No posts yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="reels" className="p-4 mt-0">
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className="aspect-[9/16] bg-white/5 rounded-lg flex items-center justify-center">
                  <Film className="w-6 h-6 text-white/20" />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="saved" className="p-4 mt-0">
            <div className="py-12 text-center text-muted-foreground">
              <Bookmark className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No saved posts yet</p>
            </div>
          </TabsContent>

          <TabsContent value="about" className="p-4 space-y-3 mt-0">
            {[
              { icon: Zap,   label: 'Level',     value: `Level ${profileUser?.user_level ?? 1}` },
              { icon: Diamond, label: 'Diamonds', value: `${profileUser?.diamonds ?? 0} 💎` },
              { icon: Award,  label: 'RX Points', value: `${profileUser?.rx_points ?? 0} pts` },
              { icon: Info,   label: 'Joined',   value: profileUser?.created_at ? new Date(profileUser.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }) : '—' },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <r.icon className="w-4 h-4 text-[#00F2FF] shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">{r.label}</p>
                  <p className="text-sm font-semibold text-white">{r.value}</p>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
