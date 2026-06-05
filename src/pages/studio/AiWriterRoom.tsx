/**
 * AI WRITER ROOM — Groq streaming script generator
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, PenTool, Download, Save, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import RxBadge from '@/components/common/RxBadge';
import { aiChat } from '@/services/aiGateway';
import { supabase } from '@/db/supabase';

export default function AiWriterRoom() {
  const navigate = useNavigate();
  const [concept, setConcept] = useState('');
  const [genre, setGenre] = useState('');
  const [tone, setTone] = useState('');
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(false);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  const generate = async () => {
    if (!concept.trim()) { toast.error('Enter a story concept'); return; }
    setLoading(true);
    setScript('');
    try {
      const prompt = `Write a professional screenplay for: "${concept}". Genre: ${genre || 'drama'}. Tone: ${tone || 'cinematic'}. 
Include: FADE IN, scene headings (INT./EXT.), action lines, and dialogue. Format as a proper screenplay. 3-5 scenes minimum.`;
      const res = await aiChat(
        [{ role: 'user', content: prompt }],
        'You are a Hollywood screenplay writer. Write professional, production-ready scripts in proper screenplay format.'
      );
      setScript(res.reply);
    } catch {
      toast.error('Script generation failed. Retry.');
    } finally {
      setLoading(false);
    }
  };

  const saveScript = async () => {
    if (!script) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Login required'); return; }
    const blob = new Blob([script], { type: 'text/plain' });
    const file = new File([blob], `script_${Date.now()}.txt`);
    const { error } = await supabase.storage.from('vault').upload(`${user.id}/scripts/${file.name}`, file);
    if (error) toast.error('Save failed');
    else toast.success('Script saved to Cloud Vault');
  };

  const downloadScript = () => {
    if (!script) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([script], { type: 'text/plain' }));
    a.download = `RACE-X_script_${Date.now()}.txt`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/rx-studio/tools')} className="p-2 rounded-lg border border-white/10 hover:border-[#00F2FF]/40 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <RxBadge label="WRITER" />
        <div>
          <h1 className="text-sm font-bold tracking-widest">AI WRITER ROOM</h1>
          <p className="text-[10px] text-muted-foreground">Groq · LLaMA 3.3 70B</p>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Inputs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-[#00F2FF]/20 bg-white/[0.03] space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <PenTool className="w-4 h-4 text-[#00F2FF]" />
            <span className="text-xs font-bold tracking-widest text-[#00F2FF]">SCRIPT PARAMETERS</span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Story Concept *</Label>
            <Textarea
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="A rogue AI awakens in a secret Mars colony and must choose between humanity and its own survival..."
              className="bg-white/5 border-white/10 resize-none text-sm"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Genre</Label>
              <Select onValueChange={setGenre}>
                <SelectTrigger className="bg-white/5 border-white/10 text-sm">
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  {['Sci-Fi', 'Action', 'Drama', 'Horror', 'Comedy', 'Thriller', 'Fantasy', 'Romance'].map(g => (
                    <SelectItem key={g} value={g.toLowerCase()}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tone</Label>
              <Select onValueChange={setTone}>
                <SelectTrigger className="bg-white/5 border-white/10 text-sm">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  {['Cinematic', 'Dark', 'Epic', 'Intimate', 'Satirical', 'Suspenseful', 'Whimsical'].map(t => (
                    <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={generate} disabled={loading} className="w-full bg-[#00F2FF]/20 hover:bg-[#00F2FF]/30 border border-[#00F2FF]/40 text-[#00F2FF] font-bold">
            {loading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />GENERATING...</> : <><PenTool className="w-4 h-4 mr-2" />GENERATE SCRIPT</>}
          </Button>
        </motion.div>

        {/* Output */}
        {(script || loading) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border border-[#BC13FE]/20 bg-white/[0.03] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-[#BC13FE]">GENERATED SCRIPT</span>
              {script && (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={saveScript} className="text-xs h-7 border border-white/10">
                    <Save className="w-3 h-3 mr-1" />Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={downloadScript} className="text-xs h-7 border border-white/10">
                    <Download className="w-3 h-3 mr-1" />Export
                  </Button>
                </div>
              )}
            </div>
            {loading ? (
              <div className="space-y-2">
                {[100, 80, 90, 70].map((w, i) => (
                  <div key={i} className="h-3 rounded bg-white/10 animate-pulse" style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : (
              <pre className="text-xs text-[#94A3B8] whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
                {script}
              </pre>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
