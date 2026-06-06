/**
 * Admin Feature Registry
 * Central catalog of all tools, providers, models, and workflows
 * Admin can update status, priority, cost, and config without code deployment
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Database, Plus, Pencil, Trash2, Save, X,
  CheckCircle2, XCircle, AlertTriangle, ChevronDown, RefreshCw,
  Boxes, Cpu, Workflow, Zap, Filter, Download, Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

interface RegistryEntry {
  id: string;
  registry_type: 'tool' | 'provider' | 'model' | 'workflow';
  name: string;
  display_name: string;
  description: string | null;
  module: string;
  version: string;
  status: 'active' | 'deprecated' | 'beta' | 'disabled';
  config: Record<string, unknown>;
  capabilities: string[];
  cost_per_call: number;
  rate_limit_rpm: number;
  priority: number;
  fallback_to: string | null;
  updated_at: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  tool:     <Boxes className="w-3 h-3" />,
  provider: <Zap className="w-3 h-3" />,
  model:    <Cpu className="w-3 h-3" />,
  workflow: <Workflow className="w-3 h-3" />,
};

const TYPE_COLORS: Record<string, string> = {
  tool:     '#00F2FF',
  provider: '#BC13FE',
  model:    '#00FF88',
  workflow: '#FFD700',
};

const STATUS_CFG = {
  active:     { label: 'Active',     color: '#00FF88', bg: 'bg-[#00FF88]/10 border-[#00FF88]/20' },
  beta:       { label: 'Beta',       color: '#00F2FF', bg: 'bg-[#00F2FF]/10 border-[#00F2FF]/20' },
  deprecated: { label: 'Deprecated', color: '#FFD700', bg: 'bg-[#FFD700]/10 border-[#FFD700]/20' },
  disabled:   { label: 'Disabled',   color: '#FF4444', bg: 'bg-red-500/10 border-red-400/20' },
};

const EMPTY_ENTRY: Partial<RegistryEntry> = {
  registry_type: 'provider',
  name: '', display_name: '', description: '',
  module: '', version: '1.0.0', status: 'active',
  config: {}, capabilities: [],
  cost_per_call: 0, rate_limit_rpm: 60, priority: 5, fallback_to: null,
};

export default function AdminFeatureRegistry() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<RegistryEntry> | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('feature_registry').select('*').order('registry_type').order('priority');
    if (typeFilter !== 'all') query = query.eq('registry_type', typeFilter);
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (moduleFilter !== 'all') query = query.eq('module', moduleFilter);
    const { data } = await query;
    setEntries((data as RegistryEntry[]) ?? []);
    setLoading(false);
  }, [typeFilter, statusFilter, moduleFilter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const filtered = entries.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.display_name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = async (entry: RegistryEntry) => {
    const next = entry.status === 'active' ? 'disabled' : 'active';
    const { error } = await supabase.from('feature_registry').update({ status: next, updated_at: new Date().toISOString() }).eq('id', entry.id);
    if (error) { toast.error('Update failed'); return; }
    toast.success(`${entry.display_name} → ${next}`);
    fetchEntries();
  };

  const deleteEntry = async (id: string, name: string) => {
    const { error } = await supabase.from('feature_registry').delete().eq('id', id);
    if (error) { toast.error('Delete failed'); return; }
    toast.success(`${name} removed`);
    fetchEntries();
  };

  const saveEntry = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = {
        registry_type: editing.registry_type,
        name: editing.name?.trim(),
        display_name: editing.display_name?.trim(),
        description: editing.description,
        module: editing.module?.trim(),
        version: editing.version,
        status: editing.status,
        config: editing.config ?? {},
        capabilities: editing.capabilities ?? [],
        cost_per_call: editing.cost_per_call ?? 0,
        rate_limit_rpm: editing.rate_limit_rpm ?? 60,
        priority: editing.priority ?? 5,
        fallback_to: editing.fallback_to || null,
        updated_at: new Date().toISOString(),
      };

      if (editing.id) {
        const { error } = await supabase.from('feature_registry').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Entry updated');
      } else {
        const { error } = await supabase.from('feature_registry').insert(payload);
        if (error) throw error;
        toast.success('Entry added to registry');
      }
      setEditing(null);
      fetchEntries();
    } catch (e) {
      toast.error('Save failed');
    }
    setSaving(false);
  };

  const exportCSV = () => {
    const rows = [['type', 'name', 'display_name', 'module', 'status', 'version', 'cost_per_call', 'rate_limit_rpm', 'priority'].join(',')];
    entries.forEach(e => rows.push([e.registry_type, e.name, e.display_name, e.module, e.status, e.version, e.cost_per_call, e.rate_limit_rpm, e.priority].join(',')));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'feature_registry.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const modules = [...new Set(entries.map(e => e.module))];

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-[#0A0A0F] text-white pb-12">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3">
          <div className="flex items-center gap-3 max-w-7xl mx-auto">
            <button onClick={() => navigate('/admin/omniverse')} className="p-2 rounded-lg border border-white/10 hover:bg-white/5 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Database className="w-4 h-4 text-[#00F2FF] shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-black tracking-widest">FEATURE REGISTRY</h1>
              <p className="text-[10px] text-white/40">Central catalog — tools · providers · models · workflows</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" onClick={exportCSV}
                className="h-8 px-3 text-xs bg-white/5 border border-white/10 text-white/60 hover:text-white">
                <Download className="w-3 h-3 mr-1" /> CSV
              </Button>
              <Button size="sm" onClick={() => setEditing({ ...EMPTY_ENTRY })}
                className="h-8 px-3 text-xs bg-[#00F2FF]/10 border border-[#00F2FF]/30 text-[#00F2FF] hover:bg-[#00F2FF]/20">
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
              <button onClick={fetchEntries} className="p-2 rounded-lg border border-white/10 hover:bg-white/5">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['tool', 'provider', 'model', 'workflow'] as const).map(type => (
              <Card key={type} className="bg-white/[0.03] border-white/8 rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}>
                <CardContent className="p-3 flex items-center gap-3">
                  <span style={{ color: TYPE_COLORS[type] }}>{TYPE_ICONS[type]}</span>
                  <div>
                    <p className="text-lg font-black" style={{ color: TYPE_COLORS[type] }}>
                      {entries.filter(e => e.registry_type === type).length}
                    </p>
                    <p className="text-[9px] text-white/40 uppercase tracking-wider capitalize">{type}s</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[180px] max-w-[280px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-8 pl-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-32 text-xs bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="tool">Tools</SelectItem>
                <SelectItem value="provider">Providers</SelectItem>
                <SelectItem value="model">Models</SelectItem>
                <SelectItem value="workflow">Workflows</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-32 text-xs bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="beta">Beta</SelectItem>
                <SelectItem value="deprecated">Deprecated</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="h-8 w-32 text-xs bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                <SelectItem value="all">All Modules</SelectItem>
                {modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-white/30 ml-auto">{filtered.length} entries</p>
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Database className="w-10 h-10 mx-auto mb-3 text-white/20" />
              <p className="text-white/40 text-sm">No registry entries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Type', 'Name', 'Module', 'Status', 'Version', 'Priority', 'Cost/call', 'RPM', 'Actions'].map(h => (
                      <th key={h} className="text-left text-[9px] text-white/30 uppercase tracking-wider pb-2 pr-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((entry, i) => {
                    const sCfg = STATUS_CFG[entry.status];
                    return (
                      <motion.tr key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}
                        className="hover:bg-white/5 transition-colors">
                        <td className="py-2 pr-3">
                          <span style={{ color: TYPE_COLORS[entry.registry_type] }}>{TYPE_ICONS[entry.registry_type]}</span>
                        </td>
                        <td className="py-2 pr-3">
                          <div>
                            <p className="text-xs font-bold text-white whitespace-nowrap">{entry.display_name}</p>
                            <p className="text-[9px] text-white/30 font-mono">{entry.name}</p>
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <Badge className="text-[9px] px-1.5 py-0 bg-white/5 border-white/10 text-white/50 whitespace-nowrap">{entry.module}</Badge>
                        </td>
                        <td className="py-2 pr-3">
                          <Badge className={`text-[9px] px-1.5 py-0 border ${sCfg.bg} whitespace-nowrap`} style={{ color: sCfg.color }}>{sCfg.label}</Badge>
                        </td>
                        <td className="py-2 pr-3 text-xs text-white/40 whitespace-nowrap">{entry.version}</td>
                        <td className="py-2 pr-3">
                          <span className={`text-xs font-bold whitespace-nowrap ${entry.priority <= 3 ? 'text-red-400' : entry.priority <= 6 ? 'text-[#FFD700]' : 'text-white/40'}`}>
                            P{entry.priority}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-xs text-white/40 whitespace-nowrap">
                          {entry.cost_per_call > 0 ? `$${entry.cost_per_call.toFixed(6)}` : 'Free'}
                        </td>
                        <td className="py-2 pr-3 text-xs text-white/40 whitespace-nowrap">{entry.rate_limit_rpm}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => toggleStatus(entry)}
                              className={`p-1 rounded hover:bg-white/10 transition-colors ${entry.status === 'active' ? 'text-[#00FF88]' : 'text-white/30'}`}
                              title={entry.status === 'active' ? 'Disable' : 'Enable'}>
                              {entry.status === 'active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => setEditing(entry)}
                              className="p-1 rounded hover:bg-white/10 transition-colors text-white/40 hover:text-white">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteEntry(entry.id, entry.display_name)}
                              className="p-1 rounded hover:bg-white/10 transition-colors text-white/20 hover:text-red-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit / Add Dialog */}
        <Dialog open={!!editing} onOpenChange={open => { if (!open) setEditing(null); }}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-[#0d0d1a] border-white/10 text-white max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm font-black text-white">
                {editing?.id ? 'Edit Registry Entry' : 'Add Registry Entry'}
              </DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-white/40 block mb-1">Type</label>
                    <Select value={editing.registry_type ?? 'provider'} onValueChange={v => setEditing(p => ({ ...p, registry_type: v as RegistryEntry['registry_type'] }))}>
                      <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                        <SelectItem value="tool">Tool</SelectItem>
                        <SelectItem value="provider">Provider</SelectItem>
                        <SelectItem value="model">Model</SelectItem>
                        <SelectItem value="workflow">Workflow</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 block mb-1">Status</label>
                    <Select value={editing.status ?? 'active'} onValueChange={v => setEditing(p => ({ ...p, status: v as RegistryEntry['status'] }))}>
                      <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="beta">Beta</SelectItem>
                        <SelectItem value="deprecated">Deprecated</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {[
                  { key: 'name', label: 'Internal Name (snake_case)' },
                  { key: 'display_name', label: 'Display Name' },
                  { key: 'module', label: 'Module (music/studio/chat…)' },
                  { key: 'version', label: 'Version' },
                  { key: 'fallback_to', label: 'Fallback Provider (name)' },
                  { key: 'description', label: 'Description' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] text-white/40 block mb-1">{f.label}</label>
                    <Input
                      value={(editing as Record<string, unknown>)[f.key] as string ?? ''}
                      onChange={e => setEditing(p => ({ ...p, [f.key]: e.target.value }))}
                      className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/20"
                    />
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-white/40 block mb-1">Priority (1=highest)</label>
                    <Input type="number" min={1} max={10}
                      value={editing.priority ?? 5}
                      onChange={e => setEditing(p => ({ ...p, priority: Number(e.target.value) }))}
                      className="h-8 text-xs bg-white/5 border-white/10 text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 block mb-1">Cost/call ($)</label>
                    <Input type="number" step="0.000001"
                      value={editing.cost_per_call ?? 0}
                      onChange={e => setEditing(p => ({ ...p, cost_per_call: Number(e.target.value) }))}
                      className="h-8 text-xs bg-white/5 border-white/10 text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 block mb-1">Rate limit (RPM)</label>
                    <Input type="number"
                      value={editing.rate_limit_rpm ?? 60}
                      onChange={e => setEditing(p => ({ ...p, rate_limit_rpm: Number(e.target.value) }))}
                      className="h-8 text-xs bg-white/5 border-white/10 text-white" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={saveEntry} disabled={saving}
                    className="flex-1 h-9 bg-[#00F2FF]/10 border border-[#00F2FF]/30 text-[#00F2FF] hover:bg-[#00F2FF]/20 text-xs font-bold">
                    {saving ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                  <Button onClick={() => setEditing(null)}
                    className="flex-1 h-9 bg-white/5 border border-white/10 text-white/60 hover:text-white text-xs">
                    <X className="w-3 h-3 mr-1" /> Cancel
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
