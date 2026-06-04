/**
 * CGI / WORLD / ENHANCER / CAMERA / VFX — shared AI image tool pages
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import RxBadge from '@/components/common/RxBadge';
import { aiImage } from '@/services/aiGateway';

interface ToolConfig {
  badge: string;
  title: string;
  subtitle: string;
  placeholder: string;
  styles: string[];
  backPath: string;
  badgeVariant?: 'blue' | 'purple';
}

function AiImageTool({ config }: { config: ToolConfig }) {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState(config.styles[0]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!prompt.trim()) { toast.error('Enter a description'); return; }
    setLoading(true);
    setImageUrl(null);
    try {
      const res = await aiImage(`${style} style: ${prompt}, cinematic quality, 8K, professional`, style);
      setImageUrl(res.image_url);
    } catch {
      toast.error('Generation failed. Model warming up — retry in 20s.');
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `rx_${config.badge.toLowerCase()}_${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(config.backPath)} className="p-2 rounded-lg border border-white/10 hover:border-[#00F2FF]/40 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <RxBadge label={config.badge} variant={config.badgeVariant || 'blue'} />
        <div>
          <h1 className="text-sm font-bold tracking-widest">{config.title}</h1>
          <p className="text-[10px] text-muted-foreground">{config.subtitle}</p>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-[#00F2FF]/20 bg-white/[0.03] space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Style</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {config.styles.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={config.placeholder}
              className="bg-white/5 border-white/10 resize-none text-sm"
              rows={3}
            />
          </div>
          <Button onClick={generate} disabled={loading} className="w-full bg-[#00F2FF]/20 hover:bg-[#00F2FF]/30 border border-[#00F2FF]/40 text-[#00F2FF] font-bold">
            {loading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />GENERATING...</> : 'GENERATE'}
          </Button>
        </motion.div>

        {/* Result */}
        {(imageUrl || loading) && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border border-[#BC13FE]/20 overflow-hidden">
            {loading ? (
              <div className="aspect-video bg-black/40 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-2 border-[#BC13FE] border-t-transparent rounded-full animate-spin" />
                <div className="text-xs text-[#BC13FE] tracking-widest">RENDERING...</div>
                <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-[#00F2FF] to-[#BC13FE]"
                    animate={{ x: ['-100%', '100%'] }} transition={{ duration: 1.5, repeat: Infinity }} />
                </div>
              </div>
            ) : (
              <div className="relative">
                <img src={imageUrl!} alt="Generated" className="w-full" />
                <Button size="sm" onClick={download}
                  className="absolute top-2 right-2 bg-black/70 border border-white/20 text-white text-xs h-7">
                  <Download className="w-3 h-3 mr-1" />Save
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export function CgiGenerator() {
  return <AiImageTool config={{
    badge: 'CGI', title: 'CGI GENERATOR', subtitle: 'HuggingFace SDXL · Scene Generation',
    placeholder: 'Futuristic cityscape at night with neon reflections on wet streets...',
    styles: ['Realistic', 'Sci-Fi', 'Fantasy', 'Cartoon', 'Anime', 'Noir'],
    backPath: '/rx-studio/tools'
  }} />;
}

export function WorldGenerator() {
  return <AiImageTool config={{
    badge: 'WORLD', title: 'WORLD GENERATOR', subtitle: 'HuggingFace SDXL · Environment Art',
    placeholder: 'Ancient alien temple deep in a bioluminescent jungle...',
    styles: ['Cinematic', 'Fantasy', 'Sci-Fi', 'Realistic', 'Painterly', 'Dystopian'],
    backPath: '/rx-studio/tools', badgeVariant: 'purple'
  }} />;
}

export function NeuralEnhancer() {
  return <AiImageTool config={{
    badge: 'ENHANCE', title: 'NEURAL ENHANCER', subtitle: 'HuggingFace · 4K AI Upscaling',
    placeholder: 'Describe the enhanced image output — e.g., ultra-sharp portrait, 4K detail...',
    styles: ['Ultra-Realistic', 'HDR', 'Cinematic 4K', 'Studio Photography'],
    backPath: '/rx-studio/tools'
  }} />;
}

export function VfxLab() {
  return <AiImageTool config={{
    badge: 'VFX', title: 'VFX LAB', subtitle: 'AI Visual Effects Generation',
    placeholder: 'Massive explosion inside a cathedral, smoke and debris, golden light rays...',
    styles: ['Explosion', 'Fire', 'Lightning', 'Rain', 'Smoke', 'Hologram', 'Portal'],
    backPath: '/rx-studio/tools', badgeVariant: 'purple'
  }} />;
}
