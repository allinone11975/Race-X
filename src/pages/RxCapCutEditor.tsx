/**
 * RACE-X CapCut-Style Editor
 * Timeline-based video/audio editor with CapCut UX
 */
import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Download, Share2, Undo2, Redo2, Play, Pause,
  Volume2, VolumeX, ZoomIn, ZoomOut, Scissors, Type, Sticker,
  Sparkles, Music, Mic, Film, Wand2,
  Layers, Filter, ChevronDown, Plus, Diamond,
  Check, Sliders, Crop, RotateCcw, FlipHorizontal,
  PaintBucket, Eye, Wind, Zap, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { useRxStore } from '@/store/rxStore';
import DiamondGateModal from '@/components/common/DiamondGateModal';
import AiDirectorWidget from '@/components/common/AiDirectorWidget';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Track {
  id: string;
  type: 'video' | 'audio' | 'text' | 'sticker' | 'effect';
  label: string;
  color: string;
  startMs: number;
  durationMs: number;
  src?: string;
}

interface Tool {
  id: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  premium?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_TRACKS: Track[] = [
  { id: 'v1', type: 'video',  label: 'Main Clip',    color: '#4F46E5', startMs: 0,    durationMs: 8000  },
  { id: 'a1', type: 'audio',  label: 'Background',   color: '#059669', startMs: 0,    durationMs: 12000 },
  { id: 't1', type: 'text',   label: 'Title Text',   color: '#D97706', startMs: 1000, durationMs: 3000  },
];

const TIMELINE_PX_PER_SEC = 60;

const BOTTOM_TOOLS: Tool[] = [
  { id: 'cut',      icon: <Scissors className="w-5 h-5" />,     label: 'Split',    color: '#60A5FA' },
  { id: 'text',     icon: <Type className="w-5 h-5" />,         label: 'Text',     color: '#F59E0B' },
  { id: 'sticker',  icon: <Sticker className="w-5 h-5" />,      label: 'Sticker',  color: '#EC4899' },
  { id: 'effects',  icon: <Sparkles className="w-5 h-5" />,     label: 'Effects',  color: '#8B5CF6' },
  { id: 'filter',   icon: <Filter className="w-5 h-5" />,       label: 'Filter',   color: '#10B981' },
  { id: 'audio',    icon: <Music className="w-5 h-5" />,        label: 'Audio',    color: '#06B6D4' },
  { id: 'voice',    icon: <Mic className="w-5 h-5" />,          label: 'Voiceover',color: '#F97316' },
  { id: 'overlay',  icon: <Layers className="w-5 h-5" />,       label: 'Overlay',  color: '#84CC16' },
  { id: 'adjust',   icon: <Sliders className="w-5 h-5" />,      label: 'Adjust',   color: '#A78BFA' },
  { id: 'crop',     icon: <Crop className="w-5 h-5" />,         label: 'Crop',     color: '#FB923C' },
  { id: 'rotate',   icon: <RotateCcw className="w-5 h-5" />,    label: 'Rotate',   color: '#34D399' },
  { id: 'flip',     icon: <FlipHorizontal className="w-5 h-5" />, label: 'Mirror', color: '#60A5FA' },
  { id: 'bg',       icon: <PaintBucket className="w-5 h-5" />,  label: 'BG',       color: '#E879F9', premium: true },
  { id: 'ai',       icon: <Wand2 className="w-5 h-5" />,        label: 'AI Magic', color: '#BC13FE', premium: true },
  { id: 'beauty',   icon: <Star className="w-5 h-5" />,         label: 'Beauty',   color: '#F472B6', premium: true },
  { id: 'speed',    icon: <Zap className="w-5 h-5" />,          label: 'Speed',    color: '#FCD34D' },
  { id: 'opacity',  icon: <Eye className="w-5 h-5" />,          label: 'Opacity',  color: '#94A3B8' },
  { id: 'transition', icon: <Wind className="w-5 h-5" />,       label: 'Transition', color: '#67E8F9' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function RxCapCutEditor() {
  const navigate = useNavigate();
  useRxStore();
  const timelineRef = useRef<HTMLDivElement>(null);

  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [selectedTrack, setSelectedTrack] = useState<string | null>('v1');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [toolPanelOpen, setToolPanelOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [showExportGate, setShowExportGate] = useState(false);
  const [brightness, setBrightness] = useState([50]);
  const [contrast, setContrast] = useState([50]);
  const [saturation, setSaturation] = useState([50]);
  const [volume, setVolume] = useState([80]);
  const [speed, setSpeed] = useState([100]);

  const totalMs = Math.max(...tracks.map((t) => t.startMs + t.durationMs), 15000);
  const pxPerMs = (TIMELINE_PX_PER_SEC * zoom) / 1000;

  // ── Playhead ───────────────────────────────────────────────────────────────

  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      if (playRef.current) clearInterval(playRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playRef.current = setInterval(() => {
        setCurrentMs((p) => {
          if (p >= totalMs) { clearInterval(playRef.current!); setIsPlaying(false); return 0; }
          return p + 100;
        });
      }, 100);
    }
  }, [isPlaying, totalMs]);

  // ── Track split ────────────────────────────────────────────────────────────

  const splitTrack = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (!track || currentMs <= track.startMs || currentMs >= track.startMs + track.durationMs) {
      toast.error('Place playhead inside the clip to split');
      return;
    }
    const splitPoint = currentMs - track.startMs;
    const left: Track  = { ...track, id: `${trackId}-L`, durationMs: splitPoint };
    const right: Track = { ...track, id: `${trackId}-R`, startMs: currentMs, durationMs: track.durationMs - splitPoint };
    setTracks((prev) => prev.flatMap((t) => t.id === trackId ? [left, right] : [t]));
    toast.success('Clip split at playhead');
  };

  // ── Add track ──────────────────────────────────────────────────────────────

  const addTrack = (type: Track['type']) => {
    const colors: Record<Track['type'], string> = {
      video:   '#4F46E5', audio: '#059669', text: '#D97706',
      sticker: '#EC4899', effect: '#8B5CF6',
    };
    const newTrack: Track = {
      id:         `${type}-${Date.now()}`,
      type,
      label:      `New ${type}`,
      color:      colors[type],
      startMs:    currentMs,
      durationMs: 3000,
    };
    setTracks((p) => [...p, newTrack]);
    setSelectedTrack(newTrack.id);
    toast.success(`${type} track added`);
  };

  // ── Tool handler ───────────────────────────────────────────────────────────

  const handleTool = (toolId: string) => {
    if (toolId === 'cut') {
      if (selectedTrack) splitTrack(selectedTrack);
      return;
    }
    setActiveTool((prev) => (prev === toolId ? null : toolId));
    setToolPanelOpen(true);
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}.${String(ms % 1000).slice(0, 1)}`;
  };

  const filterStyle = {
    filter: `brightness(${50 + brightness[0] / 2}%) contrast(${50 + contrast[0] / 2}%) saturate(${50 + saturation[0] / 2}%)`,
  };

  return (
    <div className="fixed inset-0 bg-[#0A0A0F] flex flex-col overflow-hidden">

      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-bold text-white truncate max-w-[120px]">New Project</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white">
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            className="ml-1 h-7 px-3 text-xs font-bold bg-white text-black hover:bg-white/90 rounded-full"
            onClick={() => setShowExportGate(true)}
          >
            <Download className="w-3 h-3 mr-1" /> Export
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Preview Area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-black relative min-h-0" style={{ maxHeight: '42vh' }}>
        {/* Fake video preview */}
        <div
          className="relative aspect-[9/16] h-full max-h-full rounded-lg overflow-hidden bg-gradient-to-br from-[#1a0533] via-[#0d1b2a] to-[#0a0a1f] flex items-center justify-center"
          style={filterStyle}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#BC13FE]/10 via-transparent to-[#00F2FF]/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Film className="w-10 h-10 text-white/20 mx-auto" />
              <p className="text-white/20 text-xs">Preview Area</p>
            </div>
          </div>

          {/* Overlay for any text tracks */}
          {tracks.filter(t => t.type === 'text').map(t => (
            <div key={t.id} className="absolute bottom-12 inset-x-0 text-center">
              <p className="text-white text-xl font-black drop-shadow-lg">{t.label}</p>
            </div>
          ))}
        </div>

        {/* Playback controls */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <span className="text-[10px] text-white/40 font-mono w-14 text-right">{formatTime(currentMs)}</span>
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center"
          >
            {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
          </button>
          <span className="text-[10px] text-white/40 font-mono w-14">{formatTime(totalMs)}</span>
          <button onClick={() => setIsMuted(!isMuted)} className="text-white/40 hover:text-white">
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Active Tool Panel ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {toolPanelOpen && activeTool && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#111118] border-t border-white/5 px-4 py-3 shrink-0 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white capitalize">{activeTool}</span>
              <button onClick={() => setToolPanelOpen(false)} className="text-white/40 hover:text-white">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            {activeTool === 'adjust' && (
              <div className="space-y-3">
                {[
                  { label: 'Brightness', val: brightness, set: setBrightness },
                  { label: 'Contrast',   val: contrast,   set: setContrast   },
                  { label: 'Saturation', val: saturation, set: setSaturation },
                ].map(({ label, val, set }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-[11px] text-white/50 w-20 shrink-0">{label}</span>
                    <Slider value={val} onValueChange={set} min={0} max={100} className="flex-1" />
                    <span className="text-[11px] text-white/40 w-8 text-right">{val[0]}</span>
                  </div>
                ))}
              </div>
            )}
            {activeTool === 'audio' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-white/50 w-20 shrink-0">Volume</span>
                  <Slider value={volume} onValueChange={setVolume} min={0} max={100} className="flex-1" />
                  <span className="text-[11px] text-white/40 w-8 text-right">{volume[0]}%</span>
                </div>
                <div className="flex gap-2">
                  {['Add Music', 'Extract Audio', 'Sound Effects'].map((a) => (
                    <button key={a} onClick={() => toast.info(`${a} coming soon`)}
                      className="flex-1 text-[10px] py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10">
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {activeTool === 'speed' && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-white/50 w-20 shrink-0">Speed</span>
                  <Slider value={speed} onValueChange={setSpeed} min={25} max={400} className="flex-1" />
                  <span className="text-[11px] text-white/40 w-10 text-right">{speed[0] / 100}x</span>
                </div>
                <div className="flex gap-1.5">
                  {[0.25, 0.5, 1, 1.5, 2, 4].map((s) => (
                    <button key={s} onClick={() => setSpeed([s * 100])}
                      className={`flex-1 py-1 rounded text-[10px] font-bold border transition-all ${speed[0] === s * 100 ? 'bg-[#BC13FE]/20 border-[#BC13FE]/50 text-[#BC13FE]' : 'bg-white/5 border-white/10 text-white/50'}`}>
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            )}
            {activeTool === 'text' && (
              <div className="flex gap-2 flex-wrap">
                {['Title', 'Caption', 'Subtitle', 'Lyric', 'Label', 'Neon'].map((style) => (
                  <button key={style} onClick={() => { addTrack('text'); setToolPanelOpen(false); }}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 hover:text-white hover:bg-white/10">
                    {style}
                  </button>
                ))}
              </div>
            )}
            {activeTool === 'filter' && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {['None', 'Cinematic', 'Warm', 'Cold', 'B&W', 'Vintage', 'Neon', 'Fade'].map((f) => (
                  <button key={f}
                    className="shrink-0 flex flex-col items-center gap-1 w-12"
                    onClick={() => toast.info(`${f} filter applied`)}>
                    <div className="w-12 h-12 rounded-lg bg-white/10 border border-white/20" />
                    <span className="text-[9px] text-white/50">{f}</span>
                  </button>
                ))}
              </div>
            )}
            {!['adjust','audio','speed','text','filter'].includes(activeTool) && (
              <p className="text-xs text-white/30 text-center py-2">{activeTool} panel — coming soon</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Timeline ──────────────────────────────────────────────────────── */}
      <div className="bg-[#0D0D15] border-t border-white/5 shrink-0" style={{ height: '160px' }}>
        {/* Zoom controls */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5">
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="text-white/40 hover:text-white">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <div className="flex-1 flex items-center gap-1">
            {/* Time ruler */}
            <div className="flex-1 overflow-hidden">
              <div className="flex" style={{ width: `${totalMs * pxPerMs}px` }}>
                {Array.from({ length: Math.ceil(totalMs / 1000) }).map((_, i) => (
                  <div key={i} className="shrink-0 text-center" style={{ width: `${TIMELINE_PX_PER_SEC * zoom}px` }}>
                    <span className="text-[9px] text-white/30">{i}s</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="text-white/40 hover:text-white">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => addTrack('video')} className="ml-2 text-white/40 hover:text-[#BC13FE]">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Track lanes */}
        <div ref={timelineRef} className="overflow-x-auto overflow-y-auto h-full relative">
          {/* Playhead line */}
          <div
            className="absolute top-0 bottom-0 w-px bg-[#BC13FE] z-20 pointer-events-none"
            style={{ left: `${currentMs * pxPerMs + 8}px` }}
          >
            <div className="w-2 h-2 bg-[#BC13FE] rounded-full -ml-[3px]" />
          </div>

          <div className="space-y-1 px-2 pt-1 pb-2"
            style={{ width: `${totalMs * pxPerMs + 40}px` }}>
            {tracks.map((track) => (
              <div key={track.id} className="relative h-9 flex items-center">
                {/* Track type label */}
                <div className="w-6 shrink-0 mr-1">
                  <div className="w-5 h-5 rounded flex items-center justify-center"
                    style={{ background: `${track.color}20` }}>
                    {track.type === 'video'   && <Film   className="w-2.5 h-2.5" style={{ color: track.color }} />}
                    {track.type === 'audio'   && <Music  className="w-2.5 h-2.5" style={{ color: track.color }} />}
                    {track.type === 'text'    && <Type   className="w-2.5 h-2.5" style={{ color: track.color }} />}
                    {track.type === 'sticker' && <Sticker className="w-2.5 h-2.5" style={{ color: track.color }} />}
                    {track.type === 'effect'  && <Wand2  className="w-2.5 h-2.5" style={{ color: track.color }} />}
                  </div>
                </div>

                {/* Clip block */}
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  className="absolute h-8 rounded-md cursor-pointer border-2 transition-all flex items-center px-2 overflow-hidden"
                  style={{
                    left:   `${track.startMs * pxPerMs + 28}px`,
                    width:  `${track.durationMs * pxPerMs}px`,
                    background: `${track.color}25`,
                    borderColor: selectedTrack === track.id ? track.color : `${track.color}50`,
                    boxShadow: selectedTrack === track.id ? `0 0 8px ${track.color}60` : 'none',
                  }}
                  onClick={() => setSelectedTrack(track.id)}
                >
                  {/* Waveform bars for audio */}
                  {track.type === 'audio' && (
                    <div className="flex items-center gap-px mr-2">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="w-px rounded-full opacity-60"
                          style={{ height: `${8 + Math.sin(i * 0.8) * 6}px`, background: track.color }} />
                      ))}
                    </div>
                  )}
                  <span className="text-[9px] font-semibold truncate" style={{ color: track.color }}>
                    {track.label}
                  </span>
                  {selectedTrack === track.id && (
                    <Check className="w-2.5 h-2.5 ml-auto shrink-0" style={{ color: track.color }} />
                  )}
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Tool Bar ───────────────────────────────────────────────── */}
      <div className="bg-[#0A0A0F] border-t border-white/10 shrink-0">
        <div className="flex items-center gap-0.5 overflow-x-auto px-2 py-2 scrollbar-hide">
          {BOTTOM_TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleTool(tool.id)}
              className={`shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[52px] ${
                activeTool === tool.id
                  ? 'bg-white/10'
                  : 'hover:bg-white/5'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center relative ${
                  activeTool === tool.id ? 'ring-1' : ''
                }`}
                style={{
                  background: `${tool.color}15`,
                  color:       tool.color,
                }}
              >
                {tool.icon}
                {tool.premium && (
                  <Diamond className="w-2 h-2 absolute -top-0.5 -right-0.5 text-[#FFD700]" />
                )}
              </div>
              <span className="text-[9px] text-white/50 font-medium leading-none">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Export Gate ───────────────────────────────────────────────────── */}
      <DiamondGateModal
        open={showExportGate}
        onClose={() => setShowExportGate(false)}
        onSuccess={() => toast.success('Exporting project… 🎬')}
        requiredDiamonds={5}
        actionLabel="Export Video"
      />

      {/* ── AI Director (studio-only) ─────────────────────────────────────── */}
      <AiDirectorWidget />
    </div>
  );
}
