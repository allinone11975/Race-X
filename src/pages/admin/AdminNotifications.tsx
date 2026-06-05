/**
 * Global Notification System
 * Admin broadcasts: announcements, maintenance alerts, promos
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bell, Plus, Trash2, Edit2, Send,
  CheckCircle2, XCircle, Pin, PinOff, Eye, EyeOff, RefreshCw
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

interface PlatformNotif {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'promo' | 'maintenance';
  target_audience: 'all' | 'premium' | 'free' | 'admin';
  is_active: boolean;
  is_pinned: boolean;
  cta_label: string | null;
  cta_url: string | null;
  expires_at: string | null;
  created_at: string;
}

const TYPE_STYLE: Record<string, string> = {
  info:        'bg-[#00F2FF]/10 text-[#00F2FF] border-[#00F2FF]/20',
  warning:     'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20',
  error:       'bg-red-500/10 text-red-400 border-red-400/20',
  success:     'bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/20',
  promo:       'bg-[#BC13FE]/10 text-[#BC13FE] border-[#BC13FE]/20',
  maintenance: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
};

const BLANK: Omit<PlatformNotif, 'id' | 'created_at'> = {
  title: '', body: '', type: 'info', target_audience: 'all',
  is_active: true, is_pinned: false, cta_label: null, cta_url: null, expires_at: null,
};

export default function AdminNotifications() {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<PlatformNotif[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<PlatformNotif> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('platform_notifications')
      .select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    setNotifs((data as PlatformNotif[]) ?? []);
    setLoading(false);
  };

  const openNew = () => { setEditing({ ...BLANK }); setOpen(true); };
  const openEdit = (n: PlatformNotif) => { setEditing({ ...n }); setOpen(true); };

  const save = async () => {
    if (!editing?.title || !editing?.body) { toast.error('Title and body are required'); return; }
    setSaving(true);
    try {
      if (editing.id) {
        await supabase.from('platform_notifications').update({ ...editing, updated_at: new Date().toISOString() }).eq('id', editing.id);
        await supabase.from('admin_audit_log').insert({ action_type: 'NOTIFICATION_UPDATE', target_type: 'notification', target_id: editing.id, severity: 'info', payload: { title: editing.title } });
        toast.success('Notification updated');
      } else {
        const { data } = await supabase.from('platform_notifications').insert({ ...editing }).select().maybeSingle();
        await supabase.from('admin_audit_log').insert({ action_type: 'NOTIFICATION_SENT', target_type: 'notification', target_id: data?.id, severity: 'info', payload: { title: editing.title, audience: editing.target_audience } });
        toast.success('Notification published!');
      }
      setOpen(false); setEditing(null); load();
    } catch (e) { toast.error('Save failed'); }
    setSaving(false);
  };

  const toggle = async (id: string, field: 'is_active' | 'is_pinned', val: boolean) => {
    await supabase.from('platform_notifications').update({ [field]: !val }).eq('id', id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, [field]: !val } : n));
  };

  const del = async (id: string) => {
    await supabase.from('platform_notifications').delete().eq('id', id);
    await supabase.from('admin_audit_log').insert({ action_type: 'NOTIFICATION_DELETE', target_type: 'notification', target_id: id, severity: 'warning' });
    setNotifs(prev => prev.filter(n => n.id !== id));
    toast.success('Deleted');
  };

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-[#0A0A0F] text-white">
        <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#FFD700]/10 px-4 py-3">
          <div className="flex items-center gap-3 max-w-5xl mx-auto">
            <button onClick={() => navigate('/admin/omniverse')} className="p-2 rounded-lg border border-white/10 hover:bg-white/5 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Bell className="w-4 h-4 text-[#FFD700] shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-black tracking-widest">NOTIFICATION CENTER</h1>
              <p className="text-[10px] text-white/40">Broadcast announcements · maintenance · promos · alerts</p>
            </div>
            <Button size="sm" onClick={openNew} className="h-8 px-3 text-xs bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/20">
              <Plus className="w-3 h-3 mr-1" /> New
            </Button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-4 space-y-3">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total', value: notifs.length, color: '#00F2FF' },
              { label: 'Active', value: notifs.filter(n => n.is_active).length, color: '#00FF88' },
              { label: 'Pinned', value: notifs.filter(n => n.is_pinned).length, color: '#BC13FE' },
            ].map(s => (
              <Card key={s.label} className="bg-white/[0.03] border-white/8 rounded-xl">
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-black" style={{ color: s.color }}>{loading ? '…' : s.value}</p>
                  <p className="text-[9px] text-white/40 uppercase tracking-wider">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Notification list */}
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
              ))
            ) : notifs.length === 0 ? (
              <div className="py-16 text-center text-white/30 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                No notifications yet
              </div>
            ) : notifs.map(n => (
              <motion.div key={n.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={`rounded-xl border transition-all ${n.is_active ? 'bg-white/[0.03] border-white/10' : 'bg-white/[0.01] border-white/5 opacity-60'}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {n.is_pinned && <Pin className="w-3 h-3 text-[#BC13FE] shrink-0" />}
                          <span className="text-sm font-bold text-white truncate">{n.title}</span>
                          <Badge className={`text-[9px] px-1.5 py-0 border ${TYPE_STYLE[n.type]}`}>{n.type}</Badge>
                          <Badge className="text-[9px] px-1.5 py-0 bg-white/5 border-white/10 text-white/50">{n.target_audience}</Badge>
                        </div>
                        <p className="text-xs text-white/60 line-clamp-2">{n.body}</p>
                        {n.cta_label && (
                          <p className="text-[10px] text-[#00F2FF] mt-1">CTA: {n.cta_label} → {n.cta_url}</p>
                        )}
                        <p className="text-[10px] text-white/30 mt-1">
                          {new Date(n.created_at).toLocaleString()}
                          {n.expires_at && ` · Expires: ${new Date(n.expires_at).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggle(n.id, 'is_active', n.is_active)}
                            className={`p-1.5 rounded-lg border transition-all ${n.is_active ? 'border-[#00FF88]/30 bg-[#00FF88]/10 text-[#00FF88]' : 'border-white/10 text-white/30'}`}>
                            {n.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          </button>
                          <button onClick={() => toggle(n.id, 'is_pinned', n.is_pinned)}
                            className={`p-1.5 rounded-lg border transition-all ${n.is_pinned ? 'border-[#BC13FE]/30 bg-[#BC13FE]/10 text-[#BC13FE]' : 'border-white/10 text-white/30'}`}>
                            {n.is_pinned ? <Pin className="w-3 h-3" /> : <PinOff className="w-3 h-3" />}
                          </button>
                          <button onClick={() => openEdit(n)}
                            className="p-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:bg-white/5">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => del(n.id)}
                            className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-[#0F0F1A] border-white/10 text-white max-w-[calc(100%-2rem)] md:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-sm font-black">
                {editing?.id ? 'Edit Notification' : 'Create Notification'}
              </DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="space-y-3">
                <Input
                  placeholder="Title"
                  value={editing.title ?? ''}
                  onChange={e => setEditing(p => ({ ...p!, title: e.target.value }))}
                  className="bg-white/5 border-white/10 text-sm"
                />
                <textarea
                  placeholder="Body message…"
                  value={editing.body ?? ''}
                  onChange={e => setEditing(p => ({ ...p!, body: e.target.value }))}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-[#FFD700]/40"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Type</label>
                    <Select value={editing.type} onValueChange={v => setEditing(p => ({ ...p!, type: v as PlatformNotif['type'] }))}>
                      <SelectTrigger className="h-9 bg-white/5 border-white/10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F0F1A] border-white/10">
                        {['info','warning','error','success','promo','maintenance'].map(t => (
                          <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Audience</label>
                    <Select value={editing.target_audience} onValueChange={v => setEditing(p => ({ ...p!, target_audience: v as PlatformNotif['target_audience'] }))}>
                      <SelectTrigger className="h-9 bg-white/5 border-white/10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F0F1A] border-white/10">
                        {['all','premium','free','admin'].map(a => (
                          <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="CTA Label (optional)"
                    value={editing.cta_label ?? ''}
                    onChange={e => setEditing(p => ({ ...p!, cta_label: e.target.value || null }))}
                    className="bg-white/5 border-white/10 text-xs"
                  />
                  <Input
                    placeholder="CTA URL (optional)"
                    value={editing.cta_url ?? ''}
                    onChange={e => setEditing(p => ({ ...p!, cta_url: e.target.value || null }))}
                    className="bg-white/5 border-white/10 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Expires At (optional)</label>
                  <Input
                    type="datetime-local"
                    value={editing.expires_at ? editing.expires_at.slice(0, 16) : ''}
                    onChange={e => setEditing(p => ({ ...p!, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                    className="bg-white/5 border-white/10 text-xs"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
                      <Switch checked={editing.is_active ?? true} onCheckedChange={v => setEditing(p => ({ ...p!, is_active: v }))} className="scale-75" />
                      Active
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
                      <Switch checked={editing.is_pinned ?? false} onCheckedChange={v => setEditing(p => ({ ...p!, is_pinned: v }))} className="scale-75" />
                      Pinned
                    </label>
                  </div>
                  <Button onClick={save} disabled={saving} className="h-9 px-4 bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/20 text-xs font-bold">
                    {saving ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                    {editing.id ? 'Update' : 'Publish'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminAuthGuard>
  );
}
