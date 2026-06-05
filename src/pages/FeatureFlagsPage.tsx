import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ArrowLeft, Plus, Search, Flag, AlertTriangle, Clock, Edit, Trash2,
  History, ChevronRight, Shield, ToggleLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { RxBadge } from '@/components/common/RxBadge';

interface FeatureFlag {
  id: string;
  flag_name: string;
  category: string;
  description: string;
  status: boolean;
  rollout_scope: 'global' | 'region' | 'tier';
  rollout_config: Record<string, unknown>;
  beta_enabled: boolean;
  beta_percentage: number;
  is_critical: boolean;
  updated_at: string;
}

interface FlagHistory {
  id: string;
  action: string;
  old_value: Record<string, unknown>;
  new_value: Record<string, unknown>;
  changed_at: string;
}

const categoryColors: Record<string, string> = {
  'AI Tools': 'text-[#00F2FF] bg-[#00F2FF]/10 border-[#00F2FF]/30',
  'Economy': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  'Social': 'text-pink-400 bg-pink-400/10 border-pink-400/30',
  'Studio': 'text-[#BC13FE] bg-[#BC13FE]/10 border-[#BC13FE]/30',
  'Shopping': 'text-green-400 bg-green-400/10 border-green-400/30',
  'Admin': 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  'System': 'text-red-400 bg-red-400/10 border-red-400/30',
  'Experimental': 'text-purple-400 bg-purple-400/10 border-purple-400/30',
};

