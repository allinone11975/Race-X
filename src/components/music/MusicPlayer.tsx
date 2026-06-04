/**
 * RACE-X  ·  Music Player Component
 * Waveform visualizer · seek · progress · diamond cost display
 */
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Heart, Trash2, SkipForward, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { favoriteTrack, unfavoriteTrack } from '@/lib/storageLifecycle';

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

interface MusicPlayerProps {
  track: MusicTrack;
  userId: string;
  onDelete?: (id: string) => void;
  onFavoriteChange?: (id: string, isFav: boolean) => void;
}

export default function MusicPlayer({ track, userId, onDelete, onFavoriteChange }: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isFav, setIsFav] = useState(track.is_favorite);

  // Update progress bar
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    };
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', () => { setIsPlaying(false); setProgress(0); });
    return () => audio.removeEventListener('timeupdate', onTimeUpdate);
  }, []);

  // Waveform visualizer via Web Audio API
  function setupVisualizer() {
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    if (!audio || !canvas) return;

    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      const source = ctxRef.current.createMediaElementSource(audio);
      analyserRef.current = ctxRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      source.connect(analyserRef.current);
      analyserRef.current.connect(ctxRef.current.destination);
    }

    const analyser = analyserRef.current!;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const ctx = canvas.getContext('2d')!;

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.2;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const h = (dataArray[i] / 255) * canvas.height;
        const alpha = 0.5 + (dataArray[i] / 255) * 0.5;
        ctx.fillStyle = `rgba(0, 242, 255, ${alpha})`;
        ctx.fillRect(x, canvas.height - h, barWidth - 1, h);
        x += barWidth;
      }
    };
    draw();
  }

  function stopVisualizer() {
    cancelAnimationFrame(animFrameRef.current);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !track.audio_url) {
      toast.error('No audio available for this track.');
      return;
    }
    if (isPlaying) {
      audio.pause();
      stopVisualizer();
      setIsPlaying(false);
    } else {
      setupVisualizer();
      await audio.play();
      setIsPlaying(true);
    }
  };

  const seek = (val: number[]) => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      audio.currentTime = (val[0] / 100) * audio.duration;
    }
  };

  const toggleFavorite = async () => {
    const newFav = !isFav;
    const ok = newFav
      ? await favoriteTrack(userId, track.id)
      : await unfavoriteTrack(userId, track.id);
    if (ok) {
      setIsFav(newFav);
      onFavoriteChange?.(track.id, newFav);
      toast.success(newFav ? '❤️ Added to Favorites (saved permanently)' : 'Removed from Favorites');
    }
  };

  const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

  return (
    <div className="glass-strong rounded-2xl border border-[#00F2FF]/20 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#00F2FF]/10 flex items-center justify-center shrink-0 border border-[#00F2FF]/20">
          <span className="text-xl">🎵</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{track.title}</p>
          <p className="text-[10px] text-muted-foreground truncate">{track.prompt}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Badge className="text-[9px] px-1.5 py-0 bg-[#BC13FE]/20 text-[#BC13FE] border-[#BC13FE]/30">
              {track.provider}
            </Badge>
            <span className="text-[10px] text-[#00FF88]">💎 {track.diamond_cost}</span>
            <span className="text-[10px] text-muted-foreground">{track.duration_sec}s</span>
          </div>
        </div>
      </div>

      {/* Waveform Canvas */}
      <canvas
        ref={canvasRef}
        width={320}
        height={40}
        className="w-full h-10 rounded-lg bg-white/5"
      />

      {/* Progress */}
      <Slider
        value={[progress]}
        onValueChange={seek}
        max={100}
        step={0.1}
        className="w-full"
      />

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            onClick={togglePlay}
            className="h-9 w-9 rounded-full bg-[#00F2FF]/20 border border-[#00F2FF]/40 hover:bg-[#00F2FF]/30"
          >
            {isPlaying ? <Pause className="w-4 h-4 text-[#00F2FF]" /> : <Play className="w-4 h-4 text-[#00F2FF]" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => {}}>
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-1 mx-3">
          <Volume2 className="w-3 h-3 text-muted-foreground shrink-0" />
          <Slider
            value={[volume * 100]}
            onValueChange={(v) => {
              const vol = v[0] / 100;
              setVolume(vol);
              if (audioRef.current) audioRef.current.volume = vol;
            }}
            max={100}
            step={1}
            className="flex-1"
          />
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleFavorite}
            className={`h-8 w-8 ${isFav ? 'text-red-400' : 'text-muted-foreground'}`}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-red-400' : ''}`} />
          </Button>
          {onDelete && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(track.id)}
              className="h-8 w-8 text-muted-foreground hover:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Hidden audio element */}
      {track.audio_url && (
        <audio ref={audioRef} src={track.audio_url} preload="metadata" />
      )}
    </div>
  );
}
