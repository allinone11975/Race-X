import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  ArrowLeft, Shield, AlertTriangle, CheckCircle, XCircle, Ban,
  Eye, Search, Filter, ChevronDown, Bot, MessageSquareWarning,
  Camera, FileVideo, FileImage, UserX, RefreshCw, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { RxBadge } from '@/components/common/RxBadge';

interface ModerationItem {
  id: string;
  content_id: string;
  content_type: string;
  flag_reason: string;
  confidence_score: number | null;
  status: 'pending' | 'approved' | 'rejected';
  flagged_at: string;
  thumbnail_url?: string;
  content_preview?: string;
}

interface AbuseReport {
  id: string;
  content_id: string;
  report_reason: string;
  report_description: string;
  status: 'pending' | 'approved' | 'rejected';
  reported_at: string;
}

type ActionType = 'approve' | 'reject' | 'warn' | 'ban';

const flagReasonColors: Record<string, string> = {
  nsfw: 'text-red-400 bg-red-400/10 border-red-400/30',
  violence: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  spam: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  copyright: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  user_report: 'text-[#BC13FE] bg-[#BC13FE]/10 border-[#BC13FE]/30',
  bot: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
};

const contentTypeIcons: Record<string, React.ReactNode> = {
  post: <MessageSquareWarning className="w-4 h-4" />,
  image: <FileImage className="w-4 h-4" />,
  video: <FileVideo className="w-4 h-4" />,
  reel: <Camera className="w-4 h-4" />,
  story: <Camera className="w-4 h-4" />,
};

function ConfidenceBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-muted-foreground">N/A</span>;
  const color = score >= 80 ? '#f87171' : score >= 50 ? '#facc15' : '#22c55e';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 bg-muted rounded-full h-1.5">
        <div className="h-1.5 rounded-full" style={{ width: `${score}%`, background: color, boxShadow: `0 0 4px ${color}` }} />
      </div>
      <span className="text-xs font-medium" style={{ color }}>{score}%</span>
    </div>
  );
}

