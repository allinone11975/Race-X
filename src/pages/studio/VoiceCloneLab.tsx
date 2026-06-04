/**
 * VOICE CLONE LAB — HuggingFace Bark voice synthesis
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Mic, Play, Pause, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import RxBadge from '@/components/common/RxBadge';
import { aiVoice } from '@/services/aiGateway';

const VOICE_PRESETS = [
  { id: 'v2/en_speaker_0', label: 'Narrator Male', accent: 'English' },
  { id: 'v2/en_speaker_1', label: 'Narrator Female', accent: 'English' },
  { id: 'v2/en_speaker_6', label: 'Deep Cinematic', accent: 'English' },
  { id: 'v2/en_speaker_9', label: 'Energetic Host', accent: 'English' },
];

export default function VoiceCloneLab() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [preset, setPreset] = useState('v2/en_speaker_0');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generate = async () => {
    if (!text.trim()) { toast.error('Enter text to synthesize'); return; }
    if (text.length > 300) { toast.error('Max 300 characters'); return; }
    setLoading(true);
    setAudioUrl(null);
    try {
      const res = await aiVoice(text, preset);
      setAudioUrl(res.audio_url);
    } catch {
      toast.error('Voice synthesis failed. Model may be warming up — retry in 20s.');
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const download = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `rx_voice_${Date.now()}.wav`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/rx-studio/tools')} className="p-2 rounded-lg border border-white/10 hover:border-[#00F2FF]/40 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <RxBadge label="VOICE" />
        <div>
          <h1 className="text-sm font-bold tracking-widest">VOICE CLONE LAB</h1>
          <p className="text-[10px] text-muted-foreground">HuggingFace Bark · Neural TTS</p>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-[#00F2FF]/20 bg-white/[0.03] space-y-4">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-[#00F2FF]" />
            <span className="text-xs font-bold tracking-widest text-[#00F2FF]">VOICE PARAMETERS</span>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Voice Preset</Label>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICE_PRESETS.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    <span className="font-medium">{v.label}</span>
                    <span className="text-muted-foreground ml-2 text-xs">· {v.accent}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Script Text <span className="text-[#00F2FF]">{text.length}/300</span>
            </Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 300))}
              placeholder="Enter dialogue or narration to synthesize..."
              className="bg-white/5 border-white/10 resize-none text-sm"
              rows={4}
            />
          </div>

          <Button onClick={generate} disabled={loading} className="w-full bg-[#00F2FF]/20 hover:bg-[#00F2FF]/30 border border-[#00F2FF]/40 text-[#00F2FF] font-bold">
            {loading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />SYNTHESIZING...</> : <><Mic className="w-4 h-4 mr-2" />SYNTHESIZE VOICE</>}
          </Button>
        </motion.div>

        {/* Waveform / Player */}
        {audioUrl && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-xl border border-[#00F2FF]/30 bg-[#00F2FF]/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#00F2FF] tracking-widest">AUDIO READY</span>
              <Button size="sm" variant="ghost" onClick={download} className="text-xs h-7 border border-white/10">
                <Download className="w-3 h-3 mr-1" />WAV
              </Button>
            </div>
            {/* Waveform visual */}
            <div className="flex items-center gap-0.5 h-12">
              {Array.from({ length: 40 }, (_, i) => (
                <motion.div
                  key={i}
                  className="flex-1 bg-[#00F2FF] rounded-full"
                  animate={{ height: playing ? ['20%', `${20 + Math.random() * 80}%`, '20%'] : '20%' }}
                  transition={{ duration: 0.3 + Math.random() * 0.4, repeat: Infinity, delay: i * 0.02 }}
                />
              ))}
            </div>
            <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} />
            <Button onClick={togglePlay} className="w-full bg-[#00F2FF]/20 border border-[#00F2FF]/40 text-[#00F2FF]">
              {playing ? <><Pause className="w-4 h-4 mr-2" />Pause</> : <><Play className="w-4 h-4 mr-2" />Play</>}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
