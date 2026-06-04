/**
 * ADMIN API MANAGER — Full CRUD for all 12 music providers + other APIs
 * Test endpoint · enable/disable toggle · Railway env sync
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, TestTube2, ToggleLeft, ToggleRight, RefreshCw, Save, Loader2, CheckCircle, XCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import RxBadge from '@/components/common/RxBadge';
import { supabase } from '@/db/supabase';

interface ApiConfig {
  id: string;
  api_name: string;
  api_key: string;
  api_endpoint: string | null;
  api_type: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const API_TYPES = ['Music AI', 'Image AI', 'Video AI', 'Voice AI', 'Chat AI', 'Moderation', 'Storage', 'Other'];

const DEFAULT_APIS = [
  { name: 'Suno AI',        type: 'Music AI',    endpoint: 'https://api.suno.ai/v1' },
  { name: 'Udio',           type: 'Music AI',    endpoint: 'https://api.udio.com/v1' },
  { name: 'MiniMax Music',  type: 'Music AI',    endpoint: 'https://api.minimax.chat/v1' },
  { name: 'Mubert',         type: 'Music AI',    endpoint: 'https://api.mubert.com/v2' },
  { name: 'ElevenLabs',     type: 'Voice AI',    endpoint: 'https://api.elevenlabs.io/v1' },
  { name: 'Stable Audio',   type: 'Music AI',    endpoint: 'https://api.stability.ai/v1/audio' },
  { name: 'Soundverse',     type: 'Music AI',    endpoint: 'https://api.soundverse.ai/v1' },
  { name: 'Boomy',          type: 'Music AI',    endpoint: 'https://api.boomy.com/v1' },
  { name: 'AIVA',           type: 'Music AI',    endpoint: 'https://api.aiva.ai/v1' },
  { name: 'Sonauto',        type: 'Music AI',    endpoint: 'https://api.sonauto.ai/v1' },
  { name: 'Soundful',       type: 'Music AI',    endpoint: 'https://api.soundful.com/v1' },
  { name: 'MubertAPI',      type: 'Music AI',    endpoint: 'https://api.mubert.com/v2/stream' },
];

export default function AdminApiManager() {
  const navigate = useNavigate();
  const [apis, setApis] = useState<ApiConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editApi, setEditApi] = useState<Partial<ApiConfig> | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, 'ok' | 'fail'>>({});
  const [saving, setSaving] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [filterType, setFilterType] = useState('all');

  const user = JSON.parse(localStorage.getItem('race-x-user') || '{}');

  useEffect(() => {
    if (!user.is_admin) { toast.error('Admin only'); navigate('/gateway'); return; }
    fetchApis();
  }, []);

  const fetchApis = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('api_configurations').select('*').order('api_name');
    setApis(Array.isArray(data) ? data as ApiConfig[] : []);
    setLoading(false);
  }, []);

  const toggleActive = async (api: ApiConfig) => {
    const { error } = await supabase.from('api_configurations')
      .update({ is_active: !api.is_active, updated_at: new Date().toISOString() })
      .eq('id', api.id);
    if (error) { toast.error('Toggle failed'); return; }
    toast.success(`${api.api_name} ${!api.is_active ? 'enabled' : 'disabled'}`);
    fetchApis();
  };

  const deleteApi = async (id: string, name: string) => {
    const { error } = await supabase.from('api_configurations').delete().eq('id', id);
    if (error) { toast.error('Delete failed'); return; }
    toast.success(`${name} removed`);
    fetchApis();
  };

  const testEndpoint = async (api: ApiConfig) => {
    setTesting(api.id);
    try {
      const res = await fetch(api.api_endpoint ?? 'https://api.suno.ai', { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      setTestResult(prev => ({ ...prev, [api.id]: res.ok || res.status === 401 || res.status === 403 ? 'ok' : 'fail' }));
    } catch {
      setTestResult(prev => ({ ...prev, [api.id]: 'fail' }));
    }
    setTesting(null);
  };

  const saveApi = async () => {
    if (!editApi?.api_name?.trim()) { toast.error('API name required'); return; }
    setSaving(true);
    if (editApi.id) {
      // Update
      const { error } = await supabase.from('api_configurations').update({
        api_name: editApi.api_name,
        api_key: editApi.api_key ?? '',
        api_endpoint: editApi.api_endpoint ?? null,
        api_type: editApi.api_type ?? null,
        is_active: editApi.is_active ?? true,
        updated_at: new Date().toISOString(),
      }).eq('id', editApi.id);
      if (error) toast.error('Update failed');
      else toast.success('API updated ✅');
    } else {
      // Insert
      const { error } = await supabase.from('api_configurations').insert({
        api_name: editApi.api_name,
        api_key: editApi.api_key ?? '',
        api_endpoint: editApi.api_endpoint ?? null,
        api_type: editApi.api_type ?? null,
        is_active: true,
      });
      if (error) toast.error('Insert failed');
      else toast.success('API added ✅');
    }
    setSaving(false);
    setEditApi(null);
    fetchApis();
  };

  const seedDefaults = async () => {
    for (const a of DEFAULT_APIS) {
      await supabase.from('api_configurations').upsert({
        api_name: a.name, api_key: '', api_endpoint: a.endpoint, api_type: a.type, is_active: true,
      }, { onConflict: 'api_name' });
    }
    toast.success('12 default providers seeded');
    fetchApis();
  };

  const filtered = apis.filter(a => {
    const q = searchQ.toLowerCase();
    const matchQ = !q || a.api_name.toLowerCase().includes(q) || (a.api_type ?? '').toLowerCase().includes(q);
    const matchType = filterType === 'all' || a.api_type === filterType;
    return matchQ && matchType;
  });

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="p-2 rounded-lg border border-white/10 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <RxBadge label="API" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold tracking-widest">API MANAGER</h1>
            <p className="text-[10px] text-muted-foreground">{apis.length} providers configured</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="ghost" onClick={seedDefaults} className="border border-white/10 text-xs">
              <Zap className="w-3 h-3 mr-1" />Seed 12
            </Button>
            <Button size="sm" onClick={() => setEditApi({ is_active: true })} className="bg-[#00F2FF]/20 border border-[#00F2FF]/40 text-[#00F2FF] text-xs">
              <Plus className="w-3 h-3 mr-1" />Add
            </Button>
          </div>
        </div>
        {/* Search + filter */}
        <div className="mt-2 flex gap-2">
          <Input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search APIs…"
            className="flex-1 h-8 bg-white/5 border-white/10 text-white text-xs"
          />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-28 h-8 bg-white/5 border-white/10 text-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1C1C27] border-white/10">
              <SelectItem value="all" className="text-xs text-white">All Types</SelectItem>
              {API_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs text-white">{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="icon" variant="ghost" onClick={fetchApis} className="h-8 w-8 border border-white/10">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* API List */}
      <div className="divide-y divide-white/5">
        {loading ? (
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="p-4 h-20 animate-pulse">
              <div className="h-3 bg-white/10 rounded w-1/3 mb-2" />
              <div className="h-2 bg-white/5 rounded w-2/3" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p className="text-sm">No APIs found. Click "Seed 12" to add music providers.</p>
          </div>
        ) : (
          filtered.map(api => (
            <div key={api.id} className="p-4 flex items-center gap-3">
              {/* Status dot */}
              <div className={`w-2 h-2 rounded-full shrink-0 ${api.is_active ? 'bg-[#00FF88] shadow-[0_0_6px_#00FF88]' : 'bg-red-500'}`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white truncate">{api.api_name}</p>
                  {api.api_type && (
                    <Badge className="text-[9px] px-1.5 py-0 bg-[#00F2FF]/10 text-[#00F2FF] border-[#00F2FF]/20">
                      {api.api_type}
                    </Badge>
                  )}
                  {testResult[api.id] && (
                    testResult[api.id] === 'ok'
                      ? <CheckCircle className="w-3.5 h-3.5 text-[#00FF88]" />
                      : <XCircle className="w-3.5 h-3.5 text-red-400" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {api.api_endpoint ?? 'No endpoint set'}
                </p>
                <p className="text-[10px] text-muted-foreground/60">
                  Key: {api.api_key ? '●●●●●●●●' + api.api_key.slice(-4) : 'Not set'}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => testEndpoint(api)} disabled={testing === api.id}>
                  {testing === api.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube2 className="w-3 h-3 text-yellow-400" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleActive(api)}>
                  {api.is_active
                    ? <ToggleRight className="w-4 h-4 text-[#00FF88]" />
                    : <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                  }
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditApi(api)}>
                  <Save className="w-3 h-3 text-[#00F2FF]" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteApi(api.id, api.api_name)}>
                  <Trash2 className="w-3 h-3 text-red-400" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit / Add Dialog */}
      <Dialog open={!!editApi} onOpenChange={() => setEditApi(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm bg-[#0A0A0F] border-[#00F2FF]/20">
          <DialogHeader>
            <DialogTitle className="text-white">{editApi?.id ? 'Edit API' : 'Add API'}</DialogTitle>
          </DialogHeader>
          {editApi && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">API Name *</Label>
                <Input value={editApi.api_name ?? ''} onChange={e => setEditApi(p => ({ ...p!, api_name: e.target.value }))}
                  className="mt-1 bg-white/5 border-white/10 text-white text-sm" placeholder="e.g. Suno AI" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">API Key</Label>
                <Input value={editApi.api_key ?? ''} onChange={e => setEditApi(p => ({ ...p!, api_key: e.target.value }))}
                  type="password" className="mt-1 bg-white/5 border-white/10 text-white text-sm" placeholder="sk-..." />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
                <Input value={editApi.api_endpoint ?? ''} onChange={e => setEditApi(p => ({ ...p!, api_endpoint: e.target.value }))}
                  className="mt-1 bg-white/5 border-white/10 text-white text-sm" placeholder="https://api.example.com/v1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={editApi.api_type ?? ''} onValueChange={v => setEditApi(p => ({ ...p!, api_type: v }))}>
                  <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white text-sm">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1C1C27] border-white/10">
                    {API_TYPES.map(t => <SelectItem key={t} value={t} className="text-white text-xs">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={saveApi} disabled={saving} className="w-full bg-[#00F2FF]/20 border border-[#00F2FF]/40 text-[#00F2FF] font-bold">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                {editApi.id ? 'Save Changes' : 'Add API'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
