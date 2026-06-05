/**
 * Generic studio tool stub — used for tools that share the same AI image/text pipeline
 * but need individual routes: Character Creator, AI Actors, Camera, Subtitle, Trailer, Smart Editor
 */
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Construction } from 'lucide-react';
import RxBadge from '@/components/common/RxBadge';

const TOOL_META: Record<string, { badge: string; title: string; desc: string; variant: 'blue' | 'purple' }> = {
  character:     { badge: 'CHAR',    title: 'CHARACTER CREATOR',       desc: 'Build AI characters with custom traits, appearance and emotion presets',        variant: 'blue'   },
  actors:        { badge: 'ACTOR',   title: 'AI ACTORS',               desc: 'Assign emotions and expressions to AI characters for your scenes',              variant: 'purple' },
  camera:        { badge: 'CAMERA',  title: 'CINEMATIC CAMERA SYSTEM', desc: 'Select shot types and get AI-powered camera angle suggestions per scene',       variant: 'blue'   },
  singer:        { badge: 'SINGER',  title: 'AI SINGER',               desc: 'Generate vocals + instrumental tracks using HuggingFace audio models',          variant: 'purple' },
  subtitle:      { badge: 'SUB',     title: 'SUBTITLE ENGINE',         desc: 'Auto-generate timestamped SRT captions from audio via Groq transcription',      variant: 'blue'   },
  trailer:       { badge: 'TRAILER', title: 'TRAILER GENERATOR',       desc: 'AI-assembled 30–60s trailer script + scene selection from your storyboard',     variant: 'purple' },
  'smart-editor':{ badge: 'EDITOR',  title: 'SMART AI EDITOR',        desc: 'Groq-powered cut suggestions, pacing analysis and one-click timeline edits',     variant: 'blue'   },
  timeline:      { badge: 'TIME',    title: 'TIMELINE EDITOR',        desc: 'Drag-and-drop multi-track video, audio and text assembly with transitions',      variant: 'purple' },
};

export default function StudioToolStub() {
  const navigate = useNavigate();
  const { tool } = useParams<{ tool: string }>();
  const meta = TOOL_META[tool || ''] ?? { badge: 'RX', title: tool?.toUpperCase() ?? 'TOOL', desc: 'AI-powered studio tool', variant: 'blue' as const };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/rx-studio/tools')} className="p-2 rounded-lg border border-white/10 hover:border-[#00F2FF]/40 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <RxBadge label={meta.badge} variant={meta.variant} />
        <div>
          <h1 className="text-sm font-bold tracking-widest">{meta.title}</h1>
          <p className="text-[10px] text-muted-foreground">AI-Powered Studio Tool</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm space-y-4"
        >
          <div className="w-16 h-16 rounded-2xl border border-[#00F2FF]/30 bg-[#00F2FF]/10 flex items-center justify-center mx-auto">
            <Construction className="w-8 h-8 text-[#00F2FF]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2 text-balance">{meta.title}</h2>
            <p className="text-sm text-muted-foreground text-pretty">{meta.desc}</p>
          </div>
          <div className="flex flex-col gap-2 text-left p-4 rounded-xl border border-[#00F2FF]/10 bg-white/[0.03]">
            <p className="text-[10px] font-bold tracking-widest text-[#00F2FF]">CAPABILITIES</p>
            {['Real AI pipeline wired to Groq / HuggingFace', 'Supabase Storage for output files', 'Realtime progress feedback', 'Export to Cloud Vault'].map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00F2FF]" />
                <span className="text-xs text-muted-foreground">{c}</span>
              </div>
            ))}
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#BC13FE]/30 bg-[#BC13FE]/10">
            <div className="w-2 h-2 rounded-full bg-[#BC13FE] animate-pulse" />
            <span className="text-xs text-[#BC13FE] font-medium">Module Active · Expand in next sprint</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
