import { useState, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { MessageSquare, Minimize2, X, Zap, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRxStore } from '@/store/rxStore';
import { aiChat } from '@/services/aiGateway';
import { toast } from 'sonner';

interface Msg { role: 'user' | 'assistant'; content: string; }

export default function AiDirectorWidget() {
  const { aiDirectorOpen, setAiDirectorOpen } = useRxStore();
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: 'user', content: input };
    setMessages((p) => [...p, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await aiChat([...messages, userMsg],
        'You are the AI Director of RACE-X studio. Give cinematic, sharp, creative direction advice in 2-3 sentences max. Think Hollywood meets Unreal Engine.'
      );
      setMessages((p) => [...p, { role: 'assistant', content: res.reply }]);
    } catch {
      toast.error('AI Director unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Full-screen drag constraint layer */}
      <div ref={constraintsRef} className="fixed inset-0 z-40 pointer-events-none" />

      {/* Movable floating trigger */}
      {!aiDirectorOpen && (
        <motion.button
          drag
          dragConstraints={constraintsRef}
          dragMomentum={false}
          dragElastic={0}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setAiDirectorOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#0A0A0F] border border-[#00F2FF]/60 flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.4)] cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
        >
          <Zap className="w-6 h-6 text-[#00F2FF]" />
        </motion.button>
      )}

      {/* Movable widget panel */}
      <AnimatePresence>
        {aiDirectorOpen && (
          <motion.div
            drag
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={constraintsRef}
            dragMomentum={false}
            dragElastic={0}
            initial={{ opacity: 0, scale: 0.8, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 40 }}
            className="fixed bottom-6 right-6 z-50 w-80 rounded-xl border border-[#00F2FF]/30 bg-[#0A0A0F]/95 backdrop-blur-xl shadow-[0_0_40px_rgba(0,242,255,0.2)] overflow-hidden"
            style={{ touchAction: 'none' }}
          >
            {/* Draggable Header */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex items-center justify-between px-4 py-3 border-b border-[#00F2FF]/20 cursor-grab active:cursor-grabbing select-none"
            >
              <div className="flex items-center gap-2">
                <GripHorizontal className="w-3.5 h-3.5 text-white/20" />
                <Zap className="w-4 h-4 text-[#00F2FF]" />
                <span className="text-sm font-bold text-[#00F2FF] tracking-wider">AI DIRECTOR</span>
                <span className="text-[10px] text-muted-foreground">Groq · LLaMA 3.3</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMinimized(!minimized)}>
                  <Minimize2 className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setAiDirectorOpen(false); setMinimized(false); }}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Body */}
            <AnimatePresence>
              {!minimized && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}>
                  <ScrollArea className="h-48 p-3">
                    {messages.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center mt-6">Ask the AI Director anything about your project…</p>
                    )}
                    <div className="space-y-2">
                      {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] text-xs px-3 py-2 rounded-lg ${m.role === 'user' ? 'bg-[#00F2FF]/20 text-white' : 'bg-white/5 text-[#94A3B8]'}`}>
                            {m.content}
                          </div>
                        </div>
                      ))}
                      {loading && (
                        <div className="flex justify-start">
                          <div className="bg-white/5 px-3 py-2 rounded-lg flex gap-1">
                            {[0, 150, 300].map((d) => (
                              <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#00F2FF] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="p-3 border-t border-[#00F2FF]/10 flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && send()}
                      placeholder="Direct your scene…"
                      className="text-xs h-8 bg-white/5 border-[#00F2FF]/20"
                      disabled={loading}
                    />
                    <Button size="icon" className="h-8 w-8 bg-[#00F2FF]/20 hover:bg-[#00F2FF]/30 border border-[#00F2FF]/40" onClick={send} disabled={loading}>
                      <MessageSquare className="w-3 h-3 text-[#00F2FF]" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
