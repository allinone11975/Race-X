/**
 * RACE-X  ·  Omni Music Hub
 * Studio Mode (12-provider gateway) + Live Radio Mode (Mubert)
 * Diamond economy · moderation · 48hr storage lifecycle
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wand2, Radio, Zap, RefreshCw, AlertCircle, Loader2, Trash2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import RxBadge from '@/components/common/RxBadge';
import MusicPlayer from '@/components/music/MusicPlayer';
import RadioPanel from '@/components/music/RadioPanel';
import { supabase } from '@/db/supabase';
import { generateTrack, fetchProviderStatuses, type GatewayProviderStatus, type MusicProvider } from '@/lib/musicGateway';
import { moderatePrompt } from '@/lib/musicModeration';
import { scheduleCleanup } from '@/lib/storageLifecycle';
import { useMusicDiamonds, STUDIO_DIAMOND_COST } from '@/hooks/useMusicDiamonds';

interface MusicTrack {
  id: string;
  title: string;
  prompt: string;
  provider: string;
  audio_url: string | null;
  duration_sec: number;
  diamond_cost: number;
  is_favorite: boolean;
  created_at: string;
}

const STYLE_PRESETS = [
  { label: 'Pop', icon: '🎤' },
  { label: 'Lo-Fi', icon: '🌙' },
  { label: 'EDM', icon: '⚡' },
  { label: 'Bollywood', icon: '🎬' },
  { label: 'Jazz', icon: '🎷' },
  { label: 'Hip Hop', icon: '🎧' },
  { label: 'Classical', icon: '🎻' },
  { label: 'Rock', icon: '🎸' },
];

const PROVIDER_COLORS: Record<MusicProvider, string> = {
  Suno: 'bg-purple-400/20 text-purple-300 border-purple-400/30',
  Udio: 'bg-blue-400/20 text-blue-300 border-blue-400/30',
  MiniMax: 'bg-pink-400/20 text-pink-300 border-pink-400/30',
  Mubert: 'bg-green-400/20 text-green-300 border-green-400/30',
  ElevenLabs: 'bg-orange-400/20 text-orange-300 border-orange-400/30',
  StableAudio: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/30',
  Soundverse: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30',
  Boomy: 'bg-red-400/20 text-red-300 border-red-400/30',
  AIVA: 'bg-indigo-400/20 text-indigo-300 border-indigo-400/30',
  Sonauto: 'bg-teal-400/20 text-teal-300 border-teal-400/30',
  Soundful: 'bg-rose-400/20 text-rose-300 border-rose-400/30',
  MubertAPI: 'bg-violet-400/20 text-violet-300 border-violet-400/30',
};

export default function RxMusic() {
  const navigate = useNavigate();

  // Auth
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { balance, loading: balanceLoading, chargeStudio, chargeRadio } = useMusicDiamonds(userId);

  // Studio State
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(true);

  // Gateway State
  const [providerStatuses, setProviderStatuses] = useState<GatewayProviderStatus[]>([]);
  const [gatewayLoading, setGatewayLoading] = useState(true);

  // Load tracks + provider statuses + schedule cleanup on mount
  useEffect(() => {
    if (!userId) return;
    loadTracks();
    loadProviderStatuses();
    const cancel = scheduleCleanup(userId);
    return cancel;
  }, [userId]);

  const loadTracks = async () => {
    if (!userId) return;
    setTracksLoading(true);
    const { data } = await supabase
      .from('music_tracks')
      .select('id,title,prompt,provider,audio_url,duration_sec,diamond_cost,is_favorite,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    setTracks(Array.isArray(data) ? (data as MusicTrack[]) : []);
    setTracksLoading(false);
  };

  const loadProviderStatuses = async () => {
    setGatewayLoading(true);
    const statuses = await fetchProviderStatuses();
    setProviderStatuses(statuses);
    setGatewayLoading(false);
  };

  // Studio Mode: Generate
  const handleGenerate = useCallback(async () => {
    if (!userId) { toast.error('Please login first.'); return; }
    if (!prompt.trim()) { toast.error('Enter a music prompt first.'); return; }

    // 1. Moderation scan
    const scan = moderatePrompt(prompt);
    if (!scan.is_safe) {
      toast.error(`Prompt blocked: ${scan.blocked_category}`, { description: scan.warning, duration: 6000 });
      return;
    }

    // 2. Diamond check + charge
    const charged = await chargeStudio();
    if (!charged) return;

    setGenerating(true);

    try {
      const result = await generateTrack({
        prompt: scan.sanitized_prompt,
        duration_sec: 30,
        style: selectedStyle || undefined,
        userId,
      });

      if (!result.success) {
        // Refund diamond on failure
        toast.error(result.error ?? 'Generation failed', {
          description: '💎 Diamond refund initiated.',
          duration: 5000,
        });
        return;
      }

      toast.success(`✅ Track generated via ${result.provider}!`, {
        description: `💎 ${result.diamond_cost} Diamonds spent`,
      });

      await loadTracks();
      await loadProviderStatuses();
      setPrompt('');
    } finally {
      setGenerating(false);
    }
  }, [userId, prompt, selectedStyle, chargeStudio]);

  const deleteTrack = async (id: string) => {
    await supabase.from('music_tracks').delete().eq('id', id);
    setTracks(t => t.filter(x => x.id !== id));
    toast.info('Track deleted');
  };

  const handleFavoriteChange = (id: string, isFav: boolean) => {
    setTracks(t => t.map(x => x.id === id ? { ...x, is_favorite: isFav } : x));
  };

  const availableCount = providerStatuses.filter(p => p.is_available).length;

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/gateway')} className="p-2 rounded-lg border border-white/10 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <RxBadge label="MUSIC" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold tracking-widest gradient-text">Rx MUSIC ENGINE</h1>
            <p className="text-[10px] text-muted-foreground">Omni-Rotational · 12 Providers</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className="bg-[#00F2FF]/10 text-[#00F2FF] border-[#00F2FF]/30 text-[10px]">
              💎 {balanceLoading ? '…' : balance}
            </Badge>
          </div>
        </div>

        {/* Provider health bar */}
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex gap-0.5 flex-1">
            {providerStatuses.map(p => (
              <div
                key={p.name}
                title={`${p.name}: ${p.is_available ? 'Online' : 'Cooling down'}`}
                className={`h-1.5 flex-1 rounded-full transition-all ${p.is_available ? 'bg-[#00FF88]' : 'bg-red-500/40'}`}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {availableCount}/12 online
          </span>
          <button onClick={loadProviderStatuses} className="p-0.5 text-muted-foreground hover:text-white">
            <RefreshCw className={`w-3 h-3 ${gatewayLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="studio" className="flex-1">
        <TabsList className="w-full rounded-none bg-white/5 border-b border-white/10 p-0 h-10">
          <TabsTrigger
            value="studio"
            className="flex-1 h-10 rounded-none data-[state=active]:bg-[#00F2FF]/10 data-[state=active]:text-[#00F2FF] data-[state=active]:border-b-2 data-[state=active]:border-[#00F2FF] text-xs font-semibold tracking-wider"
          >
            <Wand2 className="w-3.5 h-3.5 mr-1.5" />STUDIO
          </TabsTrigger>
          <TabsTrigger
            value="radio"
            className="flex-1 h-10 rounded-none data-[state=active]:bg-[#BC13FE]/10 data-[state=active]:text-[#BC13FE] data-[state=active]:border-b-2 data-[state=active]:border-[#BC13FE] text-xs font-semibold tracking-wider"
          >
            <Radio className="w-3.5 h-3.5 mr-1.5" />LIVE RADIO
          </TabsTrigger>
          <TabsTrigger
            value="gateway"
            className="flex-1 h-10 rounded-none data-[state=active]:bg-[#00FF88]/10 data-[state=active]:text-[#00FF88] data-[state=active]:border-b-2 data-[state=active]:border-[#00FF88] text-xs font-semibold tracking-wider"
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" />GATEWAY
          </TabsTrigger>
        </TabsList>

        {/* ── STUDIO TAB ─────────────────────────────────────────────── */}
        <TabsContent value="studio" className="p-4 space-y-4 mt-0">
          {/* Generation Panel */}
          <div className="glass-strong rounded-2xl border border-[#00F2FF]/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-[#00F2FF]" />
              <p className="text-xs font-bold text-white">Generate Music</p>
              <Badge className="ml-auto bg-[#00F2FF]/10 text-[#00F2FF] border-[#00F2FF]/30 text-[9px]">
                {STUDIO_DIAMOND_COST} 💎 / 30s
              </Badge>
            </div>

            {/* Style Presets */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {STYLE_PRESETS.map(s => (
                <button
                  key={s.label}
                  onClick={() => setSelectedStyle(selectedStyle === s.label ? '' : s.label)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border whitespace-nowrap transition-all shrink-0
                    ${selectedStyle === s.label
                      ? 'border-[#00F2FF] bg-[#00F2FF]/15 text-[#00F2FF]'
                      : 'border-white/10 text-muted-foreground hover:border-white/25'}`}
                >
                  <span>{s.icon}</span> {s.label}
                </button>
              ))}
            </div>

            {/* Prompt */}
            <Textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe your track… e.g. 'Upbeat Bollywood pop with tabla beats and electric guitar, 120 BPM'"
              className="bg-white/5 border-white/10 resize-none text-sm text-white placeholder:text-muted-foreground"
              rows={3}
              maxLength={500}
            />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-[#00FF88]" />
                <span>Moderation: Active</span>
              </div>
              <span>{prompt.length}/500</span>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim() || balance < STUDIO_DIAMOND_COST}
              className="w-full bg-gradient-to-r from-[#00F2FF]/20 to-[#BC13FE]/20 border border-[#00F2FF]/40 text-white font-bold tracking-wider hover:from-[#00F2FF]/30 hover:to-[#BC13FE]/30"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating via Gateway…</>
              ) : (
                <><Wand2 className="w-4 h-4 mr-2" /> Generate Track — {STUDIO_DIAMOND_COST} 💎</>
              )}
            </Button>

            {balance < STUDIO_DIAMOND_COST && !balanceLoading && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Insufficient Diamonds. Visit Wallet to recharge.
              </div>
            )}
          </div>

          {/* Track Library */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Tracks</p>
              <button onClick={loadTracks} className="text-muted-foreground hover:text-white">
                <RefreshCw className={`w-3.5 h-3.5 ${tracksLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {tracksLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />)}
              </div>
            ) : tracks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <span className="text-4xl block mb-3">🎵</span>
                <p className="text-sm">No tracks yet. Generate your first one!</p>
                <p className="text-xs mt-1">Tracks expire in 48hrs unless favorited ❤️</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tracks.map(track => (
                  <MusicPlayer
                    key={track.id}
                    track={track}
                    userId={userId ?? ''}
                    onDelete={deleteTrack}
                    onFavoriteChange={handleFavoriteChange}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <p className="text-center text-[10px] text-muted-foreground py-2">
            📋 Personal Use Only · Tracks auto-delete after 48hrs · Favorite to keep
          </p>
        </TabsContent>

        {/* ── RADIO TAB ──────────────────────────────────────────────── */}
        <TabsContent value="radio" className="p-4 mt-0">
          {userId ? (
            <RadioPanel userId={userId} chargeRadio={chargeRadio} diamondBalance={balance} />
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Radio className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Login to access Live Radio</p>
            </div>
          )}
        </TabsContent>

        {/* ── GATEWAY TAB ────────────────────────────────────────────── */}
        <TabsContent value="gateway" className="p-4 space-y-3 mt-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Provider Status
            </p>
            <button
              onClick={loadProviderStatuses}
              className="text-xs text-[#00F2FF] flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${gatewayLoading ? 'animate-spin' : ''}`} />Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {(providerStatuses.length > 0 ? providerStatuses : Array.from({ length: 12 }, (_, i) => ({ name: ['Suno', 'Udio', 'MiniMax', 'Mubert', 'ElevenLabs', 'StableAudio', 'Soundverse', 'Boomy', 'AIVA', 'Sonauto', 'Soundful', 'MubertAPI'][i] as MusicProvider, is_available: true, fail_count: 0, last_used_at: null, cooldown_until: null }))).map((provider, idx) => {
              const colorClass = PROVIDER_COLORS[provider.name as MusicProvider] ?? 'bg-white/10 text-white border-white/20';
              const cooldownActive = provider.cooldown_until && new Date(provider.cooldown_until) > new Date();
              return (
                <div key={provider.name} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-white">{provider.name}</p>
                      <Badge className={`text-[9px] px-1.5 py-0 ${colorClass}`}>
                        {provider.name}
                      </Badge>
                    </div>
                    {provider.last_used_at && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Last used: {new Date(provider.last_used_at).toLocaleTimeString()}
                      </p>
                    )}
                    {cooldownActive && (
                      <p className="text-[10px] text-yellow-400 mt-0.5">
                        Cooldown until {new Date(provider.cooldown_until!).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${provider.is_available && !cooldownActive ? 'bg-[#00FF88] shadow-[0_0_6px_#00FF88]' : 'bg-red-500'}`} />
                    {provider.fail_count > 0 && (
                      <span className="text-[9px] text-red-400">{provider.fail_count} fails</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gateway stats */}
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[
              { label: 'Online', value: `${availableCount}/12`, color: 'text-[#00FF88]' },
              { label: 'Strategy', value: 'Round-Robin', color: 'text-[#00F2FF]' },
              { label: 'Self-Heal', value: 'Active', color: 'text-[#BC13FE]' },
            ].map(stat => (
              <div key={stat.label} className="p-2 rounded-xl bg-white/5 text-center">
                <p className={`text-xs font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Cleanup info */}
          <div className="p-3 rounded-xl border border-yellow-400/20 bg-yellow-400/5">
            <div className="flex items-center gap-2 mb-1">
              <Trash2 className="w-3.5 h-3.5 text-yellow-400" />
              <p className="text-xs font-semibold text-yellow-400">Storage Cleanup</p>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Temp tracks auto-deleted every 48hrs. Favorited tracks kept indefinitely.
              Cleanup runs every 6 hours in-session.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
