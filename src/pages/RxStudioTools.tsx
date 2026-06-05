/**
 * RX STUDIO TOOLS HUB
 * 20-tool cinematic production suite overview
 */
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  PenTool, Film, User, Users, Mic, Music, Radio, Drum,
  Globe, Camera, Zap, Image, Sparkles, Palette, AlignLeft,
  Type, Clapperboard, Scissors, Cloud, ArrowLeft
} from 'lucide-react';
import RxBadge from '@/components/common/RxBadge';

const TOOLS = [
  { id: 'writer', icon: PenTool, label: 'AI Writer Room', desc: 'Groq script generator', color: '#00F2FF', path: '/rx-studio/writer' },
  { id: 'storyboard', icon: Film, label: 'Storyboard Engine', desc: 'AI visual panels', color: '#BC13FE', path: '/rx-studio/storyboard' },
  { id: 'character', icon: User, label: 'Character Creator', desc: 'AI character builder', color: '#00F2FF', path: '/rx-studio/character' },
  { id: 'actors', icon: Users, label: 'AI Actors', desc: 'Emotion presets', color: '#BC13FE', path: '/rx-studio/actors' },
  { id: 'voice', icon: Mic, label: 'Voice Clone Lab', desc: 'HuggingFace Bark', color: '#00F2FF', path: '/rx-studio/voice' },
  { id: 'singer', icon: Radio, label: 'AI Singer', desc: 'Vocal generation', color: '#BC13FE', path: '/rx-studio/singer' },
  { id: 'composer', icon: Music, label: 'Music Composer', desc: 'MusicGen full tracks', color: '#00F2FF', path: '/rx-studio/composer' },
  { id: 'beat', icon: Drum, label: 'Beat Studio', desc: 'Tone.js sequencer', color: '#BC13FE', path: '/rx-music' },
  { id: 'world', icon: Globe, label: 'World Generator', desc: 'AI environments', color: '#00F2FF', path: '/rx-studio/world' },
  { id: 'camera', icon: Camera, label: 'Cinematic Camera', desc: 'Shot AI suggestions', color: '#BC13FE', path: '/rx-studio/camera' },
  { id: 'vfx', icon: Zap, label: 'VFX Lab', desc: 'Visual effects', color: '#00F2FF', path: '/rx-studio/vfx' },
  { id: 'cgi', icon: Image, label: 'CGI Generator', desc: 'HuggingFace scenes', color: '#BC13FE', path: '/rx-studio/cgi' },
  { id: 'enhancer', icon: Sparkles, label: 'Neural Enhancer', desc: '4K upscaling', color: '#00F2FF', path: '/rx-studio/enhancer' },
  { id: 'color', icon: Palette, label: 'Color Grading Lab', desc: 'Cinematic grades', color: '#BC13FE', path: '/rx-studio/color' },
  { id: 'timeline', icon: AlignLeft, label: 'Timeline Editor', desc: 'Drag-drop assembly', color: '#00F2FF', path: '/rx-studio/timeline' },
  { id: 'subtitle', icon: Type, label: 'Subtitle Engine', desc: 'Auto-captions', color: '#BC13FE', path: '/rx-studio/subtitle' },
  { id: 'trailer', icon: Clapperboard, label: 'Trailer Generator', desc: 'AI trailer assembly', color: '#00F2FF', path: '/rx-studio/trailer' },
  { id: 'editor', icon: Scissors, label: 'Smart AI Editor', desc: 'Groq edit suggestions', color: '#BC13FE', path: '/rx-studio/smart-editor' },
  { id: 'render', icon: Cloud, label: 'Cloud Render Farm', desc: 'Realtime job queue', color: '#00FF88', path: '/rx-studio/render' },
];

export default function RxStudioTools() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/rx-studio')} className="p-2 rounded-lg border border-white/10 hover:border-[#00F2FF]/40 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <RxBadge label="STUDIO" />
        <div>
          <h1 className="text-sm font-bold tracking-widest text-white">PRODUCTION SUITE</h1>
          <p className="text-[10px] text-muted-foreground">19 AI-Powered Tools</p>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {TOOLS.map((tool, i) => {
            const Icon = tool.icon;
            return (
              <motion.button
                key={tool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(tool.path)}
                className="relative text-left p-4 rounded-xl border bg-white/[0.03] hover:bg-white/[0.06] transition-all overflow-hidden group h-full"
                style={{ borderColor: `${tool.color}25` }}
              >
                {/* Glow */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                  style={{ boxShadow: `inset 0 0 20px ${tool.color}15` }}
                />
                <div className="relative">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${tool.color}15`, border: `1px solid ${tool.color}30` }}>
                    <Icon className="w-5 h-5" style={{ color: tool.color }} />
                  </div>
                  <p className="text-xs font-bold text-white leading-tight text-balance">{tool.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{tool.desc}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