export default function FeatureFlagsPage() {
  const navigate = useNavigate();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [filteredFlags, setFilteredFlags] = useState<FeatureFlag[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [history, setHistory] = useState<FlagHistory[]>([]);
  const [activePanel, setActivePanel] = useState<'flags' | 'rollout' | 'beta' | 'history' | 'danger'>('flags');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newFlagName, setNewFlagName] = useState('');
  const [newFlagCategory, setNewFlagCategory] = useState('AI Tools');
  const [newFlagDesc, setNewFlagDesc] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem('race-x-user') || '{}');

  const fetchFlags = useCallback(async () => {
    const { data, error } = await supabase
      .from('rx_feature_flags')
      .select('*')
      .order('category', { ascending: true });
    if (!error && data) setFlags(data);
  }, []);

  useEffect(() => {
    if (!user.is_admin) { navigate('/gateway'); return; }
    fetchFlags();
  }, [user.is_admin, navigate, fetchFlags]);

  useEffect(() => {
    let filtered = flags;
    if (searchTerm) filtered = filtered.filter(f => f.flag_name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (categoryFilter !== 'all') filtered = filtered.filter(f => f.category === categoryFilter);
    if (statusFilter !== 'all') filtered = filtered.filter(f => statusFilter === 'on' ? f.status : !f.status);
    setFilteredFlags(filtered);
  }, [flags, searchTerm, categoryFilter, statusFilter]);

  const toggleFlag = async (flag: FeatureFlag) => {
    const newStatus = !flag.status;
    if (flag.is_critical && !newStatus) {
      if (!window.confirm(`WARNING: "${flag.flag_name}" is a critical flag. Disabling it may affect billing or generation limits. Proceed?`)) return;
    }

    const { error } = await supabase
      .from('rx_feature_flags')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', flag.id);

    if (error) { toast.error('Failed to toggle flag'); return; }

    await supabase.from('rx_flag_history').insert({
      flag_id: flag.id,
      action: newStatus ? 'enabled' : 'disabled',
      old_value: { status: flag.status },
      new_value: { status: newStatus },
    });

    setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, status: newStatus } : f));
    toast.success(`Flag "${flag.flag_name}" ${newStatus ? 'enabled' : 'disabled'}`);
  };

  const fetchHistory = async (flagId: string) => {
    const { data } = await supabase
      .from('rx_flag_history')
      .select('*')
      .eq('flag_id', flagId)
      .order('changed_at', { ascending: false })
      .limit(20);
    if (data) setHistory(data);
  };

  const handleSelectFlag = (flag: FeatureFlag) => {
    setSelectedFlag(flag);
    fetchHistory(flag.id);
  };

  const updateBetaConfig = async () => {
    if (!selectedFlag) return;
    const { error } = await supabase
      .from('rx_feature_flags')
      .update({ beta_enabled: selectedFlag.beta_enabled, beta_percentage: selectedFlag.beta_percentage, updated_at: new Date().toISOString() })
      .eq('id', selectedFlag.id);

    if (!error) {
      await supabase.from('rx_flag_history').insert({
        flag_id: selectedFlag.id,
        action: 'beta_updated',
        old_value: {},
        new_value: { beta_enabled: selectedFlag.beta_enabled, beta_percentage: selectedFlag.beta_percentage },
      });
      setFlags(prev => prev.map(f => f.id === selectedFlag.id ? selectedFlag : f));
      toast.success('Beta configuration saved');
    }
  };

  const addNewFlag = async () => {
    if (!newFlagName.trim()) { toast.error('Flag name required'); return; }
    setIsLoading(true);
    const { error } = await supabase.from('rx_feature_flags').insert({
      flag_name: newFlagName.trim().toLowerCase().replace(/\s+/g, '_'),
      category: newFlagCategory,
      description: newFlagDesc,
      status: false,
    });
    if (error) { toast.error('Failed to create flag'); }
    else { toast.success('Flag created'); setShowAddDialog(false); setNewFlagName(''); setNewFlagDesc(''); fetchFlags(); }
    setIsLoading(false);
  };

  const bulkAction = async (categoryName: string, enable: boolean) => {
    if (!window.confirm(`${enable ? 'Enable' : 'Disable'} ALL flags in category "${categoryName}"?`)) return;
    const { error } = await supabase
      .from('rx_feature_flags')
      .update({ status: enable, updated_at: new Date().toISOString() })
      .eq('category', categoryName);
    if (!error) { fetchFlags(); toast.success(`Bulk ${enable ? 'enable' : 'disable'} complete for ${categoryName}`); }
  };

  const categories = ['AI Tools', 'Economy', 'Social', 'Studio', 'Shopping', 'Admin', 'System', 'Experimental'];

  return (
    <div className="min-h-screen carbon-fiber flex flex-col">
      {/* Header */}
      <div className="glass-strong border-b border-[#00F2FF]/20 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="text-[#00F2FF] hover:bg-[#00F2FF]/10">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-xl font-bold" style={{ background: 'linear-gradient(90deg, #00F2FF, #BC13FE)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Feature Flag Admin System
            </h1>
            <p className="text-xs text-muted-foreground">Rollout Control & Beta Testing — Phase 3</p>
          </div>
        </div>
        <Button onClick={() => setShowAddDialog(true)} size="sm"
          className="bg-[#00F2FF]/10 border border-[#00F2FF]/30 text-[#00F2FF] hover:bg-[#00F2FF]/20 gap-2">
          <Plus className="w-4 h-4" /> Add Flag
        </Button>
      </div>

      {/* Sub-nav */}
      <div className="glass-strong border-b border-border px-4 py-2 flex gap-1 overflow-x-auto">
        {[
          { key: 'flags', label: 'Flags Table', icon: <Flag className="w-3 h-3" /> },
          { key: 'rollout', label: 'Rollout Controls', icon: <ToggleLeft className="w-3 h-3" /> },
          { key: 'beta', label: 'Beta Testing', icon: <Shield className="w-3 h-3" /> },
          { key: 'history', label: 'Change History', icon: <History className="w-3 h-3" /> },
          { key: 'danger', label: 'Danger Zone', icon: <AlertTriangle className="w-3 h-3" /> },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActivePanel(tab.key as typeof activePanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
              activePanel === tab.key
                ? 'bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden p-4">

        {/* FLAGS TABLE */}
        {activePanel === 'flags' && (
          <div className="space-y-4 h-full flex flex-col">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-44">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search flags..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 bg-black/30" />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40 bg-black/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 bg-black/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="on">Enabled</SelectItem>
                  <SelectItem value="off">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="glass-strong border-border flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-xs">
                    <thead className="border-b border-border sticky top-0 bg-card">
                      <tr className="text-muted-foreground">
                        <th className="text-left px-4 py-3 whitespace-nowrap">Flag Name</th>
                        <th className="text-left px-4 py-3 whitespace-nowrap">Category</th>
                        <th className="text-left px-4 py-3 whitespace-nowrap">Status</th>
                        <th className="text-left px-4 py-3 whitespace-nowrap">Scope</th>
                        <th className="text-left px-4 py-3 whitespace-nowrap">Beta%</th>
                        <th className="text-left px-4 py-3 whitespace-nowrap">Last Modified</th>
                        <th className="text-left px-4 py-3 whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredFlags.map(flag => (
                        <tr key={flag.id} className="hover:bg-white/5">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {flag.is_critical && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
                              <span className="font-mono">{flag.flag_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] border ${categoryColors[flag.category] || ''}`}>
                              {flag.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Switch checked={flag.status} onCheckedChange={() => toggleFlag(flag)} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap capitalize text-muted-foreground">{flag.rollout_scope}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {flag.beta_enabled ? <span className="text-[#BC13FE]">{flag.beta_percentage}%</span> : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                            {new Date(flag.updated_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[#00F2FF]"
                                onClick={() => { handleSelectFlag(flag); setActivePanel('history'); }}>
                                <History className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[#BC13FE]"
                                onClick={() => { handleSelectFlag(flag); setActivePanel('beta'); }}>
                                <Edit className="w-3 h-3" />
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
          </div>
        )}

        {/* ROLLOUT CONTROLS */}
        {activePanel === 'rollout' && (
          <div className="space-y-4 max-w-2xl">
            <Card className="glass-strong border-[#00F2FF]/20 relative">
              <RxBadge />
              <CardHeader><CardTitle className="text-sm text-[#00F2FF]">Rollout Controls Panel</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Select Feature Flag</label>
                  <Select value={selectedFlag?.id || ''} onValueChange={id => { const f = flags.find(fl => fl.id === id); if (f) handleSelectFlag(f); }}>
                    <SelectTrigger className="bg-black/30"><SelectValue placeholder="Select a flag..." /></SelectTrigger>
                    <SelectContent>
                      {flags.map(f => <SelectItem key={f.id} value={f.id}>{f.flag_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {selectedFlag && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Rollout Scope</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['global', 'region', 'tier'].map(scope => (
                          <button key={scope}
                            onClick={() => setSelectedFlag({ ...selectedFlag, rollout_scope: scope as FeatureFlag['rollout_scope'] })}
                            className={`py-2 rounded-lg text-sm border transition-colors capitalize ${
                              selectedFlag.rollout_scope === scope
                                ? 'bg-[#00F2FF]/20 border-[#00F2FF] text-[#00F2FF]'
                                : 'border-border text-muted-foreground hover:border-[#00F2FF]/50'
                            }`}>
                            {scope}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full bg-[#00F2FF]/10 border border-[#00F2FF]/30 text-[#00F2FF] hover:bg-[#00F2FF]/20"
                      onClick={async () => {
                        await supabase.from('rx_feature_flags').update({ rollout_scope: selectedFlag.rollout_scope }).eq('id', selectedFlag.id);
                        setFlags(prev => prev.map(f => f.id === selectedFlag.id ? selectedFlag : f));
                        toast.success('Rollout configuration saved');
                      }}>
                      Save Rollout Config
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* BETA TESTING */}
        {activePanel === 'beta' && (
          <div className="space-y-4 max-w-2xl">
            <Card className="glass-strong border-[#BC13FE]/20 relative">
              <RxBadge />
              <CardHeader><CardTitle className="text-sm text-[#BC13FE]">Beta Testing Mode</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Select Feature Flag</label>
                  <Select value={selectedFlag?.id || ''} onValueChange={id => { const f = flags.find(fl => fl.id === id); if (f) handleSelectFlag(f); }}>
                    <SelectTrigger className="bg-black/30"><SelectValue placeholder="Select a flag..." /></SelectTrigger>
                    <SelectContent>
                      {flags.map(f => <SelectItem key={f.id} value={f.id}>{f.flag_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {selectedFlag && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Enable Beta Testing</div>
                        <div className="text-xs text-muted-foreground">Roll out to a percentage of users</div>
                      </div>
                      <Switch
                        checked={selectedFlag.beta_enabled}
                        onCheckedChange={v => setSelectedFlag({ ...selectedFlag, beta_enabled: v })}
                      />
                    </div>
                    {selectedFlag.beta_enabled && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Beta Percentage</span>
                            <span className="text-[#BC13FE] font-bold">{selectedFlag.beta_percentage}%</span>
                          </div>
                          <Slider
                            value={[selectedFlag.beta_percentage]}
                            onValueChange={([v]) => setSelectedFlag({ ...selectedFlag, beta_percentage: v })}
                            min={0} max={100} step={5}
                            className="[&_[role=slider]]:bg-[#BC13FE] [&_[role=slider]]:border-[#BC13FE]"
                          />
                        </div>
                      </div>
                    )}
                    <Button className="w-full bg-[#BC13FE]/10 border border-[#BC13FE]/30 text-[#BC13FE] hover:bg-[#BC13FE]/20"
                      onClick={updateBetaConfig}>
                      Save Beta Configuration
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* HISTORY */}
        {activePanel === 'history' && (
          <div className="space-y-4 max-w-3xl">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Select Feature Flag</label>
              <Select value={selectedFlag?.id || ''} onValueChange={id => { const f = flags.find(fl => fl.id === id); if (f) handleSelectFlag(f); }}>
                <SelectTrigger className="w-80 bg-black/30"><SelectValue placeholder="Select a flag..." /></SelectTrigger>
                <SelectContent>
                  {flags.map(f => <SelectItem key={f.id} value={f.id}>{f.flag_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Card className="glass-strong border-border">
              <CardHeader className="border-b border-border py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-[#00F2FF]" /> Change History
                  {selectedFlag && <span className="text-muted-foreground font-mono text-xs">— {selectedFlag.flag_name}</span>}
                </CardTitle>
              </CardHeader>
              <ScrollArea className="h-96">
                <div className="divide-y divide-border">
                  {history.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground text-sm">
                      {selectedFlag ? 'No history for this flag yet.' : 'Select a flag to view history.'}
                    </div>
                  ) : history.map(h => (
                    <div key={h.id} className="flex items-start gap-3 px-4 py-3 text-xs">
                      <ChevronRight className="w-3 h-3 mt-0.5 text-[#00F2FF] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold capitalize text-[#BC13FE]">{h.action}</span>
                          <span className="text-muted-foreground">{new Date(h.changed_at).toLocaleString()}</span>
                        </div>
                        {h.old_value && Object.keys(h.old_value).length > 0 && (
                          <div className="mt-1 text-muted-foreground">
                            <span className="text-red-400">Before:</span> {JSON.stringify(h.old_value)}
                          </div>
                        )}
                        {h.new_value && Object.keys(h.new_value).length > 0 && (
                          <div className="mt-0.5 text-muted-foreground">
                            <span className="text-green-400">After:</span> {JSON.stringify(h.new_value)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>
        )}

        {/* DANGER ZONE */}
        {activePanel === 'danger' && (
          <div className="space-y-4 max-w-3xl">
            <Card className="glass-strong border-red-400/30 relative">
              <RxBadge />
              <CardHeader className="border-b border-red-400/20">
                <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Critical Flags
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {flags.filter(f => f.is_critical).map(flag => (
                  <div key={flag.id} className="flex items-center justify-between p-3 rounded-lg border border-red-400/20 bg-red-400/5">
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3 text-red-400" />
                        <span className="font-mono text-sm">{flag.flag_name}</span>
                        <Badge className={`text-[10px] border ${flag.status ? 'bg-green-400/10 text-green-400 border-green-400/30' : 'bg-red-400/10 text-red-400 border-red-400/30'}`}>
                          {flag.status ? 'ON' : 'OFF'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{flag.description}</p>
                    </div>
                    <Switch checked={flag.status} onCheckedChange={() => toggleFlag(flag)} />
                  </div>
                ))}
                <Button variant="outline" className="w-full border-red-400/30 text-red-400 hover:bg-red-400/10"
                  onClick={() => {
                    if (window.confirm('DANGER: Disable ALL critical flags? This affects billing and generation limits.')) {
                      flags.filter(f => f.is_critical && f.status).forEach(f => toggleFlag(f));
                    }
                  }}>
                  Disable All Critical Flags
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-strong border-border relative">
              <RxBadge />
              <CardHeader className="border-b border-border py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Flag className="w-4 h-4 text-[#BC13FE]" /> Bulk Actions by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${categoryColors[cat] || ''}`}>{cat}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs border-green-400/30 text-green-400 hover:bg-green-400/10"
                        onClick={() => bulkAction(cat, true)}>Enable All</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-red-400/30 text-red-400 hover:bg-red-400/10"
                        onClick={() => bulkAction(cat, false)}>Disable All</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Add Flag Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="glass-strong border-[#00F2FF]/30 max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle className="text-[#00F2FF]">Add New Feature Flag</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-normal">Flag Name</label>
              <Input placeholder="e.g. new_ai_feature_v2" value={newFlagName} onChange={e => setNewFlagName(e.target.value)} className="bg-black/30 font-mono" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-normal">Category</label>
              <Select value={newFlagCategory} onValueChange={setNewFlagCategory}>
                <SelectTrigger className="bg-black/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-normal">Description</label>
              <Input placeholder="What does this flag control?" value={newFlagDesc} onChange={e => setNewFlagDesc(e.target.value)} className="bg-black/30" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={addNewFlag} disabled={isLoading} className="bg-[#00F2FF]/20 border border-[#00F2FF]/50 text-[#00F2FF] hover:bg-[#00F2FF]/30">
              Create Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
