/**
 * MUSIC COMPOSER — HuggingFace MusicGen full tracks + waveform
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Music, Play, Pause, Download, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import RxBadge from '@/components/common/RxBadge';
import { aiMusic } from '@/services/aiGateway';
import { supabase } from '@/db/supabase';

export default function MusicComposer() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('cinematic');
  const [mood, setMood] = useState('epic');
  const [duration, setDuration] = useState(15);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generate = async () => {
    setLoading(true);
    setAudioUrl(null);
    const fullPrompt = prompt.trim()
      ? `${prompt}, ${genre} style, ${mood} mood`
      : `${genre} ${mood} instrumental music, professional quality`;
    try {
      const res = await aiMusic(fullPrompt, 'generate', undefined, duration);
      setAudioUrl(res.audio_url);
      toast.success('Track generated!');
    } catch {
      toast.error('MusicGen unavailable — model warming up. Retry in 30s.');
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().catch(() => {}); setPlaying(true); }
  };

  const download = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `rx_music_${Date.now()}.wav`;
    a.click();
  };

  const saveToVault = async () => {
    if (!audioUrl) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Login required'); return; }
    try {
      const blob = await fetch(audioUrl).then(r => r.blob());
      const fileName = `music_${Date.now()}.wav`;
      const { error } = await supabase.storage.from('vault').upload(`${user.id}/music/${fileName}`, blob, { contentType: 'audio/wav' });
      if (error) throw error;
      toast.success('Saved to Cloud Vault');
    } catch { toast.error('Save failed'); }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/rx-music')} className="p-2 rounded-lg border border-white/10 hover:border-[#00F2FF]/40 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <RxBadge label="COMPOSE" />
        <div>
          <h1 className="text-sm font-bold tracking-widest">MUSIC COMPOSER</h1>
          <p className="text-[10px] text-muted-foreground">HuggingFace MusicGen · Full Tracks</p>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-[#00F2FF]/20 bg-white/[0.03] space-y-4">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-[#00F2FF]" />
            <span className="text-xs font-bold tracking-widest text-[#00F2FF]">COMPOSITION PARAMETERS</span>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Describe the music (optional)</Label>
            <Input value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. epic orchestral with electric guitar solo..."
              className="bg-white/5 border-white/10 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Genre</Label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['cinematic', 'hip-hop', 'electronic', 'jazz', 'rock', 'ambient', 'classical', 'trap', 'lofi', 'pop'].map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Mood</Label>
              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['epic', 'dark', 'uplifting', 'tense', 'romantic', 'mysterious', 'energetic', 'melancholic', 'triumphant'].map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Duration</Label>
              <span className="text-xs text-[#00F2FF]">{duration}s</span>
            </div>
            <Slider min={5} max={30} step={5} value={[duration]} onValueChange={([v]) => setDuration(v)} />
          </div>

          <Button onClick={generate} disabled={loading} className="w-full bg-[#00F2FF]/20 hover:bg-[#00F2FF]/30 border border-[#00F2FF]/40 text-[#00F2FF] font-bold">
            {loading
              ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />COMPOSING...</>
              : <><Music className="w-4 h-4 mr-2" />GENERATE TRACK</>}
          </Button>
        </motion.div>

        {/* Loading visual */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-4 rounded-xl border border-[#00F2FF]/20 bg-white/[0.03]">
            <p className="text-xs text-[#00F2FF] mb-3 tracking-widest">NEURAL COMPOSITION IN PROGRESS...</p>
            <div className="flex items-end gap-0.5 h-16">
              {Array.from({ length: 32 }, (_, i) => (
                <motion.div key={i} className="flex-1 bg-[#00F2FF] rounded-full opacity-60"
                  animate={{ height: ['10%', `${30 + Math.random() * 70}%`, '10%'] }}
                  transition={{ duration: 0.5 + Math.random() * 0.5, repeat: Infinity, delay: i * 0.03 }} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Audio player */}
        {audioUrl && !loading && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-xl border border-[#00F2FF]/30 bg-[#00F2FF]/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#00F2FF] tracking-widest">TRACK READY</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={saveToVault} className="text-xs h-7 border border-white/10">
                  <Save className="w-3 h-3 mr-1" />Vault
                </Button>
                <Button size="sm" variant="ghost" onClick={download} className="text-xs h-7 border border-white/10">
                  <Download className="w-3 h-3 mr-1" />WAV
                </Button>
              </div>
            </div>
            <div className="flex items-end gap-0.5 h-12">
              {Array.from({ length: 40 }, (_, i) => (
                <motion.div key={i} className="flex-1 bg-[#00F2FF] rounded-full"
                  animate={{ height: playing ? ['15%', `${15 + Math.random() * 85}%`, '15%'] : '15%' }}
                  transition={{ duration: 0.3 + Math.random() * 0.5, repeat: Infinity, delay: i * 0.02 }} />
              ))}
            </div>
            <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} />
            <Button onClick={togglePlay} className="w-full bg-[#00F2FF]/20 border border-[#00F2FF]/40 text-[#00F2FF]">
              {playing ? <><Pause className="w-4 h-4 mr-2" />Pause</> : <><Play className="w-4 h-4 mr-2" />Play Track</>}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
