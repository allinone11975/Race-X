/**
 * ADMIN KYC REVIEW — Review and approve/reject identity submissions
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck, ShieldX, Clock, Eye, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import RxBadge from '@/components/common/RxBadge';
import { supabase } from '@/db/supabase';
import type { KycSubmission } from '@/types/race-x';

const STATUS_BADGE = {
  pending:  <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30">Pending</Badge>,
  verified: <Badge className="bg-green-400/20 text-green-400 border-green-400/30">Verified</Badge>,
  rejected: <Badge className="bg-red-400/20 text-red-400 border-red-400/30">Rejected</Badge>,
};

export default function AdminKycReview() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<(KycSubmission & { username?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<(KycSubmission & { username?: string }) | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending');

  useEffect(() => { fetchSubmissions(); }, [filter]);

  const fetchSubmissions = async () => {
    setLoading(true);
    let q = supabase.from('kyc_submissions').select('*, users(username)').order('submitted_at', { ascending: false }).limit(50);
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setSubmissions(Array.isArray(data) ? data.map((d: any) => ({ ...d, username: d.users?.username })) : []);
    setLoading(false);
  };

  const review = async (status: 'verified' | 'rejected') => {
    if (!selected) return;
    setProcessing(true);
    const { error } = await supabase.from('kyc_submissions').update({
      status,
      review_notes: notes || null,
      reviewed_at: new Date().toISOString(),
    }).eq('id', selected.id);
    if (error) toast.error('Update failed');
    else {
      toast.success(`KYC ${status === 'verified' ? 'approved ✅' : 'rejected ❌'}`);
      setSelected(null); setNotes('');
      fetchSubmissions();
    }
    setProcessing(false);
  };

  const filtered = submissions;

  return (
    <AdminAuthGuard>
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="p-2 rounded-lg border border-white/10"><ArrowLeft className="w-4 h-4" /></button>
        <RxBadge label="KYC" />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold tracking-widest">KYC REVIEW</h1>
          <p className="text-[10px] text-muted-foreground">Identity Verification Queue</p>
        </div>
        <Button size="sm" variant="ghost" onClick={fetchSubmissions} className="border border-white/10 text-xs shrink-0">
          <RefreshCw className="w-3 h-3 mr-1" />Refresh
        </Button>
      </div>

      {/* Filter */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto whitespace-nowrap border-b border-white/5">
        {(['all', 'pending', 'verified', 'rejected'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs border transition-all ${filter === f ? 'border-[#00F2FF] bg-[#00F2FF]/10 text-[#00F2FF]' : 'border-white/10 text-muted-foreground'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="divide-y divide-white/5">
        {loading ? (
          Array.from({ length: 5 }, (_, i) => <div key={i} className="p-4 h-16 animate-pulse bg-white/5 m-4 rounded-xl" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No submissions</p>
          </div>
        ) : (
          filtered.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-4">
              <div className="w-9 h-9 rounded-full bg-[#00F2FF]/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-[#00F2FF]">{s.full_name?.[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{s.full_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-muted-foreground">@{s.username}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(s.submitted_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {STATUS_BADGE[s.status]}
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setSelected(s); setNotes(s.review_notes || ''); }}>
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setNotes(''); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm bg-[#0A0A0F] border-[#00F2FF]/20">
          <DialogHeader>
            <DialogTitle className="text-white">KYC Review — {selected?.full_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[['Username', `@${selected.username}`], ['ID Type', selected.id_type || '—'], ['ID Number', selected.id_number || '—'], ['DOB', selected.date_of_birth || '—']].map(([k, v]) => (
                  <div key={k} className="p-2 rounded-lg bg-white/5">
                    <p className="text-muted-foreground">{k}</p>
                    <p className="text-white font-medium">{v}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Review Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." className="bg-white/5 border-white/10 resize-none text-sm" rows={2} />
              </div>
              {selected.status === 'pending' && (
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => review('verified')} disabled={processing}
                    className="bg-green-500/20 border border-green-500/40 text-green-400 font-bold">
                    <ShieldCheck className="w-4 h-4 mr-1" />Approve
                  </Button>
                  <Button onClick={() => review('rejected')} disabled={processing}
                    className="bg-red-500/20 border border-red-500/40 text-red-400 font-bold">
                    <ShieldX className="w-4 h-4 mr-1" />Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </AdminAuthGuard>
  );
}
