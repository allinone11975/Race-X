/**
 * ADMIN USER MANAGER — Search, view, ban, verify users
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Search, ShieldCheck, ShieldX, Diamond, Eye, User, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import RxBadge from '@/components/common/RxBadge';
import { supabase } from '@/db/supabase';

interface UserRow { id: string; username: string; phone_number: string; user_level: number; diamonds: number; rx_points: number; is_admin: boolean; created_at: string; }

export default function AdminUserManager() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [processing, setProcessing] = useState(false);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    let dbq = supabase.from('users').select('id, username, phone_number, user_level, diamonds, rx_points, is_admin, created_at').order('created_at', { ascending: false }).limit(30);
    if (q.trim()) dbq = dbq.or(`username.ilike.%${q}%,phone_number.ilike.%${q}%`);
    const { data } = await dbq;
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { search(''); }, [search]);
  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const toggleAdmin = async (user: UserRow) => {
    setProcessing(true);
    const { error } = await supabase.from('users').update({ is_admin: !user.is_admin }).eq('id', user.id);
    if (error) toast.error('Update failed');
    else {
      toast.success(`@${user.username} admin status updated`);
      setSelected(prev => prev ? { ...prev, is_admin: !prev.is_admin } : null);
      search(query);
    }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="p-2 rounded-lg border border-white/10"><ArrowLeft className="w-4 h-4" /></button>
        <RxBadge label="USERS" />
        <h1 className="text-sm font-bold tracking-widest">USER MANAGER</h1>
      </div>

      <div className="sticky top-[57px] z-10 bg-[#0A0A0F]/90 backdrop-blur px-4 py-2 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or phone..." className="pl-9 bg-white/5 border-white/10 h-8 text-sm" />
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {loading ? (
          Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="p-4 flex gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/10 rounded w-1/3" />
                <div className="h-2 bg-white/5 rounded w-1/4" />
              </div>
            </div>
          ))
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No users found</p>
          </div>
        ) : (
          users.map((u) => (
            <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#00F2FF]/10 border border-[#00F2FF]/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-[#00F2FF]">{u.username?.[0]?.toUpperCase() || '?'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate">@{u.username}</span>
                  {u.is_admin && <Badge variant="secondary" className="text-[9px] bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30">ADMIN</Badge>}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                  <span>Lv.{u.user_level}</span>
                  <span className="flex items-center gap-0.5"><Diamond className="w-2.5 h-2.5 text-[#00F2FF]" />{u.diamonds}</span>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setSelected(u)}>
                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </motion.div>
          ))
        )}
      </div>

      {/* User detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm bg-[#0A0A0F] border-[#00F2FF]/20">
          <DialogHeader>
            <DialogTitle className="text-white">@{selected?.username}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ['Phone', selected.phone_number],
                  ['Level', String(selected.user_level)],
                  ['Diamonds', String(selected.diamonds)],
                  ['RX Points', String(selected.rx_points)],
                  ['Joined', new Date(selected.created_at).toLocaleDateString()],
                  ['Admin', selected.is_admin ? 'Yes' : 'No'],
                ].map(([k, v]) => (
                  <div key={k} className="p-2 rounded-lg bg-white/5">
                    <p className="text-muted-foreground">{k}</p>
                    <p className="text-white font-medium mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
              <Button onClick={() => toggleAdmin(selected)} disabled={processing}
                className={`w-full border ${selected.is_admin ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-[#00FF88]/20 border-[#00FF88]/40 text-[#00FF88]'}`}>
                {processing ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : selected.is_admin
                  ? <><ShieldX className="w-4 h-4 mr-2" />Revoke Admin</>
                  : <><ShieldCheck className="w-4 h-4 mr-2" />Grant Admin</>}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
