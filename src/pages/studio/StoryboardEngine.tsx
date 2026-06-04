/**
 * STORYBOARD ENGINE — AI scene panel generator
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Film, Plus, Trash2, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import RxBadge from '@/components/common/RxBadge';
import { aiImage } from '@/services/aiGateway';

interface Panel { id: string; prompt: string; imageUrl: string | null; loading: boolean; shotType: string; }

const SHOT_TYPES = ['Close-Up', 'Medium', 'Wide', 'Aerial', 'POV', 'Tracking', 'Dutch Angle'];

export default function StoryboardEngine() {
  const navigate = useNavigate();
  const [panels, setPanels] = useState<Panel[]>([
    { id: '1', prompt: '', imageUrl: null, loading: false, shotType: 'Wide' },
  ]);

  const addPanel = () => {
    if (panels.length >= 8) { toast.error('Max 8 panels per board'); return; }
    setPanels(p => [...p, { id: Date.now().toString(), prompt: '', imageUrl: null, loading: false, shotType: 'Medium' }]);
  };

  const removePanel = (id: string) => setPanels(p => p.filter(x => x.id !== id));

  const updatePanel = (id: string, updates: Partial<Panel>) =>
    setPanels(p => p.map(x => x.id === id ? { ...x, ...updates } : x));

  const generatePanel = async (panel: Panel) => {
    if (!panel.prompt.trim()) { toast.error('Enter scene description'); return; }
    updatePanel(panel.id, { loading: true, imageUrl: null });
    try {
      const res = await aiImage(
        `${panel.shotType} shot: ${panel.prompt}, cinematic, high contrast, film noir lighting, 16:9 aspect ratio, professional cinematography`,
        'realistic'
      );
      updatePanel(panel.id, { imageUrl: res.image_url, loading: false });
    } catch {
      updatePanel(panel.id, { loading: false });
      toast.error('Panel generation failed');
    }
  };

  const generateAll = async () => {
    for (const panel of panels) {
      if (panel.prompt.trim()) await generatePanel(panel);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#BC13FE]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/rx-studio/tools')} className="p-2 rounded-lg border border-white/10 hover:border-[#BC13FE]/40 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <RxBadge label="BOARD" variant="purple" />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold tracking-widest">STORYBOARD ENGINE</h1>
          <p className="text-[10px] text-muted-foreground">HuggingFace SDXL · Visual Panels</p>
        </div>
        <Button size="sm" onClick={generateAll} className="bg-[#BC13FE]/20 hover:bg-[#BC13FE]/30 border border-[#BC13FE]/40 text-[#BC13FE] text-xs shrink-0">
          <RefreshCw className="w-3 h-3 mr-1" />Generate All
        </Button>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {panels.map((panel, i) => (
            <motion.div key={panel.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-[#BC13FE]/20 bg-white/[0.03] overflow-hidden">
              {/* Panel image area */}
              <div className="aspect-video bg-black/40 relative flex items-center justify-center">
                {panel.loading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <div className="w-8 h-8 border-2 border-[#BC13FE] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-[#BC13FE]">RENDERING...</span>
                    <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-[#BC13FE]" animate={{ width: ['0%', '100%'] }} transition={{ duration: 3, repeat: Infinity }} />
                    </div>
                  </div>
                ) : panel.imageUrl ? (
                  <img src={panel.imageUrl} alt={`Panel ${i + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Film className="w-8 h-8 mx-auto mb-1 opacity-30" />
                    <p className="text-[10px]">Panel {i + 1}</p>
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-black/70 text-[10px] text-white px-2 py-0.5 rounded font-mono">
                  SC{String(i + 1).padStart(2, '0')}
                </div>
              </div>
              {/* Controls */}
              <div className="p-3 space-y-2">
                <div className="flex gap-2">
                  <select
                    value={panel.shotType}
                    onChange={(e) => updatePanel(panel.id, { shotType: e.target.value })}
                    className="text-[10px] bg-white/5 border border-white/10 rounded px-2 py-1 text-white shrink-0"
                  >
                    {SHOT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <Input
                    value={panel.prompt}
                    onChange={(e) => updatePanel(panel.id, { prompt: e.target.value })}
                    placeholder="Describe this scene..."
                    className="text-xs h-7 bg-white/5 border-white/10 flex-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => generatePanel(panel)} disabled={panel.loading}
                    className="flex-1 h-7 text-xs bg-[#BC13FE]/20 hover:bg-[#BC13FE]/30 border border-[#BC13FE]/40 text-[#BC13FE]">
                    {panel.loading ? 'Generating...' : 'Generate'}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removePanel(panel.id)}>
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <Button onClick={addPanel} variant="ghost" className="w-full border border-dashed border-white/20 hover:border-[#BC13FE]/40 text-muted-foreground hover:text-[#BC13FE] h-12">
          <Plus className="w-4 h-4 mr-2" />Add Panel
        </Button>
      </div>
    </div>
  );
}
