/**
 * CLOUD RENDER FARM — Supabase Realtime job queue
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Cloud, Plus, RefreshCw, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import RxBadge from '@/components/common/RxBadge';
import { supabase } from '@/db/supabase';
import type { RenderJob } from '@/types/race-x';

const STATUS_CONFIG = {
  queued:    { icon: Clock,       color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  rendering: { icon: Loader2,    color: 'text-[#00F2FF]',  bg: 'bg-[#00F2FF]/10 border-[#00F2FF]/30' },
  completed: { icon: CheckCircle, color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30' },
  failed:    { icon: XCircle,    color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30' },
};

export default function CloudRenderFarm() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [projectName, setProjectName] = useState('');
  const [jobType, setJobType] = useState<'video' | 'image' | 'audio' | 'export'>('video');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
    // Realtime subscription
    const channel = supabase
      .channel('render-jobs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'render_jobs' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setJobs(prev => [payload.new as RenderJob, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setJobs(prev => prev.map(j => j.id === payload.new.id ? payload.new as RenderJob : j));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchJobs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('render_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(20);
    setJobs(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const submitJob = async () => {
    if (!projectName.trim()) { toast.error('Enter project name'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Login required'); return; }
    const { error } = await supabase.from('render_jobs').insert({
      user_id: user.id,
      project_name: projectName,
      job_type: jobType,
      status: 'queued',
      progress_percentage: 0,
      priority: 5,
    });
    if (error) toast.error('Failed to submit job');
    else { toast.success('Render job queued!'); setProjectName(''); }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00FF88]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/rx-studio/tools')} className="p-2 rounded-lg border border-white/10 hover:border-[#00FF88]/40 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <RxBadge label="RENDER" variant="green" />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold tracking-widest">CLOUD RENDER FARM</h1>
          <p className="text-[10px] text-muted-foreground">Supabase Realtime · Job Queue</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
          <span className="text-[10px] text-[#00FF88]">LIVE</span>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Submit */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-[#00FF88]/20 bg-white/[0.03] space-y-3">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-[#00FF88]" />
            <span className="text-xs font-bold tracking-widest text-[#00FF88]">SUBMIT RENDER JOB</span>
          </div>
          <div className="flex gap-2">
            <Input value={projectName} onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project name..." className="bg-white/5 border-white/10 text-sm" />
            <Select value={jobType} onValueChange={(v) => setJobType(v as typeof jobType)}>
              <SelectTrigger className="w-32 bg-white/5 border-white/10 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['video', 'image', 'audio', 'export'] as const).map(t => (
                  <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={submitJob} className="w-full bg-[#00FF88]/20 hover:bg-[#00FF88]/30 border border-[#00FF88]/40 text-[#00FF88] font-bold">
            <Plus className="w-4 h-4 mr-2" />QUEUE RENDER JOB
          </Button>
        </motion.div>

        {/* Job list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Render Queue ({jobs.length})</span>
            <Button size="sm" variant="ghost" onClick={fetchJobs} className="h-6 text-xs">
              <RefreshCw className="w-3 h-3 mr-1" />Refresh
            </Button>
          </div>

          {loading ? (
            Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
            ))
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Cloud className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No render jobs yet</p>
            </div>
          ) : (
            jobs.map((job) => {
              const cfg = STATUS_CONFIG[job.status];
              const Icon = cfg.icon;
              return (
                <motion.div key={job.id} layout
                  className={`p-3 rounded-xl border bg-white/[0.03] ${cfg.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${cfg.color} ${job.status === 'rendering' ? 'animate-spin' : ''}`} />
                      <span className="text-sm font-medium truncate">{job.project_name}</span>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{job.job_type}</Badge>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>{job.status}</span>
                  </div>
                  {job.status === 'rendering' && (
                    <div className="space-y-1">
                      <Progress value={job.progress_percentage} className="h-1" />
                      <p className="text-[10px] text-right text-muted-foreground">{job.progress_percentage}%</p>
                    </div>
                  )}
                  {job.status === 'completed' && job.output_url && (
                    <a href={job.output_url} target="_blank" rel="noreferrer"
                      className="text-[10px] text-[#00FF88] hover:underline">Download output →</a>
                  )}
                  {job.error_message && (
                    <p className="text-[10px] text-red-400 mt-1">{job.error_message}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(job.submitted_at).toLocaleString()}
                  </p>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
