/**
 * Admin Queue Monitor
 * Live job viewer — status, progress, priority, retry controls
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ListChecks, RefreshCw, Loader2, CheckCircle2,
  XCircle, Clock, Play, StopCircle, Trash2, ChevronDown, RotateCcw,
  Filter, Download, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

interface QueueJob {
  id: string;
  user_id: string;
  job_type: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  progress: number;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

const STATUS_CFG = {
  queued:    { color: 'text-[#00F2FF]',  bg: 'bg-[#00F2FF]/10 border-[#00F2FF]/20',   icon: <Clock className="w-3 h-3" />,        label: 'Queued' },
  running:   { color: 'text-[#FFD700]',  bg: 'bg-[#FFD700]/10 border-[#FFD700]/20',   icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Running' },
  completed: { color: 'text-[#00FF88]',  bg: 'bg-[#00FF88]/10 border-[#00FF88]/20',   icon: <CheckCircle2 className="w-3 h-3" />,  label: 'Done' },
  failed:    { color: 'text-red-400',     bg: 'bg-red-500/10 border-red-400/20',        icon: <XCircle className="w-3 h-3" />,       label: 'Failed' },
  cancelled: { color: 'text-white/40',    bg: 'bg-white/5 border-white/10',             icon: <StopCircle className="w-3 h-3" />,    label: 'Cancelled' },
};

export default function AdminQueueMonitor() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('queue_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (typeFilter !== 'all') query = query.eq('job_type', typeFilter);

    const { data } = await query;
    setJobs((data as QueueJob[]) ?? []);
    setLoading(false);
  }, [statusFilter, typeFilter, page]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel('queue-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_jobs' }, fetchJobs)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchJobs]);

  const retryJob = async (job: QueueJob) => {
    if (job.retry_count >= job.max_retries) {
      toast.error('Max retries reached');
      return;
    }
    await supabase.from('queue_jobs').update({ status: 'queued', progress: 0, error_message: null }).eq('id', job.id);
    toast.success('Job requeued');
    fetchJobs();
  };

  const cancelJob = async (job: QueueJob) => {
    await supabase.from('queue_jobs').update({ status: 'cancelled', completed_at: new Date().toISOString() }).eq('id', job.id);
    toast.info('Job cancelled');
    fetchJobs();
  };

  const deleteJob = async (id: string) => {
    await supabase.from('queue_jobs').delete().eq('id', id);
    toast.success('Job deleted');
    fetchJobs();
  };

  const bulkClearCompleted = async () => {
    await supabase.from('queue_jobs').delete().eq('status', 'completed');
    toast.success('Completed jobs cleared');
    fetchJobs();
  };

  const exportCSV = () => {
    const rows = [['id', 'type', 'status', 'progress', 'priority', 'retry_count', 'created_at', 'completed_at', 'error'].join(',')];
    jobs.forEach(j => rows.push([j.id, j.job_type, j.status, j.progress, j.priority, j.retry_count, j.created_at, j.completed_at ?? '', j.error_message ?? ''].join(',')));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'queue_jobs.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const queuedCount   = jobs.filter(j => j.status === 'queued').length;
  const runningCount  = jobs.filter(j => j.status === 'running').length;
  const failedCount   = jobs.filter(j => j.status === 'failed').length;

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-[#0A0A0F] text-white pb-12">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3">
          <div className="flex items-center gap-3 max-w-6xl mx-auto">
            <button onClick={() => navigate('/admin/omniverse')} className="p-2 rounded-lg border border-white/10 hover:bg-white/5 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <ListChecks className="w-4 h-4 text-[#00F2FF] shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-black tracking-widest">QUEUE MONITOR</h1>
              <p className="text-[10px] text-white/40">Background jobs · priority · progress · retry controls</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {failedCount > 0 && (
                <Badge className="bg-red-500/10 border-red-400/30 text-red-400 text-[9px]">
                  {failedCount} Failed
                </Badge>
              )}
              <Button size="sm" onClick={bulkClearCompleted}
                className="h-8 px-3 text-xs bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10">
                <Trash2 className="w-3 h-3 mr-1" /> Clear Done
              </Button>
              <Button size="sm" onClick={exportCSV}
                className="h-8 px-3 text-xs bg-[#00F2FF]/10 border border-[#00F2FF]/30 text-[#00F2FF] hover:bg-[#00F2FF]/20">
                <Download className="w-3 h-3 mr-1" /> Export
              </Button>
              <button onClick={fetchJobs} className="p-2 rounded-lg border border-white/10 hover:bg-white/5">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Queued',  value: queuedCount,  color: '#00F2FF' },
              { label: 'Running', value: runningCount, color: '#FFD700' },
              { label: 'Failed',  value: failedCount,  color: '#FF4444' },
            ].map(s => (
              <Card key={s.label} className="bg-white/[0.03] border-white/8 rounded-xl">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-black" style={{ color: s.color }}>{loading ? '…' : s.value}</p>
                  <p className="text-[9px] text-white/40 uppercase tracking-wider">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-36 text-xs bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-36 text-xs bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="music_generate">Music</SelectItem>
                <SelectItem value="image_generate">Image</SelectItem>
                <SelectItem value="video_generate">Video</SelectItem>
                <SelectItem value="voice_generate">Voice</SelectItem>
                <SelectItem value="chat_generate">Chat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Job list */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-16 text-center">
              <ListChecks className="w-10 h-10 mx-auto mb-3 text-white/20" />
              <p className="text-white/40 text-sm">No jobs found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map((job, i) => {
                const cfg = STATUS_CFG[job.status];
                const isExpanded = expanded === job.id;
                const durationMs = job.started_at && job.completed_at
                  ? new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
                  : null;

                return (
                  <motion.div key={job.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                    <Card className="bg-white/[0.03] border-white/8 rounded-xl overflow-hidden">
                      <div
                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors"
                        onClick={() => setExpanded(isExpanded ? null : job.id)}
                      >
                        {/* Priority badge */}
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                          job.priority <= 3 ? 'bg-red-500/20 text-red-400' : job.priority <= 6 ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-white/10 text-white/40'
                        }`}>{job.priority}</div>

                        {/* Type */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">{job.job_type.replace('_', ' ').toUpperCase()}</span>
                            <span className="text-[10px] text-white/30 font-mono">{job.id.slice(0, 8)}</span>
                          </div>
                          {/* Progress bar */}
                          {job.status === 'running' && (
                            <div className="h-1 bg-white/5 rounded-full mt-1.5 w-full max-w-[200px] overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${job.progress}%` }}
                                className="h-full bg-[#FFD700] rounded-full"
                              />
                            </div>
                          )}
                        </div>

                        {/* Status + time */}
                        <div className="flex items-center gap-2 shrink-0">
                          {durationMs !== null && (
                            <span className="text-[9px] text-white/30">{(durationMs / 1000).toFixed(1)}s</span>
                          )}
                          <Badge className={`text-[9px] px-2 py-0.5 border ${cfg.bg} ${cfg.color}`}>
                            <span className="mr-1">{cfg.icon}</span>{cfg.label}
                            {job.status === 'running' ? ` ${job.progress}%` : ''}
                          </Badge>
                          <ChevronDown className={`w-3 h-3 text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0 border-t border-white/5 space-y-2">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                            <div><p className="text-[9px] text-white/30">User ID</p><p className="text-xs text-white/60 font-mono truncate">{job.user_id}</p></div>
                            <div><p className="text-[9px] text-white/30">Created</p><p className="text-xs text-white/60">{new Date(job.created_at).toLocaleString()}</p></div>
                            <div><p className="text-[9px] text-white/30">Retries</p><p className="text-xs text-white/60">{job.retry_count}/{job.max_retries}</p></div>
                          </div>
                          {job.error_message && (
                            <div className="p-2 rounded-lg bg-red-500/10 border border-red-400/20">
                              <p className="text-[9px] text-red-400/70 mb-1">Error</p>
                              <p className="text-xs text-red-400 break-words">{job.error_message}</p>
                            </div>
                          )}
                          {job.payload && (
                            <div className="p-2 rounded-lg bg-white/5">
                              <p className="text-[9px] text-white/30 mb-1">Payload</p>
                              <pre className="text-[10px] text-white/50 overflow-x-auto whitespace-pre-wrap break-all">
                                {JSON.stringify(job.payload, null, 2).slice(0, 300)}
                              </pre>
                            </div>
                          )}
                          <div className="flex gap-2 pt-1">
                            {(job.status === 'failed' || job.status === 'queued') && (
                              <Button size="sm" onClick={() => retryJob(job)}
                                className="h-7 px-3 text-[10px] bg-[#00FF88]/10 border border-[#00FF88]/30 text-[#00FF88] hover:bg-[#00FF88]/20">
                                <RotateCcw className="w-3 h-3 mr-1" /> Retry
                              </Button>
                            )}
                            {(job.status === 'queued' || job.status === 'running') && (
                              <Button size="sm" onClick={() => cancelJob(job)}
                                className="h-7 px-3 text-[10px] bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/20">
                                <StopCircle className="w-3 h-3 mr-1" /> Cancel
                              </Button>
                            )}
                            <Button size="sm" onClick={() => deleteJob(job.id)}
                              className="h-7 px-3 text-[10px] bg-red-500/10 border border-red-400/30 text-red-400 hover:bg-red-500/20">
                              <Trash2 className="w-3 h-3 mr-1" /> Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <Button size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="h-8 px-3 text-xs bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30">
              ← Prev
            </Button>
            <span className="text-xs text-white/30">Page {page + 1}</span>
            <Button size="sm" disabled={jobs.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}
              className="h-8 px-3 text-xs bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30">
              Next →
            </Button>
          </div>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
