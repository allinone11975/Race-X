/**
 * RX SOCIAL NOTIFICATIONS — Supabase Realtime
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Bell, Heart, MessageCircle, UserPlus, Zap, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RxBadge from '@/components/common/RxBadge';
import { supabase } from '@/db/supabase';
import { useRxStore } from '@/store/rxStore';
import type { Notification } from '@/types/race-x';

const CATEGORY_ICON = {
  ai_complete: Zap,
  social: Heart,
  system: Bell,
};

const CATEGORY_COLOR = {
  ai_complete: '#00F2FF',
  social: '#BC13FE',
  system: '#FFD700',
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { setUnreadNotifications } = useRxStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'ai_complete' | 'social' | 'system'>('all');

  useEffect(() => {
    fetchNotifications();
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    const list = Array.isArray(data) ? data as Notification[] : [];
    setNotifications(list);
    setUnreadNotifications(list.filter(n => !n.read_status).length);
    setLoading(false);
  };

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ read_status: true }).eq('user_id', user.id).eq('read_status', false);
    setNotifications(prev => prev.map(n => ({ ...n, read_status: true })));
    setUnreadNotifications(0);
  };

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.category === filter);
  const unread = notifications.filter(n => !n.read_status).length;

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/rx-social')} className="p-2 rounded-lg border border-white/10 hover:border-[#00F2FF]/40 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <RxBadge label="NOTIF" />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold tracking-widest">NOTIFICATIONS</h1>
          {unread > 0 && <p className="text-[10px] text-[#00F2FF]">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <Button size="sm" variant="ghost" onClick={markAllRead} className="text-xs h-7 border border-white/10 shrink-0">
            <CheckCheck className="w-3 h-3 mr-1" />All Read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto whitespace-nowrap border-b border-white/5">
        {(['all', 'ai_complete', 'social', 'system'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs transition-all border ${filter === f ? 'border-[#00F2FF] bg-[#00F2FF]/10 text-[#00F2FF]' : 'border-white/10 text-muted-foreground hover:border-white/20'}`}>
            {f === 'all' ? 'All' : f === 'ai_complete' ? '⚡ AI' : f === 'social' ? '❤️ Social' : '🔔 System'}
          </button>
        ))}
      </div>

      <div className="divide-y divide-white/5">
        {loading ? (
          Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="p-4 flex gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/10 rounded animate-pulse w-3/4" />
                <div className="h-2 bg-white/5 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          filtered.map((n) => {
            const Icon = CATEGORY_ICON[n.category] || Bell;
            const color = CATEGORY_COLOR[n.category] || '#ffffff';
            return (
              <motion.div key={n.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className={`flex items-start gap-3 p-4 transition-colors ${!n.read_status ? 'bg-white/[0.02]' : ''}`}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border"
                  style={{ backgroundColor: `${color}15`, borderColor: `${color}30` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{n.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.read_status && <div className="w-2 h-2 rounded-full bg-[#00F2FF] mt-2 shrink-0" />}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
