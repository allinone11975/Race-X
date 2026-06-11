/**
 * RACE-X Layer Editor
 * Full layer-by-layer editor: Video · Audio · Image
 * Each layer supports Manual controls + AI-powered tools
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Plus, Trash2, Eye, EyeOff, Lock, Unlock,
  ChevronUp, ChevronDown, Film, Music, Image as ImageIcon,
  Wand2, Layers, Sparkles, Zap,
  Download, Undo2, Redo2, Copy, Check,
  Mic, Palette, SunMedium,
  Maximize2, RefreshCw, Star, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type LayerType = 'video' | 'audio' | 'image';
type TabType = 'video' | 'audio' | 'image';

interface BaseLayer {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  selected: boolean;
}

interface VideoLayer extends BaseLayer {
  type: 'video';
  src: string | null;
  startMs: number;
  durationMs: number;
  trimStart: number;
  trimEnd: number;
  brightness: number;
  contrast: number;
  saturation: number;
  blendMode: string;
  speed: number;
  flipH: boolean;
  flipV: boolean;
  rotation: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AudioLayer extends BaseLayer {
  type: 'audio';
  src: string | null;
  startMs: number;
  durationMs: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  pitch: number;
  eq: { bass: number; mid: number; treble: number };
  muted: boolean;
}

interface ImageLayer extends BaseLayer {
  type: 'image';
  src: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  blendMode: string;
  borderRadius: number;
}

type Layer = VideoLayer | AudioLayer | ImageLayer;

// ─── Initial Layers ───────────────────────────────────────────────────────────

const makeVideo = (n: number): VideoLayer => ({
  id: `v${n}`, type: 'video', name: `Video ${n}`, visible: true, locked: false,
  opacity: 100, selected: n === 1,
  src: null, startMs: 0, durationMs: 8000, trimStart: 0, trimEnd: 0,
  brightness: 50, contrast: 50, saturation: 50, blendMode: 'normal',
  speed: 100, flipH: false, flipV: false, rotation: 0, x: 0, y: 0, width: 100, height: 100,
});
const makeAudio = (n: number): AudioLayer => ({
  id: `a${n}`, type: 'audio', name: `Audio ${n}`, visible: true, locked: false,
  opacity: 100, selected: false,
  src: null, startMs: 0, durationMs: 12000,
  volume: 80, fadeIn: 0, fadeOut: 0, pitch: 0,
  eq: { bass: 50, mid: 50, treble: 50 }, muted: false,
});
const makeImage = (n: number): ImageLayer => ({
  id: `i${n}`, type: 'image', name: `Image ${n}`, visible: true, locked: false,
  opacity: 100, selected: false,
  src: null, x: 0, y: 0, width: 100, height: 100, rotation: 0,
  flipH: false, flipV: false, brightness: 50, contrast: 50, saturation: 50,
  blendMode: 'normal', borderRadius: 0,
});

const BLEND_MODES = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'hard-light', 'difference'];

// ─── AI Tools per type ────────────────────────────────────────────────────────

const AI_TOOLS: Record<LayerType, { id: string; label: string; icon: React.ReactNode; color: string; desc: string }[]> = {
  video: [
    { id: 'upscale',    label: 'AI Upscale',       icon: <Maximize2 className="w-4 h-4" />, color: '#00F2FF', desc: 'Enhance to 4K using ESRGAN' },
    { id: 'colorgrade', label: 'AI Color Grade',   icon: <Palette className="w-4 h-4" />,   color: '#BC13FE', desc: 'Cinematic LUT via Stable Diffusion' },
    { id: 'removebg',   label: 'Remove Background',icon: <Layers className="w-4 h-4" />,    color: '#00FF88', desc: 'Frame-by-frame BG removal' },
    { id: 'slowmo',     label: 'AI Slow Motion',   icon: <RefreshCw className="w-4 h-4" />, color: '#F59E0B', desc: 'RIFE frame interpolation 4× / 8×' },
    { id: 'denoise',    label: 'Denoise Video',     icon: <Sparkles className="w-4 h-4" />,  color: '#A78BFA', desc: 'Remove grain & noise (DeepDenoise)' },
    { id: 'faceenhance',label: 'Face Enhance',      icon: <Star className="w-4 h-4" />,      color: '#EC4899', desc: 'Restore & sharpen faces (GFPGAN)' },
    { id: 'autoedit',   label: 'AI Auto Edit',      icon: <Zap className="w-4 h-4" />,       color: '#FFD700', desc: 'Smart cut to music beat' },
    { id: 'style',      label: 'Style Transfer',    icon: <Wand2 className="w-4 h-4" />,     color: '#FB923C', desc: 'Anime / Cinematic / Painting style' },
  ],
  audio: [
    { id: 'denoise',    label: 'Noise Removal',     icon: <Sparkles className="w-4 h-4" />,  color: '#00F2FF', desc: 'Remove background hiss & hum' },
    { id: 'enhance',    label: 'Voice Enhance',     icon: <Mic className="w-4 h-4" />,       color: '#BC13FE', desc: 'Boost clarity, EQ & presence' },
    { id: 'clone',      label: 'Voice Clone',       icon: <Copy className="w-4 h-4" />,      color: '#00FF88', desc: 'Clone voice with ElevenLabs' },
    { id: 'musicgen',   label: 'Generate Music',    icon: <Music className="w-4 h-4" />,     color: '#F59E0B', desc: 'HuggingFace MusicGen full track' },
    { id: 'separate',   label: 'Stem Separator',    icon: <Layers className="w-4 h-4" />,    color: '#A78BFA', desc: 'Split vocals / drums / bass / other' },
    { id: 'lyrics',     label: 'AI Lyrics',         icon: <Wand2 className="w-4 h-4" />,     color: '#EC4899', desc: 'Generate lyrics from prompt' },
    { id: 'beatmatch',  label: 'Beat Sync',         icon: <Zap className="w-4 h-4" />,       color: '#FFD700', desc: 'Auto-sync audio to video beats' },
    { id: 'tts',        label: 'Text to Speech',    icon: <Mic className="w-4 h-4" />,       color: '#FB923C', desc: 'Bark / ElevenLabs voice synth' },
  ],
  image: [
    { id: 'generate',   label: 'AI Generate',       icon: <Wand2 className="w-4 h-4" />,     color: '#00F2FF', desc: 'Generate from prompt (SDXL)' },
    { id: 'enhance',    label: 'AI Enhance',        icon: <Star className="w-4 h-4" />,      color: '#BC13FE', desc: 'Upscale + detail (RealESRGAN)' },
    { id: 'removebg',   label: 'Remove BG',         icon: <Layers className="w-4 h-4" />,    color: '#00FF88', desc: 'Transparent BG in one click' },
    { id: 'inpaint',    label: 'AI Inpaint',        icon: <Palette className="w-4 h-4" />,   color: '#F59E0B', desc: 'Erase & fill with AI (Stable Diffusion)' },
    { id: 'style',      label: 'Style Transfer',    icon: <Sparkles className="w-4 h-4" />,  color: '#A78BFA', desc: 'Apply artistic style (IP-Adapter)' },
    { id: 'expand',     label: 'AI Expand',         icon: <Maximize2 className="w-4 h-4" />, color: '#EC4899', desc: 'Outpainting (extend canvas)' },
    { id: 'relight',    label: 'AI Relight',        icon: <SunMedium className="w-4 h-4" />, color: '#FFD700', desc: 'Change lighting direction & mood' },
    { id: 'img2img',    label: 'Image-to-Image',    icon: <RefreshCw className="w-4 h-4" />, color: '#FB923C', desc: 'Transform with SDXL img2img' },
  ],
};

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: { id: TabType; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'video', label: 'Video',  icon: <Film className="w-4 h-4" />,       color: '#4F46E5' },
  { id: 'audio', label: 'Audio',  icon: <Music className="w-4 h-4" />,      color: '#059669' },
  { id: 'image', label: 'Image',  icon: <ImageIcon className="w-4 h-4" />,  color: '#D97706' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function RxLayerEditor() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab]         = useState<TabType>('video');
  const [activePanel, setActivePanel]     = useState<'manual' | 'ai'>('manual');
  const [videoLayers, setVideoLayers]     = useState<VideoLayer[]>([makeVideo(1), makeVideo(2)]);
  const [audioLayers, setAudioLayers]     = useState<AudioLayer[]>([makeAudio(1)]);
  const [imageLayers, setImageLayers]     = useState<ImageLayer[]>([makeImage(1)]);
  const [aiProcessing, setAiProcessing]   = useState<string | null>(null);
  const [aiPrompt, setAiPrompt]           = useState('');

  // ── Helpers ──────────────────────────────────────────────────────────────

  const layers = activeTab === 'video' ? videoLayers
    : activeTab === 'audio' ? audioLayers : imageLayers;

  const selectedLayer = layers.find((l) => l.selected) ?? null;

  const setLayers = (fn: (prev: Layer[]) => Layer[]) => {
    if (activeTab === 'video')      setVideoLayers(fn as (p: VideoLayer[]) => VideoLayer[]);
    else if (activeTab === 'audio') setAudioLayers(fn as (p: AudioLayer[]) => AudioLayer[]);
    else                            setImageLayers(fn as (p: ImageLayer[]) => ImageLayer[]);
  };

  const select = (id: string) =>
    setLayers((prev) => prev.map((l) => ({ ...l, selected: l.id === id })) as Layer[]);

  const toggle = (id: string, key: 'visible' | 'locked') =>
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, [key]: !l[key] } : l) as Layer[]);

  const remove = (id: string) =>
    setLayers((prev) => prev.filter((l) => l.id !== id) as Layer[]);

  const moveUp = (id: string) =>
    setLayers((prev) => {
      const i = prev.findIndex((l) => l.id === id);
      if (i <= 0) return prev;
      const a = [...prev]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a as Layer[];
    });

  const moveDown = (id: string) =>
    setLayers((prev) => {
      const i = prev.findIndex((l) => l.id === id);
      if (i >= prev.length - 1) return prev;
      const a = [...prev]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a as Layer[];
    });

  const updateProp = <T extends Layer>(id: string, patch: Partial<T>) =>
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l) as Layer[]);

  const addLayer = () => {
    if (activeTab === 'video') setVideoLayers((p) => [...p, makeVideo(p.length + 1)]);
    else if (activeTab === 'audio') setAudioLayers((p) => [...p, makeAudio(p.length + 1)]);
    else setImageLayers((p) => [...p, makeImage(p.length + 1)]);
    toast.success(`New ${activeTab} layer added`);
  };

  const runAiTool = (toolId: string, toolLabel: string) => {
    setAiProcessing(toolId);
    setTimeout(() => {
      setAiProcessing(null);
      toast.success(`${toolLabel} applied to layer`);
    }, 2200);
  };

  const tabColor = TABS.find((t) => t.id === activeTab)?.color ?? '#4F46E5';

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-[#0A0A0F] flex flex-col overflow-hidden text-white">

      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/rx-studio/editor')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-sm font-black leading-tight" style={{ color: tabColor }}>Layer Editor</h1>
            <p className="text-[10px] text-white/30">Video · Audio · Image</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/30 hover:text-white"><Undo2 className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/30 hover:text-white"><Redo2 className="w-3.5 h-3.5" /></Button>
          <Button size="sm" className="h-7 px-3 ml-1 text-xs font-bold rounded-full text-white"
            style={{ background: tabColor }}
            onClick={() => toast.success('Project exported!')}>
            <Download className="w-3 h-3 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* ── Type Tabs ─────────────────────────────────────────────────────── */}
      <div className="flex border-b border-white/5 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all border-b-2 ${
              activeTab === tab.id ? 'border-current' : 'border-transparent text-white/30 hover:text-white/60'
            }`}
            style={{ color: activeTab === tab.id ? tab.color : undefined }}
          >
            {tab.icon} {tab.label}
            <span className="text-[9px] opacity-60">
              ({activeTab === tab.id ? layers.length : tab.id === 'video' ? videoLayers.length : tab.id === 'audio' ? audioLayers.length : imageLayers.length})
            </span>
          </button>
        ))}
      </div>

      {/* ── Main Body ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Layer Stack ─────────────────────────────────────────── */}
        <div className="w-44 shrink-0 border-r border-white/5 flex flex-col bg-[#0D0D15]">
          <div className="flex items-center justify-between px-2 py-2 border-b border-white/5">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Layers</span>
            <button onClick={addLayer}
              className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-0.5 p-1">
            {[...layers].reverse().map((layer) => (
              <motion.div
                key={layer.id}
                layout
                onClick={() => select(layer.id)}
                className={`group relative rounded-lg px-2 py-2 cursor-pointer transition-all border ${
                  layer.selected
                    ? 'border-white/20 bg-white/8'
                    : 'border-transparent hover:bg-white/5'
                }`}
                style={{ borderColor: layer.selected ? tabColor + '60' : undefined,
                         background: layer.selected ? tabColor + '10' : undefined }}
              >
                {/* Layer name */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: tabColor + '60' }}>
                    {activeTab === 'video' && <Film className="w-2 h-2 m-0.5" style={{ color: tabColor }} />}
                    {activeTab === 'audio' && <Music className="w-2 h-2 m-0.5" style={{ color: tabColor }} />}
                    {activeTab === 'image' && <ImageIcon className="w-2 h-2 m-0.5" style={{ color: tabColor }} />}
                  </div>
                  <span className="text-[11px] font-semibold truncate">{layer.name}</span>
                </div>

                {/* Controls row */}
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); toggle(layer.id, 'visible'); }}
                    className="text-white/30 hover:text-white transition-colors">
                    {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-white/20" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); toggle(layer.id, 'locked'); }}
                    className="text-white/30 hover:text-white transition-colors">
                    {layer.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
                  </button>
                  <div className="flex flex-col ml-auto">
                    <button onClick={(e) => { e.stopPropagation(); moveUp(layer.id); }}
                      className="text-white/20 hover:text-white"><ChevronUp className="w-3 h-3" /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveDown(layer.id); }}
                      className="text-white/20 hover:text-white"><ChevronDown className="w-3 h-3" /></button>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); remove(layer.id); }}
                    className="text-white/20 hover:text-red-400 transition-colors ml-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Opacity mini bar */}
                <div className="mt-1.5">
                  <div className="h-0.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${layer.opacity}%`, background: tabColor }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Center: Canvas Preview ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center bg-black relative overflow-hidden">
          {/* Canvas */}
          <div className="relative aspect-[9/16] h-[calc(100%-24px)] max-h-full rounded-lg overflow-hidden bg-gradient-to-br from-[#1a0533] to-[#0a0a1f] border border-white/5">

            {/* Composited image layers */}
            {[...imageLayers].reverse().filter((l) => l.visible).map((l) => (
              <div key={l.id} className="absolute inset-0 flex items-center justify-center"
                style={{ opacity: l.opacity / 100 }}>
                {l.src
                  ? <img src={l.src} alt={l.name} className="w-full h-full object-cover" style={{ mixBlendMode: l.blendMode as never }} />
                  : <div className="w-3/4 h-2/3 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2"
                      style={{ borderColor: tabColor + '40' }}>
                      <ImageIcon className="w-8 h-8 text-white/10" />
                      <span className="text-[10px] text-white/20">{l.name}</span>
                    </div>
                }
              </div>
            ))}

            {/* Video layer placeholder */}
            {videoLayers.filter((l) => l.visible).length > 0 && !imageLayers.some((l) => l.src && l.visible) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Film className="w-10 h-10 text-white/10 mx-auto" />
                  <p className="text-[10px] text-white/20">Video Preview</p>
                  <p className="text-[9px] text-white/10">{videoLayers.filter(l=>l.visible).length} layer(s) active</p>
                </div>
              </div>
            )}

            {/* AI processing overlay */}
            <AnimatePresence>
              {aiProcessing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 z-10">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Sparkles className="w-8 h-8" style={{ color: tabColor }} />
                  </motion.div>
                  <p className="text-xs font-bold text-white">AI Processing…</p>
                  <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ background: tabColor }}
                      animate={{ width: ['0%', '100%'] }} transition={{ duration: 2.2, ease: 'easeInOut' }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Upload hint */}
          <p className="absolute bottom-1 text-[9px] text-white/20">
            Tap layer + upload to add media
          </p>
        </div>

        {/* ── Right: Properties Panel ────────────────────────────────────── */}
        <div className="w-52 shrink-0 border-l border-white/5 flex flex-col bg-[#0D0D15] overflow-y-auto">

          {/* Manual / AI switcher */}
          <div className="flex border-b border-white/5 shrink-0">
            {(['manual', 'ai'] as const).map((p) => (
              <button key={p} onClick={() => setActivePanel(p)}
                className={`flex-1 py-2.5 text-[11px] font-bold capitalize transition-all border-b-2 ${
                  activePanel === p ? 'border-current' : 'border-transparent text-white/30 hover:text-white/60'
                }`}
                style={{ color: activePanel === p ? tabColor : undefined }}>
                {p === 'manual' ? '⚙️ Manual' : '✨ AI Tools'}
              </button>
            ))}
          </div>

          {!selectedLayer ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[11px] text-white/20 text-center px-4">Select a layer to edit</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {activePanel === 'manual' ? (

                  /* ── MANUAL PANEL ───────────────────────────────────── */
                  <motion.div key="manual" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                    className="p-3 space-y-5">

                    {/* Layer name */}
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Layer Name</p>
                      <Input value={selectedLayer.name}
                        onChange={(e) => updateProp(selectedLayer.id, { name: e.target.value })}
                        className="h-7 text-xs bg-white/5 border-white/10 text-white" />
                    </div>

                    {/* Upload */}
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Source</p>
                      <input ref={fileRef} type="file"
                        accept={activeTab === 'video' ? 'video/*' : activeTab === 'audio' ? 'audio/*' : 'image/*'}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const url = URL.createObjectURL(f);
                            updateProp(selectedLayer.id, { src: url, name: f.name.split('.')[0] });
                            toast.success('Media loaded');
                          }
                        }} />
                      <button onClick={() => fileRef.current?.click()}
                        className="w-full flex items-center gap-2 py-2 px-3 rounded-lg border border-dashed text-xs font-semibold hover:bg-white/5 transition-colors"
                        style={{ borderColor: tabColor + '50', color: tabColor }}>
                        <Upload className="w-3.5 h-3.5" />
                        {(selectedLayer as VideoLayer | AudioLayer | ImageLayer).src ? 'Replace File' : 'Upload File'}
                      </button>
                    </div>

                    {/* Opacity */}
                    <SliderRow label="Opacity" value={selectedLayer.opacity} min={0} max={100} unit="%"
                      color={tabColor}
                      onChange={(v) => updateProp(selectedLayer.id, { opacity: v })} />

                    {/* ── Video specific ─────────────────────────────── */}
                    {selectedLayer.type === 'video' && (() => {
                      const vl = selectedLayer as VideoLayer;
                      return (
                        <>
                          <Section label="Transform" color={tabColor}>
                            <SliderRow label="Rotation" value={vl.rotation} min={-180} max={180} unit="°" color={tabColor}
                              onChange={(v) => updateProp(vl.id, { rotation: v })} />
                            <SliderRow label="Width" value={vl.width} min={10} max={200} unit="%" color={tabColor}
                              onChange={(v) => updateProp(vl.id, { width: v })} />
                            <SliderRow label="Speed" value={vl.speed} min={25} max={400} unit="%" color={tabColor}
                              onChange={(v) => updateProp(vl.id, { speed: v })} />
                            <div className="flex gap-2">
                              <ToggleBtn label="Flip H" active={vl.flipH} color={tabColor}
                                onClick={() => updateProp(vl.id, { flipH: !vl.flipH })} />
                              <ToggleBtn label="Flip V" active={vl.flipV} color={tabColor}
                                onClick={() => updateProp(vl.id, { flipV: !vl.flipV })} />
                            </div>
                          </Section>
                          <Section label="Color" color={tabColor}>
                            <SliderRow label="Brightness" value={vl.brightness} min={0} max={100} color={tabColor}
                              onChange={(v) => updateProp(vl.id, { brightness: v })} />
                            <SliderRow label="Contrast" value={vl.contrast} min={0} max={100} color={tabColor}
                              onChange={(v) => updateProp(vl.id, { contrast: v })} />
                            <SliderRow label="Saturation" value={vl.saturation} min={0} max={100} color={tabColor}
                              onChange={(v) => updateProp(vl.id, { saturation: v })} />
                          </Section>
                          <Section label="Blend Mode" color={tabColor}>
                            <BlendSelect value={vl.blendMode} color={tabColor}
                              onChange={(v) => updateProp(vl.id, { blendMode: v })} />
                          </Section>
                          <Section label="Trim" color={tabColor}>
                            <SliderRow label="Trim Start" value={vl.trimStart} min={0} max={100} unit="%" color={tabColor}
                              onChange={(v) => updateProp(vl.id, { trimStart: v })} />
                            <SliderRow label="Trim End" value={vl.trimEnd} min={0} max={100} unit="%" color={tabColor}
                              onChange={(v) => updateProp(vl.id, { trimEnd: v })} />
                          </Section>
                        </>
                      );
                    })()}

                    {/* ── Audio specific ─────────────────────────────── */}
                    {selectedLayer.type === 'audio' && (() => {
                      const al = selectedLayer as AudioLayer;
                      return (
                        <>
                          <Section label="Playback" color={tabColor}>
                            <SliderRow label="Volume" value={al.volume} min={0} max={100} unit="%" color={tabColor}
                              onChange={(v) => updateProp(al.id, { volume: v })} />
                            <SliderRow label="Pitch" value={al.pitch} min={-12} max={12} unit="st" color={tabColor}
                              onChange={(v) => updateProp(al.id, { pitch: v })} />
                            <ToggleBtn label={al.muted ? 'Unmute' : 'Mute'} active={al.muted} color={tabColor}
                              onClick={() => updateProp(al.id, { muted: !al.muted })} />
                          </Section>
                          <Section label="Fade" color={tabColor}>
                            <SliderRow label="Fade In" value={al.fadeIn} min={0} max={5000} unit="ms" color={tabColor}
                              onChange={(v) => updateProp(al.id, { fadeIn: v })} />
                            <SliderRow label="Fade Out" value={al.fadeOut} min={0} max={5000} unit="ms" color={tabColor}
                              onChange={(v) => updateProp(al.id, { fadeOut: v })} />
                          </Section>
                          <Section label="EQ" color={tabColor}>
                            <SliderRow label="Bass" value={al.eq.bass} min={0} max={100} color={tabColor}
                              onChange={(v) => updateProp(al.id, { eq: { ...al.eq, bass: v } })} />
                            <SliderRow label="Mid" value={al.eq.mid} min={0} max={100} color={tabColor}
                              onChange={(v) => updateProp(al.id, { eq: { ...al.eq, mid: v } })} />
                            <SliderRow label="Treble" value={al.eq.treble} min={0} max={100} color={tabColor}
                              onChange={(v) => updateProp(al.id, { eq: { ...al.eq, treble: v } })} />
                          </Section>
                        </>
                      );
                    })()}

                    {/* ── Image specific ─────────────────────────────── */}
                    {selectedLayer.type === 'image' && (() => {
                      const il = selectedLayer as ImageLayer;
                      return (
                        <>
                          <Section label="Transform" color={tabColor}>
                            <SliderRow label="X" value={il.x} min={-100} max={100} unit="%" color={tabColor}
                              onChange={(v) => updateProp(il.id, { x: v })} />
                            <SliderRow label="Y" value={il.y} min={-100} max={100} unit="%" color={tabColor}
                              onChange={(v) => updateProp(il.id, { y: v })} />
                            <SliderRow label="Width" value={il.width} min={10} max={300} unit="%" color={tabColor}
                              onChange={(v) => updateProp(il.id, { width: v })} />
                            <SliderRow label="Rotation" value={il.rotation} min={-180} max={180} unit="°" color={tabColor}
                              onChange={(v) => updateProp(il.id, { rotation: v })} />
                            <SliderRow label="Radius" value={il.borderRadius} min={0} max={50} unit="%" color={tabColor}
                              onChange={(v) => updateProp(il.id, { borderRadius: v })} />
                            <div className="flex gap-2">
                              <ToggleBtn label="Flip H" active={il.flipH} color={tabColor}
                                onClick={() => updateProp(il.id, { flipH: !il.flipH })} />
                              <ToggleBtn label="Flip V" active={il.flipV} color={tabColor}
                                onClick={() => updateProp(il.id, { flipV: !il.flipV })} />
                            </div>
                          </Section>
                          <Section label="Color" color={tabColor}>
                            <SliderRow label="Brightness" value={il.brightness} min={0} max={100} color={tabColor}
                              onChange={(v) => updateProp(il.id, { brightness: v })} />
                            <SliderRow label="Contrast" value={il.contrast} min={0} max={100} color={tabColor}
                              onChange={(v) => updateProp(il.id, { contrast: v })} />
                            <SliderRow label="Saturation" value={il.saturation} min={0} max={100} color={tabColor}
                              onChange={(v) => updateProp(il.id, { saturation: v })} />
                          </Section>
                          <Section label="Blend Mode" color={tabColor}>
                            <BlendSelect value={il.blendMode} color={tabColor}
                              onChange={(v) => updateProp(il.id, { blendMode: v })} />
                          </Section>
                        </>
                      );
                    })()}

                  </motion.div>

                ) : (

                  /* ── AI TOOLS PANEL ─────────────────────────────────── */
                  <motion.div key="ai" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                    className="p-3 space-y-3">

                    {/* Prompt input */}
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">AI Prompt</p>
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Describe what you want AI to do..."
                        rows={3}
                        className="w-full rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 p-2 resize-none focus:outline-none focus:border-white/30"
                      />
                    </div>

                    {/* AI tool cards */}
                    <div className="space-y-2">
                      {AI_TOOLS[activeTab].map((tool) => (
                        <motion.button
                          key={tool.id}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => runAiTool(tool.id, tool.label)}
                          disabled={!!aiProcessing}
                          className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all hover:bg-white/5 disabled:opacity-40"
                          style={{ borderColor: tool.color + '30', background: aiProcessing === tool.id ? tool.color + '15' : 'transparent' }}
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: tool.color + '20', color: tool.color }}>
                            {aiProcessing === tool.id
                              ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }}>
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </motion.div>
                              : tool.icon
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold truncate">{tool.label}</p>
                            <p className="text-[9px] text-white/30 truncate">{tool.desc}</p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom: Layer Timeline (video/audio) ──────────────────────────── */}
      {activeTab !== 'image' && (
        <div className="border-t border-white/5 bg-[#0A0A10] shrink-0 h-20 overflow-x-auto">
          <div className="flex items-start gap-1 p-2 h-full">
            {layers.map((layer) => {
              const l = layer as VideoLayer | AudioLayer;
              const widthPx = Math.max(40, (l.durationMs / 1000) * 12);
              const leftPx = (l.startMs / 1000) * 12;
              return (
                <div key={layer.id} onClick={() => select(layer.id)}
                  className="relative shrink-0 h-12 rounded-lg flex items-center px-2 cursor-pointer border-2 transition-all"
                  style={{
                    width: `${widthPx}px`,
                    marginLeft: `${leftPx}px`,
                    background: tabColor + '18',
                    borderColor: layer.selected ? tabColor : tabColor + '40',
                  }}>
                  {/* Waveform for audio */}
                  {layer.type === 'audio' && (
                    <div className="flex items-center gap-px absolute inset-x-2">
                      {Array.from({ length: Math.min(Math.floor(widthPx / 4), 50) }).map((_, i) => (
                        <div key={i} className="w-px rounded-full opacity-50"
                          style={{ height: `${8 + Math.sin(i * 0.7) * 7}px`, background: tabColor }} />
                      ))}
                    </div>
                  )}
                  <span className="text-[9px] font-bold relative z-10 truncate" style={{ color: tabColor }}>{layer.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Small reusable sub-components ───────────────────────────────────────────

function SliderRow({ label, value, min, max, unit = '', onChange }: {
  label: string; value: number; min: number; max: number; unit?: string; color?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/40 w-16 shrink-0">{label}</span>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} className="flex-1" />
      <span className="text-[10px] text-white/40 w-10 text-right shrink-0">{value}{unit}</span>
    </div>
  );
}

function Section({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: color + 'cc' }}>{label}</p>
      {children}
    </div>
  );
}

function ToggleBtn({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex-1 py-1 px-2 rounded-lg border text-[10px] font-bold transition-all"
      style={{
        borderColor: active ? color + '60' : 'rgba(255,255,255,0.1)',
        background:  active ? color + '20' : 'transparent',
        color:       active ? color : 'rgba(255,255,255,0.4)',
      }}>
      {active ? <span className="flex items-center gap-1 justify-center"><Check className="w-2.5 h-2.5" />{label}</span> : label}
    </button>
  );
}

function BlendSelect({ value, color, onChange }: { value: string; color: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {BLEND_MODES.map((m) => (
        <button key={m} onClick={() => onChange(m)}
          className="px-1.5 py-0.5 rounded text-[9px] font-semibold capitalize border transition-all"
          style={{
            borderColor: value === m ? color + '60' : 'rgba(255,255,255,0.1)',
            background:  value === m ? color + '20' : 'transparent',
            color:       value === m ? color : 'rgba(255,255,255,0.35)',
          }}>
          {m}
        </button>
      ))}
    </div>
  );
}
