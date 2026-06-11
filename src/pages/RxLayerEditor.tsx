/**
 * RACE-X Layer Editor — Mobile-first responsive
 * <640px  : single column, collapsible layers drawer
 * 640-1024px: tablet, preview + side panel
 * ≥1024px : full 3-column desktop layout
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Plus, Trash2, Eye, EyeOff, Lock, Unlock,
  ChevronUp, ChevronDown,
  Film, Music, Image as ImageIcon,
  Wand2, Layers, Sparkles, Zap,
  Download, Undo2, Redo2, Copy, Check,
  Mic, Palette, SunMedium,
  Maximize2, RefreshCw, Star, Upload, PanelBottomOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type LayerType = 'video' | 'audio' | 'image';
type TabType   = 'video' | 'audio' | 'image';

interface BaseLayer {
  id: string; type: LayerType; name: string;
  visible: boolean; locked: boolean; opacity: number; selected: boolean;
}
interface VideoLayer extends BaseLayer {
  type: 'video'; src: string | null;
  startMs: number; durationMs: number; trimStart: number; trimEnd: number;
  brightness: number; contrast: number; saturation: number; blendMode: string;
  speed: number; flipH: boolean; flipV: boolean; rotation: number;
  x: number; y: number; width: number; height: number;
}
interface AudioLayer extends BaseLayer {
  type: 'audio'; src: string | null;
  startMs: number; durationMs: number;
  volume: number; fadeIn: number; fadeOut: number; pitch: number;
  eq: { bass: number; mid: number; treble: number }; muted: boolean;
}
interface ImageLayer extends BaseLayer {
  type: 'image'; src: string | null;
  x: number; y: number; width: number; height: number;
  rotation: number; flipH: boolean; flipV: boolean;
  brightness: number; contrast: number; saturation: number;
  blendMode: string; borderRadius: number;
}
type Layer = VideoLayer | AudioLayer | ImageLayer;

// ─── Factories ────────────────────────────────────────────────────────────────

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

const BLEND_MODES = ['normal','multiply','screen','overlay','darken','lighten','color-dodge','hard-light','difference'];

// ─── AI Tools ─────────────────────────────────────────────────────────────────

const AI_TOOLS: Record<LayerType, { id: string; label: string; icon: React.ReactNode; color: string; desc: string }[]> = {
  video: [
    { id: 'upscale',     label: 'AI Upscale',        icon: <Maximize2 className="w-4 h-4" />, color: '#00F2FF', desc: 'Enhance to 4K using ESRGAN' },
    { id: 'colorgrade',  label: 'AI Color Grade',    icon: <Palette   className="w-4 h-4" />, color: '#BC13FE', desc: 'Cinematic LUT via Stable Diffusion' },
    { id: 'removebg',    label: 'Remove Background', icon: <Layers    className="w-4 h-4" />, color: '#00FF88', desc: 'Frame-by-frame BG removal' },
    { id: 'slowmo',      label: 'AI Slow Motion',    icon: <RefreshCw className="w-4 h-4" />, color: '#F59E0B', desc: 'RIFE frame interpolation 4× / 8×' },
    { id: 'denoise',     label: 'Denoise Video',     icon: <Sparkles  className="w-4 h-4" />, color: '#A78BFA', desc: 'Remove grain & noise (DeepDenoise)' },
    { id: 'faceenhance', label: 'Face Enhance',      icon: <Star      className="w-4 h-4" />, color: '#EC4899', desc: 'Restore & sharpen faces (GFPGAN)' },
    { id: 'autoedit',    label: 'AI Auto Edit',      icon: <Zap       className="w-4 h-4" />, color: '#FFD700', desc: 'Smart cut to music beat' },
    { id: 'style',       label: 'Style Transfer',    icon: <Wand2     className="w-4 h-4" />, color: '#FB923C', desc: 'Anime / Cinematic / Painting style' },
  ],
  audio: [
    { id: 'denoise',   label: 'Noise Removal',   icon: <Sparkles className="w-4 h-4" />, color: '#00F2FF', desc: 'Remove background hiss & hum' },
    { id: 'enhance',   label: 'Voice Enhance',   icon: <Mic      className="w-4 h-4" />, color: '#BC13FE', desc: 'Boost clarity, EQ & presence' },
    { id: 'clone',     label: 'Voice Clone',     icon: <Copy     className="w-4 h-4" />, color: '#00FF88', desc: 'Clone voice with ElevenLabs' },
    { id: 'musicgen',  label: 'Generate Music',  icon: <Music    className="w-4 h-4" />, color: '#F59E0B', desc: 'HuggingFace MusicGen full track' },
    { id: 'separate',  label: 'Stem Separator',  icon: <Layers   className="w-4 h-4" />, color: '#A78BFA', desc: 'Split vocals / drums / bass / other' },
    { id: 'lyrics',    label: 'AI Lyrics',       icon: <Wand2    className="w-4 h-4" />, color: '#EC4899', desc: 'Generate lyrics from prompt' },
    { id: 'beatmatch', label: 'Beat Sync',       icon: <Zap      className="w-4 h-4" />, color: '#FFD700', desc: 'Auto-sync audio to video beats' },
    { id: 'tts',       label: 'Text to Speech',  icon: <Mic      className="w-4 h-4" />, color: '#FB923C', desc: 'Bark / ElevenLabs voice synth' },
  ],
  image: [
    { id: 'generate',  label: 'AI Generate',      icon: <Wand2     className="w-4 h-4" />, color: '#00F2FF', desc: 'Generate from prompt (SDXL)' },
    { id: 'enhance',   label: 'AI Enhance',       icon: <Star      className="w-4 h-4" />, color: '#BC13FE', desc: 'Upscale + detail (RealESRGAN)' },
    { id: 'removebg',  label: 'Remove BG',        icon: <Layers    className="w-4 h-4" />, color: '#00FF88', desc: 'Transparent BG in one click' },
    { id: 'inpaint',   label: 'AI Inpaint',       icon: <Palette   className="w-4 h-4" />, color: '#F59E0B', desc: 'Erase & fill with AI (Stable Diffusion)' },
    { id: 'style',     label: 'Style Transfer',   icon: <Sparkles  className="w-4 h-4" />, color: '#A78BFA', desc: 'Apply artistic style (IP-Adapter)' },
    { id: 'expand',    label: 'AI Expand',        icon: <Maximize2 className="w-4 h-4" />, color: '#EC4899', desc: 'Outpainting (extend canvas)' },
    { id: 'relight',   label: 'AI Relight',       icon: <SunMedium className="w-4 h-4" />, color: '#FFD700', desc: 'Change lighting direction & mood' },
    { id: 'img2img',   label: 'Image-to-Image',   icon: <RefreshCw className="w-4 h-4" />, color: '#FB923C', desc: 'Transform with SDXL img2img' },
  ],
};

const TABS: { id: TabType; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'video', label: 'Video', icon: <Film      className="w-4 h-4" />, color: '#4F46E5' },
  { id: 'audio', label: 'Audio', icon: <Music     className="w-4 h-4" />, color: '#059669' },
  { id: 'image', label: 'Image', icon: <ImageIcon className="w-4 h-4" />, color: '#D97706' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RxLayerEditor() {
  const navigate  = useNavigate();
  const fileRef   = useRef<HTMLInputElement>(null);

  const [activeTab,      setActiveTab]      = useState<TabType>('video');
  const [activePanel,    setActivePanel]    = useState<'manual' | 'ai'>('manual');
  const [videoLayers,    setVideoLayers]    = useState<VideoLayer[]>([makeVideo(1), makeVideo(2)]);
  const [audioLayers,    setAudioLayers]    = useState<AudioLayer[]>([makeAudio(1)]);
  const [imageLayers,    setImageLayers]    = useState<ImageLayer[]>([makeImage(1)]);
  const [aiProcessing,   setAiProcessing]   = useState<string | null>(null);
  const [aiPrompt,       setAiPrompt]       = useState('');
  const [layersOpen,     setLayersOpen]     = useState(false);   // mobile drawer
  const [propsOpen,      setPropsOpen]      = useState(true);    // mobile props panel

  // ── Computed ────────────────────────────────────────────────────────────

  const layers = activeTab === 'video' ? videoLayers
    : activeTab === 'audio' ? audioLayers : imageLayers;

  const selectedLayer = layers.find((l) => l.selected) ?? null;
  const tabColor = TABS.find((t) => t.id === activeTab)?.color ?? '#4F46E5';

  const countFor = (t: TabType) =>
    t === 'video' ? videoLayers.length : t === 'audio' ? audioLayers.length : imageLayers.length;

  // ── Mutations ───────────────────────────────────────────────────────────

  const setLayers = (fn: (prev: Layer[]) => Layer[]) => {
    if      (activeTab === 'video') setVideoLayers(fn as (p: VideoLayer[]) => VideoLayer[]);
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
      const a = [...prev]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a as Layer[];
    });

  const moveDown = (id: string) =>
    setLayers((prev) => {
      const i = prev.findIndex((l) => l.id === id);
      if (i >= prev.length - 1) return prev;
      const a = [...prev]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a as Layer[];
    });

  const updateProp = <T extends Layer>(id: string, patch: Partial<T>) =>
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l) as Layer[]);

  const addLayer = () => {
    if      (activeTab === 'video') setVideoLayers((p) => [...p, makeVideo(p.length + 1)]);
    else if (activeTab === 'audio') setAudioLayers((p) => [...p, makeAudio(p.length + 1)]);
    else                            setImageLayers((p) => [...p, makeImage(p.length + 1)]);
    toast.success(`New ${activeTab} layer added`);
  };

  const runAiTool = (toolId: string, toolLabel: string) => {
    setAiProcessing(toolId);
    setTimeout(() => { setAiProcessing(null); toast.success(`${toolLabel} applied`); }, 2200);
  };

  // ── Sub-renders ─────────────────────────────────────────────────────────

  const LayerList = () => (
    <div className="flex-1 overflow-y-auto space-y-1 p-1.5 min-h-0">
      {[...layers].reverse().map((layer) => (
        <motion.div key={layer.id} layout
          onClick={() => { select(layer.id); setLayersOpen(false); setPropsOpen(true); }}
          className="group rounded-xl px-2.5 py-2 cursor-pointer border transition-all"
          style={{
            borderColor: layer.selected ? tabColor + '60' : 'rgba(255,255,255,0.06)',
            background:  layer.selected ? tabColor + '12' : 'transparent',
          }}
        >
          {/* Name row */}
          <div className="flex items-center gap-2 mb-2 min-w-0">
            <div className="w-4 h-4 rounded shrink-0 flex items-center justify-center"
              style={{ background: tabColor + '30' }}>
              {activeTab === 'video' && <Film      className="w-2.5 h-2.5" style={{ color: tabColor }} />}
              {activeTab === 'audio' && <Music     className="w-2.5 h-2.5" style={{ color: tabColor }} />}
              {activeTab === 'image' && <ImageIcon className="w-2.5 h-2.5" style={{ color: tabColor }} />}
            </div>
            <span className="text-xs font-semibold truncate flex-1 min-w-0">{layer.name}</span>
            {layer.selected && <Check className="w-3 h-3 shrink-0" style={{ color: tabColor }} />}
          </div>

          {/* Action row */}
          <div className="flex items-center gap-1.5">
            <button onClick={(e) => { e.stopPropagation(); toggle(layer.id, 'visible'); }}
              className="p-1 rounded text-white/30 hover:text-white transition-colors touch-manipulation">
              {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-white/20" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); toggle(layer.id, 'locked'); }}
              className="p-1 rounded text-white/30 hover:text-white transition-colors touch-manipulation">
              {layer.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
            <div className="flex gap-0.5 ml-auto">
              <button onClick={(e) => { e.stopPropagation(); moveUp(layer.id); }}
                className="p-1 rounded text-white/20 hover:text-white touch-manipulation">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); moveDown(layer.id); }}
                className="p-1 rounded text-white/20 hover:text-white touch-manipulation">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <button onClick={(e) => { e.stopPropagation(); remove(layer.id); }}
              className="p-1 rounded text-white/20 hover:text-red-400 transition-colors touch-manipulation ml-1">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Opacity bar */}
          <div className="mt-2 h-0.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${layer.opacity}%`, background: tabColor }} />
          </div>
        </motion.div>
      ))}
    </div>
  );

  const PropertiesContent = () => (
    <div className="overflow-y-auto min-h-0">
      {/* Manual / AI switcher */}
      <div className="flex border-b border-white/5 shrink-0">
        {(['manual', 'ai'] as const).map((p) => (
          <button key={p} onClick={() => setActivePanel(p)}
            className={`flex-1 py-2.5 text-xs font-bold capitalize transition-all border-b-2 ${
              activePanel === p ? 'border-current' : 'border-transparent text-white/30'
            }`}
            style={{ color: activePanel === p ? tabColor : undefined }}>
            {p === 'manual' ? '⚙️ Manual' : '✨ AI Tools'}
          </button>
        ))}
      </div>

      {!selectedLayer ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-xs text-white/20 text-center px-4">Select a layer to edit its properties</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activePanel === 'manual' ? (
            <motion.div key="manual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-3 space-y-5">

              {/* Layer name */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Layer Name</p>
                <Input value={selectedLayer.name}
                  onChange={(e) => updateProp(selectedLayer.id, { name: e.target.value })}
                  className="h-9 text-sm bg-white/5 border-white/10 text-white w-full" />
              </div>

              {/* Upload */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Source File</p>
                <input ref={fileRef} type="file"
                  accept={activeTab === 'video' ? 'video/*' : activeTab === 'audio' ? 'audio/*' : 'image/*'}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { const url = URL.createObjectURL(f); updateProp(selectedLayer.id, { src: url, name: f.name.split('.')[0] }); toast.success('Media loaded'); }
                  }} />
                <button onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed text-sm font-semibold hover:bg-white/5 transition-colors active:scale-95"
                  style={{ borderColor: tabColor + '50', color: tabColor }}>
                  <Upload className="w-4 h-4" />
                  {(selectedLayer as VideoLayer).src ? 'Replace File' : 'Upload File'}
                </button>
              </div>

              {/* Opacity */}
              <PropSection label="Opacity" color={tabColor}>
                <SliderRow label="Opacity" value={selectedLayer.opacity} min={0} max={100} unit="%" onChange={(v) => updateProp(selectedLayer.id, { opacity: v })} />
              </PropSection>

              {/* ── VIDEO ── */}
              {selectedLayer.type === 'video' && (() => {
                const vl = selectedLayer as VideoLayer;
                return (
                  <>
                    <PropSection label="Transform" color={tabColor}>
                      <SliderRow label="Rotation" value={vl.rotation} min={-180} max={180} unit="°" onChange={(v) => updateProp(vl.id, { rotation: v })} />
                      <SliderRow label="Width"    value={vl.width}    min={10}   max={200} unit="%" onChange={(v) => updateProp(vl.id, { width: v })} />
                      <SliderRow label="Speed"    value={vl.speed}    min={25}   max={400} unit="%" onChange={(v) => updateProp(vl.id, { speed: v })} />
                      <div className="flex gap-2 pt-1">
                        <ToggleBtn label="Flip H" active={vl.flipH} color={tabColor} onClick={() => updateProp(vl.id, { flipH: !vl.flipH })} />
                        <ToggleBtn label="Flip V" active={vl.flipV} color={tabColor} onClick={() => updateProp(vl.id, { flipV: !vl.flipV })} />
                      </div>
                    </PropSection>
                    <PropSection label="Color" color={tabColor}>
                      <SliderRow label="Brightness" value={vl.brightness} min={0} max={100} onChange={(v) => updateProp(vl.id, { brightness: v })} />
                      <SliderRow label="Contrast"   value={vl.contrast}   min={0} max={100} onChange={(v) => updateProp(vl.id, { contrast: v })} />
                      <SliderRow label="Saturation" value={vl.saturation} min={0} max={100} onChange={(v) => updateProp(vl.id, { saturation: v })} />
                    </PropSection>
                    <PropSection label="Blend Mode" color={tabColor}>
                      <BlendGrid value={vl.blendMode} color={tabColor} onChange={(v) => updateProp(vl.id, { blendMode: v })} />
                    </PropSection>
                    <PropSection label="Trim" color={tabColor}>
                      <SliderRow label="Start" value={vl.trimStart} min={0} max={100} unit="%" onChange={(v) => updateProp(vl.id, { trimStart: v })} />
                      <SliderRow label="End"   value={vl.trimEnd}   min={0} max={100} unit="%" onChange={(v) => updateProp(vl.id, { trimEnd: v })} />
                    </PropSection>
                  </>
                );
              })()}

              {/* ── AUDIO ── */}
              {selectedLayer.type === 'audio' && (() => {
                const al = selectedLayer as AudioLayer;
                return (
                  <>
                    <PropSection label="Playback" color={tabColor}>
                      <SliderRow label="Volume" value={al.volume} min={0} max={100} unit="%" onChange={(v) => updateProp(al.id, { volume: v })} />
                      <SliderRow label="Pitch"  value={al.pitch}  min={-12} max={12} unit="st" onChange={(v) => updateProp(al.id, { pitch: v })} />
                      <div className="pt-1">
                        <ToggleBtn label={al.muted ? 'Unmute' : 'Mute'} active={al.muted} color={tabColor} onClick={() => updateProp(al.id, { muted: !al.muted })} />
                      </div>
                    </PropSection>
                    <PropSection label="Fade" color={tabColor}>
                      <SliderRow label="Fade In"  value={al.fadeIn}  min={0} max={5000} unit="ms" onChange={(v) => updateProp(al.id, { fadeIn: v })} />
                      <SliderRow label="Fade Out" value={al.fadeOut} min={0} max={5000} unit="ms" onChange={(v) => updateProp(al.id, { fadeOut: v })} />
                    </PropSection>
                    <PropSection label="EQ" color={tabColor}>
                      <SliderRow label="Bass"   value={al.eq.bass}   min={0} max={100} onChange={(v) => updateProp(al.id, { eq: { ...al.eq, bass: v } })} />
                      <SliderRow label="Mid"    value={al.eq.mid}    min={0} max={100} onChange={(v) => updateProp(al.id, { eq: { ...al.eq, mid: v } })} />
                      <SliderRow label="Treble" value={al.eq.treble} min={0} max={100} onChange={(v) => updateProp(al.id, { eq: { ...al.eq, treble: v } })} />
                    </PropSection>
                  </>
                );
              })()}

              {/* ── IMAGE ── */}
              {selectedLayer.type === 'image' && (() => {
                const il = selectedLayer as ImageLayer;
                return (
                  <>
                    <PropSection label="Transform" color={tabColor}>
                      <SliderRow label="X"        value={il.x}            min={-100} max={100} unit="%" onChange={(v) => updateProp(il.id, { x: v })} />
                      <SliderRow label="Y"        value={il.y}            min={-100} max={100} unit="%" onChange={(v) => updateProp(il.id, { y: v })} />
                      <SliderRow label="Width"    value={il.width}        min={10}   max={300} unit="%" onChange={(v) => updateProp(il.id, { width: v })} />
                      <SliderRow label="Rotation" value={il.rotation}     min={-180} max={180} unit="°" onChange={(v) => updateProp(il.id, { rotation: v })} />
                      <SliderRow label="Radius"   value={il.borderRadius} min={0}    max={50}  unit="%" onChange={(v) => updateProp(il.id, { borderRadius: v })} />
                      <div className="flex gap-2 pt-1">
                        <ToggleBtn label="Flip H" active={il.flipH} color={tabColor} onClick={() => updateProp(il.id, { flipH: !il.flipH })} />
                        <ToggleBtn label="Flip V" active={il.flipV} color={tabColor} onClick={() => updateProp(il.id, { flipV: !il.flipV })} />
                      </div>
                    </PropSection>
                    <PropSection label="Color" color={tabColor}>
                      <SliderRow label="Brightness" value={il.brightness} min={0} max={100} onChange={(v) => updateProp(il.id, { brightness: v })} />
                      <SliderRow label="Contrast"   value={il.contrast}   min={0} max={100} onChange={(v) => updateProp(il.id, { contrast: v })} />
                      <SliderRow label="Saturation" value={il.saturation} min={0} max={100} onChange={(v) => updateProp(il.id, { saturation: v })} />
                    </PropSection>
                    <PropSection label="Blend Mode" color={tabColor}>
                      <BlendGrid value={il.blendMode} color={tabColor} onChange={(v) => updateProp(il.id, { blendMode: v })} />
                    </PropSection>
                  </>
                );
              })()}
            </motion.div>
          ) : (
            /* ── AI PANEL ── */
            <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-3 space-y-3">
              <div className="space-y-1.5">
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">AI Prompt</p>
                <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe what you want AI to do…"
                  rows={3}
                  className="w-full rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 p-2.5 resize-none focus:outline-none focus:border-white/30" />
              </div>
              <div className="space-y-2">
                {AI_TOOLS[activeTab].map((tool) => (
                  <motion.button key={tool.id} whileTap={{ scale: 0.97 }}
                    onClick={() => runAiTool(tool.id, tool.label)}
                    disabled={!!aiProcessing}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:bg-white/5 active:bg-white/10 disabled:opacity-40 touch-manipulation"
                    style={{ borderColor: tool.color + '30', background: aiProcessing === tool.id ? tool.color + '15' : 'transparent' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: tool.color + '20', color: tool.color }}>
                      {aiProcessing === tool.id
                        ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }}><RefreshCw className="w-4 h-4" /></motion.div>
                        : tool.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold">{tool.label}</p>
                      <p className="text-[10px] text-white/30 truncate">{tool.desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );

  const TimelineSection = () => (
    activeTab !== 'image' ? (
      <div className="border-t border-white/5 bg-[#0A0A10] shrink-0">
        <div className="overflow-x-auto overflow-y-hidden" style={{ height: '72px' }}>
          <div className="flex items-center gap-1.5 px-3 h-full" style={{ minWidth: 'max-content' }}>
            {layers.map((layer) => {
              const l = layer as VideoLayer | AudioLayer;
              const widthPx = Math.max(60, (l.durationMs / 1000) * 10);
              return (
                <div key={layer.id} onClick={() => select(layer.id)}
                  className="relative shrink-0 h-12 rounded-lg flex items-center px-2 cursor-pointer border-2 transition-all touch-manipulation"
                  style={{
                    width: `${widthPx}px`,
                    background: tabColor + '18',
                    borderColor: layer.selected ? tabColor : tabColor + '40',
                  }}>
                  {layer.type === 'audio' && (
                    <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center gap-px">
                      {Array.from({ length: Math.min(Math.floor(widthPx / 4), 40) }).map((_, i) => (
                        <div key={i} className="w-px rounded-full opacity-50"
                          style={{ height: `${8 + Math.sin(i * 0.7) * 6}px`, background: tabColor }} />
                      ))}
                    </div>
                  )}
                  <span className="text-[10px] font-bold relative z-10 truncate" style={{ color: tabColor }}>{layer.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    ) : null
  );

  // ── Main render ─────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-[#0A0A0F] flex flex-col overflow-x-hidden text-white">

      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/rx-studio/editor')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm font-black leading-tight truncate" style={{ color: tabColor }}>Layer Editor</h1>
            <p className="text-[10px] text-white/30">Video · Audio · Image</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/30 hover:text-white"><Undo2 className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/30 hover:text-white"><Redo2 className="w-3.5 h-3.5" /></Button>
          <Button size="sm" className="h-7 px-3 ml-1 text-xs font-bold rounded-full text-white shrink-0"
            style={{ background: tabColor }}
            onClick={() => toast.success('Project exported!')}>
            <Download className="w-3 h-3 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* ── Type Tabs (scrollable on mobile) ─────────────────────────────── */}
      <div className="flex border-b border-white/5 shrink-0 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap px-2 ${
              activeTab === tab.id ? 'border-current' : 'border-transparent text-white/30 hover:text-white/60'
            }`}
            style={{ color: activeTab === tab.id ? tab.color : undefined }}>
            {tab.icon}
            <span>{tab.label}</span>
            <span className="text-[9px] opacity-60">({countFor(tab.id)})</span>
          </button>
        ))}
      </div>

      {/* ── Desktop: 3-column | Tablet: preview+props | Mobile: stacked ── */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT: Layer Stack — sidebar on lg, hidden/drawer on mobile ── */}
        <div className="hidden lg:flex lg:w-48 xl:w-52 shrink-0 border-r border-white/5 flex-col bg-[#0D0D15] min-h-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Layers</span>
            <button onClick={addLayer}
              className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <LayerList />
        </div>

        {/* ── CENTER: Preview + mobile layer drawer trigger ────────────── */}
        <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">

          {/* Mobile layer toggle bar */}
          <div className="lg:hidden flex items-center justify-between px-3 py-1.5 bg-[#0D0D15] border-b border-white/5 shrink-0">
            <button onClick={() => setLayersOpen(!layersOpen)}
              className="flex items-center gap-2 text-xs font-semibold py-1 px-2 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: tabColor }}>
              <PanelBottomOpen className="w-3.5 h-3.5" />
              Layers ({layers.length})
              {layersOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button onClick={addLayer}
              className="flex items-center gap-1 text-xs py-1 px-2 rounded-lg border text-white/50 hover:text-white border-white/10 hover:bg-white/5">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          {/* Mobile collapsible layer drawer */}
          <AnimatePresence>
            {layersOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="lg:hidden bg-[#0D0D15] border-b border-white/10 overflow-hidden shrink-0"
                style={{ maxHeight: '40vh' }}>
                <div className="overflow-y-auto" style={{ maxHeight: '40vh' }}>
                  <LayerList />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Canvas preview */}
          <div className="flex-1 flex items-center justify-center bg-black relative overflow-hidden min-h-0">
            <div className="relative w-full h-full flex items-center justify-center p-2">
              <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#1a0533] to-[#0a0a1f] border border-white/5"
                style={{ aspectRatio: '9/16', maxHeight: '100%', maxWidth: '100%', height: '100%', width: 'auto' }}>

                {/* Image layers */}
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

                {/* Video placeholder */}
                {videoLayers.filter((l) => l.visible).length > 0 && !imageLayers.some((l) => l.src && l.visible) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-1">
                      <Film className="w-8 h-8 text-white/10 mx-auto" />
                      <p className="text-[10px] text-white/20">Video Preview</p>
                      <p className="text-[9px] text-white/10">{videoLayers.filter(l=>l.visible).length} layer(s)</p>
                    </div>
                  </div>
                )}

                {/* AI overlay */}
                <AnimatePresence>
                  {aiProcessing && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-3 z-10">
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
            </div>
          </div>
        </div>

        {/* ── RIGHT: Properties panel — sidebar on lg, accordion on mobile ── */}
        <div className="lg:w-56 xl:w-64 shrink-0 border-t lg:border-t-0 lg:border-l border-white/5 bg-[#0D0D15] flex flex-col min-h-0 overflow-hidden">

          {/* Mobile toggle header */}
          <button
            onClick={() => setPropsOpen(!propsOpen)}
            className="lg:hidden flex items-center justify-between px-3 py-2.5 border-b border-white/5 w-full text-left"
          >
            <span className="text-xs font-bold" style={{ color: tabColor }}>
              {selectedLayer ? `✏️ ${selectedLayer.name}` : '✏️ Properties'}
            </span>
            {propsOpen ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
          </button>

          {/* Properties — always visible on desktop, collapsible on mobile */}
          <div className={`flex-col min-h-0 overflow-hidden ${propsOpen ? 'flex' : 'hidden'} lg:flex flex-1`}>
            <div className="flex-1 overflow-y-auto min-h-0">
              <PropertiesContent />
            </div>
          </div>
        </div>
      </div>

      {/* ── Timeline (horizontally scrollable) ───────────────────────────── */}
      <TimelineSection />

    </div>
  );
}

// ─── Reusable sub-components ─────────────────────────────────────────────────

function SliderRow({ label, value, min, max, unit = '', onChange }: {
  label: string; value: number; min: number; max: number; unit?: string; color?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 w-full min-w-0">
      <span className="text-[10px] text-white/40 shrink-0 w-16 leading-none">{label}</span>
      <div className="flex-1 min-w-0">
        <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} className="w-full" />
      </div>
      <span className="text-[10px] text-white/40 w-10 text-right shrink-0 tabular-nums">{value}{unit}</span>
    </div>
  );
}

function PropSection({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: color + 'cc' }}>{label}</p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function ToggleBtn({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex-1 py-1.5 px-2 rounded-lg border text-xs font-bold transition-all active:scale-95 touch-manipulation"
      style={{
        borderColor: active ? color + '60' : 'rgba(255,255,255,0.1)',
        background:  active ? color + '20' : 'transparent',
        color:       active ? color : 'rgba(255,255,255,0.4)',
      }}>
      {active ? <span className="flex items-center gap-1 justify-center"><Check className="w-3 h-3" />{label}</span> : label}
    </button>
  );
}

function BlendGrid({ value, color, onChange }: { value: string; color: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {BLEND_MODES.map((m) => (
        <button key={m} onClick={() => onChange(m)}
          className="px-2 py-1 rounded-lg text-[10px] font-semibold capitalize border transition-all touch-manipulation"
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