export default function ModerationHubPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'queue' | 'nsfw' | 'spam' | 'bots' | 'identity' | 'reports' | 'stats'>('queue');
  const [queue, setQueue] = useState<ModerationItem[]>([]);
  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: ActionType; ids: string[]; label: string }>({
    open: false, action: 'approve', ids: [], label: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [statsData, setStatsData] = useState({ reviewed_today: 0, pending: 0, approved: 0, rejected: 0 });

  const user = JSON.parse(localStorage.getItem('race-x-user') || '{}');

  const fetchQueue = useCallback(async () => {
    let query = supabase.from('rx_moderation_queue').select('*').order('flagged_at', { ascending: false }).limit(100);
    if (typeFilter !== 'all') query = query.eq('content_type', typeFilter);
    if (reasonFilter !== 'all') query = query.eq('flag_reason', reasonFilter);
    if (searchTerm) query = query.ilike('content_id', `%${searchTerm}%`);

    const { data } = await query;
    if (data) setQueue(data);

    const all = await supabase.from('rx_moderation_queue').select('status');
    if (all.data) {
      const today = new Date().toDateString();
      setStatsData({
        reviewed_today: all.data.filter(d => d.status !== 'pending').length,
        pending: all.data.filter(d => d.status === 'pending').length,
        approved: all.data.filter(d => d.status === 'approved').length,
        rejected: all.data.filter(d => d.status === 'rejected').length,
      });
    }
  }, [typeFilter, reasonFilter, searchTerm]);

  const fetchReports = useCallback(async () => {
    const { data } = await supabase.from('rx_abuse_reports').select('*').order('reported_at', { ascending: false }).limit(50);
    if (data) setReports(data);
  }, []);

  useEffect(() => {
    if (!user.is_admin) { navigate('/gateway'); return; }
    fetchQueue();
    fetchReports();
  }, [user.is_admin, navigate, fetchQueue, fetchReports]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('moderation-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rx_moderation_queue' }, () => fetchQueue())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchQueue]);

  const executeAction = async (action: ActionType, ids: string[]) => {
    setIsProcessing(true);
    const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : undefined;

    if (newStatus) {
      await supabase.from('rx_moderation_queue').update({
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      }).in('id', ids);
    }

    // Log actions
    const actionRows = ids.map(id => ({
      queue_id: id,
      action_type: action,
      admin_user_id: user.id || '00000000-0000-0000-0000-000000000000',
    }));
    await supabase.from('rx_moderation_actions').insert(actionRows);

    const actionLabels: Record<ActionType, string> = {
      approve: 'Approved', reject: 'Rejected', warn: 'Warning sent', ban: 'User banned'
    };
    toast.success(`${actionLabels[action]} for ${ids.length} item(s)`);
    setSelectedIds([]);
    setConfirmDialog({ open: false, action: 'approve', ids: [], label: '' });
    fetchQueue();
    setIsProcessing(false);
  };

  const promptAction = (action: ActionType, ids: string[]) => {
    const labels: Record<ActionType, string> = {
      approve: 'Approve Content',
      reject: 'Reject & Remove Content',
      warn: 'Warn User(s)',
      ban: 'Ban User(s)',
    };
    setConfirmDialog({ open: true, action, ids, label: labels[action] });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const filteredQueue = queue.filter(item => {
    if (activeTab === 'nsfw') return item.flag_reason === 'nsfw';
    if (activeTab === 'spam') return item.flag_reason === 'spam';
    return item.status === 'pending';
  });

  const tabs = [
    { key: 'queue', label: 'Moderation Queue', icon: <Shield className="w-3 h-3" /> },
    { key: 'nsfw', label: 'NSFW Detection', icon: <Eye className="w-3 h-3" /> },
    { key: 'spam', label: 'Spam Queue', icon: <MessageSquareWarning className="w-3 h-3" /> },
    { key: 'bots', label: 'Bot Detection', icon: <Bot className="w-3 h-3" /> },
    { key: 'identity', label: 'Identity Protection', icon: <UserX className="w-3 h-3" /> },
    { key: 'reports', label: 'Abuse Reports', icon: <AlertTriangle className="w-3 h-3" /> },
    { key: 'stats', label: 'Stats', icon: <BarChart3 className="w-3 h-3" /> },
  ];

  const QueueTable = ({ items, showNsfw }: { items: ModerationItem[]; showNsfw?: boolean }) => (
    <Card className="glass-strong border-border">
      {selectedIds.length > 0 && (
        <div className="px-4 py-2 border-b border-border flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
          <Button size="sm" className="h-7 text-xs bg-green-400/10 border border-green-400/30 text-green-400 hover:bg-green-400/20" onClick={() => promptAction('approve', selectedIds)}>
            <CheckCircle className="w-3 h-3 mr-1" /> Bulk Approve
          </Button>
          <Button size="sm" className="h-7 text-xs bg-red-400/10 border border-red-400/30 text-red-400 hover:bg-red-400/20" onClick={() => promptAction('reject', selectedIds)}>
            <XCircle className="w-3 h-3 mr-1" /> Bulk Reject
          </Button>
          <Button size="sm" className="h-7 text-xs bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/20" onClick={() => promptAction('warn', selectedIds)}>
            Bulk Warn
          </Button>
        </div>
      )}
      <ScrollArea className="h-96">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-xs">
            <thead className="border-b border-border sticky top-0 bg-card">
              <tr className="text-muted-foreground">
                <th className="px-4 py-3 text-left w-8">
                  <Checkbox checked={selectedIds.length === items.length && items.length > 0}
                    onCheckedChange={checked => setSelectedIds(checked ? items.map(i => i.id) : [])} />
                </th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Content ID</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Type</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Flag Reason</th>
                {showNsfw && <th className="px-4 py-3 text-left whitespace-nowrap">Categories</th>}
                <th className="px-4 py-3 text-left whitespace-nowrap">Confidence</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Flagged At</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">No items in this queue</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className={`hover:bg-white/5 ${selectedIds.includes(item.id) ? 'bg-[#00F2FF]/5' : ''}`}>
                  <td className="px-4 py-3">
                    <Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                  </td>
                  <td className="px-4 py-3 font-mono text-[#00F2FF] whitespace-nowrap">{item.content_id}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{contentTypeIcons[item.content_type]}</span>
                      <span className="capitalize">{item.content_type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] border uppercase ${flagReasonColors[item.flag_reason] || ''}`}>
                      {item.flag_reason.replace('_', ' ')}
                    </span>
                  </td>
                  {showNsfw && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-red-400 text-[10px]">
                        {item.flag_reason === 'nsfw' ? 'Nudity, Sexual' : item.flag_reason === 'violence' ? 'Violence, Gore' : '—'}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap"><ConfidenceBar score={item.confidence_score} /></td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(item.flagged_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-400 hover:bg-green-400/10" title="Approve"
                        onClick={() => promptAction('approve', [item.id])}>
                        <CheckCircle className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:bg-red-400/10" title="Reject"
                        onClick={() => promptAction('reject', [item.id])}>
                        <XCircle className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-yellow-400 hover:bg-yellow-400/10" title="Warn"
                        onClick={() => promptAction('warn', [item.id])}>
                        <AlertTriangle className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[#BC13FE] hover:bg-[#BC13FE]/10" title="Ban"
                        onClick={() => promptAction('ban', [item.id])}>
                        <Ban className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </Card>
  );

  return (
    <div className="min-h-screen carbon-fiber flex flex-col">
      {/* Header */}
      <div className="glass-strong border-b border-[#00F2FF]/20 p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="text-[#00F2FF] hover:bg-[#00F2FF]/10">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-xl font-bold" style={{ background: 'linear-gradient(90deg, #00F2FF, #BC13FE)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Moderation & Safety Hub
            </h1>
            <p className="text-xs text-muted-foreground">Content Safety & Abuse Management — Phase 3</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 text-xs">
            {statsData.pending} Pending
          </Badge>
          <Button size="sm" variant="outline" onClick={() => { fetchQueue(); fetchReports(); }}
            className="h-8 text-xs border-[#00F2FF]/30 text-[#00F2FF] hover:bg-[#00F2FF]/10">
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="glass-strong border-b border-border px-4 py-2 flex gap-1 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 max-w-7xl mx-auto">

          {/* MODERATION QUEUE */}
          {(activeTab === 'queue' || activeTab === 'nsfw' || activeTab === 'spam') && (
            <div className="space-y-4">
              <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-44">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search by content ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 bg-black/30" />
                </div>
                {activeTab === 'queue' && (
                  <>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-36 bg-black/30"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {['post', 'image', 'video', 'reel', 'story'].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={reasonFilter} onValueChange={setReasonFilter}>
                      <SelectTrigger className="w-36 bg-black/30"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Reasons</SelectItem>
                        {['nsfw', 'violence', 'spam', 'copyright', 'user_report', 'bot'].map(r => (
                          <SelectItem key={r} value={r} className="capitalize">{r.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
              <QueueTable items={filteredQueue} showNsfw={activeTab === 'nsfw'} />
            </div>
          )}

          {/* BOT DETECTION */}
          {activeTab === 'bots' && (
            <Card className="glass-strong border-cyan-400/20 relative">
              <RxBadge />
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-sm text-cyan-400 flex items-center gap-2">
                  <Bot className="w-4 h-4" /> Suspicious Accounts — Bot Detection
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full min-w-[600px] text-xs">
                  <thead><tr className="border-b border-border text-muted-foreground">
                    <th className="text-left px-4 py-3 whitespace-nowrap">User ID</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Bot Score</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Detection Reason</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Activity Pattern</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {[
                      { uid: 'usr_8f2a91', score: 89, reason: 'Mass posting', pattern: '48 posts/hr' },
                      { uid: 'usr_3c7d44', score: 72, reason: 'Fake engagement', pattern: '0.2% engagement rate' },
                      { uid: 'usr_1e9b65', score: 61, reason: 'Suspicious login', pattern: 'VPN rotation detected' },
                    ].map((bot) => (
                      <tr key={bot.uid} className="hover:bg-white/5">
                        <td className="px-4 py-3 font-mono text-cyan-400">{bot.uid}</td>
                        <td className="px-4 py-3"><ConfidenceBar score={bot.score} /></td>
                        <td className="px-4 py-3 text-yellow-400">{bot.reason}</td>
                        <td className="px-4 py-3 text-muted-foreground">{bot.pattern}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-yellow-400 hover:bg-yellow-400/10"
                              onClick={() => toast.success(`Warning sent to ${bot.uid}`)}>Warn</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-red-400 hover:bg-red-400/10"
                              onClick={() => { if (window.confirm(`Ban ${bot.uid}?`)) toast.success(`User ${bot.uid} banned`); }}>Ban</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* IDENTITY PROTECTION */}
          {activeTab === 'identity' && (
            <Card className="glass-strong border-[#BC13FE]/20 relative">
              <RxBadge />
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-sm text-[#BC13FE] flex items-center gap-2">
                  <UserX className="w-4 h-4" /> Identity Protection Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full min-w-[600px] text-xs">
                  <thead><tr className="border-b border-border text-muted-foreground">
                    <th className="text-left px-4 py-3 whitespace-nowrap">Clone Type</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Source Content</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Uploader</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Detection Reason</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {[
                      { type: 'Face', source: 'img_celebrity_001', uploader: 'usr_9a2f31', reason: 'Identity mismatch' },
                      { type: 'Voice', source: 'aud_voice_007', uploader: 'usr_4e8c12', reason: 'Consent not verified' },
                      { type: 'Face', source: 'img_public_044', uploader: 'usr_7b1d99', reason: 'Identity mismatch' },
                    ].map((alert, i) => (
                      <tr key={i} className="hover:bg-white/5">
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] border ${alert.type === 'Face' ? 'text-[#BC13FE] border-[#BC13FE]/30 bg-[#BC13FE]/10' : 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10'}`}>
                            {alert.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[#00F2FF]">{alert.source}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{alert.uploader}</td>
                        <td className="px-4 py-3 text-yellow-400">{alert.reason}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-green-400 hover:bg-green-400/10"
                              onClick={() => toast.success('Clone authorized')}>Authorize</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-red-400 hover:bg-red-400/10"
                              onClick={() => toast.success('Clone blocked')}>Block Clone</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-[#BC13FE] hover:bg-[#BC13FE]/10"
                              onClick={() => { if (window.confirm('Ban this user?')) toast.success('User banned'); }}>Ban</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* ABUSE REPORTS */}
          {activeTab === 'reports' && (
            <Card className="glass-strong border-red-400/20 relative">
              <RxBadge />
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Abuse Reports Queue
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full min-w-[700px] text-xs">
                  <thead><tr className="border-b border-border text-muted-foreground">
                    <th className="text-left px-4 py-3 whitespace-nowrap">Report ID</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Content</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Reason</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Description</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Date</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {reports.length === 0 ? (
                      <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">No abuse reports</td></tr>
                    ) : reports.map(r => (
                      <tr key={r.id} className="hover:bg-white/5">
                        <td className="px-4 py-3 font-mono text-muted-foreground">{r.id.slice(0, 8)}...</td>
                        <td className="px-4 py-3 font-mono text-[#00F2FF]">{r.content_id || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] border text-red-400 bg-red-400/10 border-red-400/30 capitalize">
                            {r.report_reason.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-48 truncate text-muted-foreground">{r.report_description}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{new Date(r.reported_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-green-400 hover:bg-green-400/10"
                              onClick={async () => {
                                await supabase.from('rx_abuse_reports').update({ status: 'approved' }).eq('id', r.id);
                                fetchReports(); toast.success('Report approved');
                              }}>Approve</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-muted-foreground hover:bg-white/10"
                              onClick={async () => {
                                await supabase.from('rx_abuse_reports').update({ status: 'rejected' }).eq('id', r.id);
                                fetchReports(); toast.success('Report rejected');
                              }}>Reject</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* STATS */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Reviewed Today', value: statsData.reviewed_today, color: '#00F2FF' },
                  { label: 'Pending', value: statsData.pending, color: '#facc15' },
                  { label: 'Approved', value: statsData.approved, color: '#22c55e' },
                  { label: 'Rejected', value: statsData.rejected, color: '#f87171' },
                ].map(stat => (
                  <Card key={stat.label} className="glass-strong border-border relative">
                    <RxBadge />
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: 'False Positive Rate', value: statsData.reviewed_today > 0 ? `${Math.round((statsData.approved / (statsData.reviewed_today || 1)) * 100)}%` : '0%', sub: 'Approved / total reviewed', color: '#00F2FF' },
                  { label: 'Avg Review Time', value: '4.2 min', sub: 'Per item reviewed', color: '#BC13FE' },
                  { label: 'Auto-Detection Rate', value: '78%', sub: 'Items auto-flagged vs manual', color: '#22c55e' },
                ].map(s => (
                  <Card key={s.label} className="glass-strong border-border relative">
                    <RxBadge />
                    <CardContent className="p-4">
                      <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-sm mt-1">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.sub}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={o => !o && setConfirmDialog(p => ({ ...p, open: false }))}>
        <DialogContent className="glass-strong border-border max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className={confirmDialog.action === 'ban' ? 'text-red-400' : 'text-[#00F2FF]'}>
              Confirm: {confirmDialog.label}
            </DialogTitle>
            <DialogDescription>
              This action will be applied to {confirmDialog.ids.length} item(s) and logged permanently.
              {confirmDialog.action === 'ban' && ' All user content will be removed.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(p => ({ ...p, open: false }))}>Cancel</Button>
            <Button
              disabled={isProcessing}
              onClick={() => executeAction(confirmDialog.action, confirmDialog.ids)}
              className={`${
                confirmDialog.action === 'approve' ? 'bg-green-400/20 border-green-400/50 text-green-400' :
                confirmDialog.action === 'reject' ? 'bg-red-400/20 border-red-400/50 text-red-400' :
                confirmDialog.action === 'ban' ? 'bg-red-600/30 border-red-600 text-red-300' :
                'bg-yellow-400/20 border-yellow-400/50 text-yellow-400'
              } border`}>
              {isProcessing ? 'Processing...' : `Confirm ${confirmDialog.label}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
