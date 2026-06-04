/**
 * MESSAGES — Supabase Realtime 1-to-1 chat
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, MessageCircle, Send, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import RxBadge from '@/components/common/RxBadge';
import { supabase } from '@/db/supabase';

interface Message { id: string; sender_id: string; receiver_id: string; content: string; created_at: string; }
interface Conversation { user_id: string; username: string; avatar_url: string | null; last_message?: string; }

export default function MessagesPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (!activeConv || !currentUserId) return;
    fetchMessages(activeConv.user_id);
    const channel = supabase
      .channel(`messages-${activeConv.user_id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === currentUserId && msg.receiver_id === activeConv.user_id) ||
            (msg.sender_id === activeConv.user_id && msg.receiver_id === currentUserId)
          ) {
            setMessages(prev => [...prev, msg]);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConv, currentUserId]);

  const fetchMessages = async (otherId: string) => {
    if (!currentUserId) return;
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true })
      .limit(100);
    setMessages(Array.isArray(data) ? data : []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConv || !currentUserId) return;
    setSending(true);
    const { error } = await supabase.from('direct_messages').insert({
      sender_id: currentUserId,
      receiver_id: activeConv.user_id,
      content: input.trim(),
    });
    if (error) toast.error('Failed to send');
    else setInput('');
    setSending(false);
  };

  if (activeConv) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col">
        <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3 flex items-center gap-3">
          <button onClick={() => { setActiveConv(null); setMessages([]); }}
            className="p-2 rounded-lg border border-white/10 hover:border-[#00F2FF]/40 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 rounded-full bg-[#00F2FF]/20 border border-[#00F2FF]/30 flex items-center justify-center shrink-0 overflow-hidden">
            {activeConv.avatar_url
              ? <img src={activeConv.avatar_url} alt={activeConv.username} className="w-full h-full object-cover" />
              : <User className="w-4 h-4 text-[#00F2FF]" />}
          </div>
          <span className="text-sm font-bold">@{activeConv.username}</span>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {messages.map((m) => {
              const isMe = m.sender_id === currentUserId;
              return (
                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${isMe ? 'bg-[#00F2FF]/20 text-white rounded-br-sm' : 'bg-white/5 text-[#94A3B8] rounded-bl-sm'}`}>
                    {m.content}
                    <p className="text-[9px] mt-1 opacity-50">{new Date(m.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
        <div className="p-3 border-t border-white/5 flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..." className="bg-white/5 border-white/10" />
          <Button onClick={sendMessage} disabled={sending || !input.trim()} size="icon"
            className="bg-[#00F2FF]/20 border border-[#00F2FF]/40 shrink-0">
            <Send className="w-4 h-4 text-[#00F2FF]" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/rx-social')} className="p-2 rounded-lg border border-white/10 hover:border-[#00F2FF]/40 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <RxBadge label="MSG" />
        <h1 className="text-sm font-bold tracking-widest">MESSAGES</h1>
      </div>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">No conversations yet</p>
        <p className="text-xs mt-1">Find a creator and start chatting</p>
        <Button onClick={() => navigate('/rx-social/search')} className="mt-4 border border-[#00F2FF]/30 bg-[#00F2FF]/10 text-[#00F2FF]">
          Find Creators
        </Button>
      </div>
    </div>
  );
}
