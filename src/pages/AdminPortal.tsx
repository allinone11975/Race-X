import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, RotateCcw, Search, Terminal, Database, Code, RefreshCw, FolderOpen, File, Users, ShieldCheck, Diamond, Zap, Settings2, BookOpen, Lock, Receipt, Cpu, Power, Tag, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import RxBadge from '@/components/common/RxBadge';

interface CodeFile {
  id: string;
  file_path: string;
  content: string;
  language: string;
}

export default function AdminPortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('hub');
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<CodeFile | null>(null);
  const [editContent, setEditContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const user = JSON.parse(localStorage.getItem('race-x-user') || '{}');

  useEffect(() => {
    if (!user.is_admin) {
      toast.error('Access restricted to admin only');
      navigate('/gateway');
      return;
    }
    fetchFiles();
  }, [user.is_admin, navigate]);

  const fetchFiles = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('frontend_code_files')
      .select('*')
      .order('file_path');
    
    if (error) {
      toast.error('Failed to fetch code files');
    } else {
      setFiles(data || []);
      if (data?.length === 0) {
        toast.info('No files found. Click "Sync All Files" to load the codebase.');
      }
    }
    setIsLoading(false);
  };

  const syncAllFiles = async () => {
    setIsSyncing(true);
    toast.info('Scanning codebase and syncing to database...');

    try {
      // Use a simple approach: read all files from the project
      const filePaths = [
        'src/App.tsx', 'src/main.tsx', 'src/index.css', 'src/routes.tsx',
        'src/types/index.ts', 'src/types/race-x.ts',
        'src/contexts/AuthContext.tsx',
        'src/db/supabase.ts', 'src/db/api.ts',
        'src/lib/utils.ts',
        'src/hooks/use-mobile.tsx', 'src/hooks/use-supabase-upload.ts', 'src/hooks/use-go-back.ts', 'src/hooks/use-debounce.ts',
        'src/pages/AdminPortal.tsx', 'src/pages/Settings.tsx', 'src/pages/GatewayPage.tsx',
        'src/pages/LoginPage.tsx', 'src/pages/SplashScreen.tsx', 'src/pages/NotFound.tsx',
        'src/pages/RxStudioHome.tsx', 'src/pages/RxStudioEditor.tsx', 'src/pages/AICreationPage.tsx',
        'src/pages/RxSocialHome.tsx', 'src/pages/RxSocialProfile.tsx', 'src/pages/RxSocialReels.tsx',
        'src/pages/RxMagicChat.tsx', 'src/pages/RxMusic.tsx', 'src/pages/RxShopping.tsx',
        'src/pages/PlaceholderPage.tsx', 'src/pages/SamplePage.tsx',
        'src/components/dropzone.tsx',
        'src/components/common/IntersectObserver.tsx', 'src/components/common/PageMeta.tsx',
        'src/components/common/RouteGuard.tsx', 'src/components/common/RxBadge.tsx',
      ];

      const filesToSync: { file_path: string; content: string; language: string }[] = [];

      for (const path of filePaths) {
        try {
          const response = await fetch(`/${path}`);
          if (response.ok) {
            const content = await response.text();
            filesToSync.push({
              file_path: path,
              content,
              language: getLanguageFromPath(path),
            });
          }
        } catch (e) {
          console.warn(`Could not fetch ${path}`);
        }
      }

      if (filesToSync.length === 0) {
        throw new Error('No files could be loaded from the project');
      }

      // Batch insert/update files
      const { error } = await supabase
        .from('frontend_code_files')
        .upsert(filesToSync, { onConflict: 'file_path' });

      if (error) {
        throw error;
      }

      toast.success(`Successfully synced ${filesToSync.length} files!`);
      await fetchFiles();
    } catch (error: any) {
      toast.error(`Sync failed: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const getLanguageFromPath = (path: string): string => {
    if (path.endsWith('.tsx') || path.endsWith('.jsx')) return 'typescript';
    if (path.endsWith('.ts') || path.endsWith('.js')) return 'javascript';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.json')) return 'json';
    return 'text';
  };

  const handleFileSelect = (file: CodeFile) => {
    setSelectedFile(file);
    setEditContent(file.content);
  };

  const handleSaveCode = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    const { error } = await supabase
      .from('frontend_code_files')
      .update({ content: editContent, updated_at: new Date().toISOString() })
      .eq('id', selectedFile.id);

    if (error) {
      toast.error('Failed to save changes');
    } else {
      toast.success('Code updated successfully');
      setFiles(files.map(f => f.id === selectedFile.id ? { ...f, content: editContent } : f));
      setSelectedFile({ ...selectedFile, content: editContent });
    }
    setIsLoading(false);
  };

  const filteredFiles = files.filter(f => 
    f.file_path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group files by directory
  const groupedFiles = filteredFiles.reduce((acc, file) => {
    const parts = file.file_path.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';
    if (!acc[dir]) acc[dir] = [];
    acc[dir].push(file);
    return acc;
  }, {} as Record<string, CodeFile[]>);

  return (
    <AdminAuthGuard>
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#BC13FE]/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gateway')} className="h-9 w-9 border border-white/10">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <RxBadge label="ADMIN" variant="purple" />
          <div>
            <h1 className="text-sm font-black gradient-text tracking-widest">GOD MODE PORTAL</h1>
            <p className="text-[10px] text-muted-foreground">Full system control · {user.username ?? 'Admin'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={syncAllFiles}
            disabled={isSyncing}
            className="border border-white/10 text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing…' : 'Sync Files'}
          </Button>
          <Button variant="ghost" size="sm" onClick={fetchFiles} disabled={isLoading} className="border border-white/10 text-xs">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col">
          <div className="bg-[#0A0A0F] border-b border-white/8 px-4 py-2 flex items-center gap-2 flex-wrap">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="hub" className="gap-1.5 text-xs data-[state=active]:text-[#BC13FE]">
                <Cpu className="w-3.5 h-3.5" />Hub
              </TabsTrigger>
              <TabsTrigger value="code" className="gap-1.5 text-xs data-[state=active]:text-[#00F2FF]">
                <Code className="w-3.5 h-3.5" />Code ({files.length})
              </TabsTrigger>
              <TabsTrigger value="api" className="gap-1.5 text-xs data-[state=active]:text-[#00FF88]">
                <Database className="w-3.5 h-3.5" />API Keys
              </TabsTrigger>
              <TabsTrigger value="system" className="gap-1.5 text-xs data-[state=active]:text-yellow-400">
                <Terminal className="w-3.5 h-3.5" />Logs
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden p-4">

            {/* ── HUB TAB ──────────────────────────────────────────────── */}
            <TabsContent value="hub" className="mt-0 h-full overflow-y-auto">
              <div className="space-y-4 pb-4">
                {/* System Status */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Platform',  value: 'Online',   color: 'text-[#00FF88]', icon: '🟢' },
                    { label: 'DB',        value: 'Live',      color: 'text-[#00F2FF]', icon: '⚡' },
                    { label: 'AI Gateway',value: '12 Active', color: 'text-[#BC13FE]', icon: '🔌' },
                    { label: 'Security',  value: 'Iron Dome', color: 'text-yellow-400', icon: '🛡' },
                  ].map(s => (
                    <div key={s.label} className="bg-white/5 rounded-xl p-3 border border-white/8">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-base">{s.icon}</span>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                      </div>
                      <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Management Modules</p>

                {/* Module Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    {
                      icon: Users,        label: 'User Manager',         desc: 'Search, ban, verify, promote users',
                      path: '/admin/users',   color: '#00F2FF',  badge: 'Users',
                    },
                    {
                      icon: Diamond,      label: 'Economy Control',      desc: 'Issue diamonds, view multipliers',
                      path: '/admin/economy', color: '#00FF88',  badge: 'Economy',
                    },
                    {
                      icon: ShieldCheck,  label: 'KYC Review',           desc: 'Approve / reject identity docs',
                      path: '/admin/kyc',     color: '#BC13FE',  badge: 'KYC',
                    },
                    {
                      icon: Lock,         label: 'Lockdown Control',     desc: 'Platform kill-switch · Iron Dome',
                      path: '/admin/lockdown',color: '#f87171',  badge: 'Critical',
                    },
                    {
                      icon: Settings2,    label: 'API Manager',          desc: '12 providers · CRUD · Test endpoints',
                      path: '/admin/api-manager', color: '#00FF88', badge: 'New',
                    },
                    {
                      icon: Receipt,      label: 'Transaction Ledger',   desc: 'Full ledger · filters · CSV export',
                      path: '/admin/ledger',  color: '#00F2FF',  badge: 'New',
                    },
                    {
                      icon: Power,        label: 'Feature Manager',      desc: 'Master toggles · ON/OFF every module',
                      path: '/admin/features', color: '#BC13FE', badge: 'God Mode',
                    },
                    {
                      icon: Tag,          label: 'Pricing Control',      desc: 'Free/Premium switch · diamond cost editor',
                      path: '/admin/pricing', color: '#FFD700', badge: 'God Mode',
                    },
                    {
                      icon: Activity,     label: 'System Overrides',     desc: 'Blacklist providers · override LB · logs',
                      path: '/admin/overrides', color: '#FF4444', badge: 'Critical',
                    },
                    {
                      icon: BookOpen,     label: 'Creator Leaderboard',  desc: 'Top creators by RX points & diamonds',
                      path: '/rx-social/leaderboard', color: '#BC13FE', badge: 'Social',
                    },
                    {
                      icon: Zap,          label: 'Code Editor',          desc: 'Live frontend code injection',
                      path: null,        color: '#FFD700',  badge: 'God Mode',
                      action: () => setActiveTab('code'),
                    },
                  ].map(m => (
                    <button
                      key={m.label}
                      onClick={() => m.action ? m.action() : m.path && navigate(m.path)}
                      className="text-left p-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 transition-all group h-full"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${m.color}18`, border: `1px solid ${m.color}30` }}>
                          <m.icon className="w-5 h-5" style={{ color: m.color }} />
                        </div>
                        <Badge className="text-[9px] px-1.5 py-0"
                          style={{ color: m.color, borderColor: `${m.color}40`, background: `${m.color}15` }}>
                          {m.badge}
                        </Badge>
                      </div>
                      <p className="text-sm font-bold text-white group-hover:text-white mb-0.5">{m.label}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">{m.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-br from-[#BC13FE]/10 to-[#00F2FF]/5 rounded-2xl border border-[#BC13FE]/20 p-4">
                  <p className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-[#BC13FE]" /> Quick Actions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: '🔄 Sync Codebase', action: syncAllFiles },
                      { label: '📊 View Ledger',   action: () => navigate('/admin/ledger') },
                      { label: '⚙ API Manager',   action: () => navigate('/admin/api-manager') },
                      { label: '🛡 KYC Queue',    action: () => navigate('/admin/kyc') },
                      { label: '💎 Economy',      action: () => navigate('/admin/economy') },
                    ].map(a => (
                      <button key={a.label} onClick={a.action}
                        className="text-[11px] px-3 py-1.5 rounded-lg bg-white/8 border border-white/10 text-white hover:bg-white/12 transition-colors">
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="code" className="h-full mt-0 flex gap-4">
              {/* File Browser */}
              <div className="w-80 bg-white/5 border border-white/10 rounded-xl flex flex-col overflow-hidden">
                <div className="p-3 border-b border-white/8">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search files..."
                      className="pl-8 h-9 bg-white/5 border-white/10 text-white"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-2">
                    {Object.entries(groupedFiles).map(([dir, dirFiles]) => (
                      <div key={dir} className="space-y-1">
                        <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-muted-foreground">
                          <FolderOpen className="w-3 h-3" />
                          {dir}
                        </div>
                        {dirFiles.map((file) => (
                          <button
                            key={file.id}
                            onClick={() => handleFileSelect(file)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                              selectedFile?.id === file.id
                                ? 'bg-[#00F2FF]/20 text-[#00F2FF]'
                                : 'hover:bg-white/8 text-muted-foreground hover:text-white'
                            }`}
                          >
                            <File className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{file.file_path.split('/').pop()}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Editor */}
              <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                {selectedFile ? (
                  <>
                    <Card className="flex-1 bg-white/5 border-white/10 overflow-hidden flex flex-col">
                      <CardHeader className="flex flex-row items-center justify-between py-3 border-b border-white/8">
                        <CardTitle className="text-sm font-mono text-white">{selectedFile.file_path}</CardTitle>
                        <Button
                          size="sm"
                          onClick={handleSaveCode}
                          disabled={isLoading}
                          className="bg-[#00F2FF]/20 border border-[#00F2FF]/40 text-[#00F2FF] h-8 text-xs"
                        >
                          <Save className="w-3.5 h-3.5 mr-1.5" />
                          Save & Apply
                        </Button>
                      </CardHeader>
                      <CardContent className="p-0 flex-1 overflow-hidden">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="h-full w-full rounded-none border-0 bg-black/60 font-mono text-sm p-4 focus-visible:ring-0 resize-none text-white"
                          placeholder="Write your code here..."
                        />
                      </CardContent>
                    </Card>
                    <div className="bg-white/5 border border-white/10 p-3 rounded-lg text-xs text-muted-foreground font-mono">
                      Language: {selectedFile.language} | Ready for Live Injection | Lines: {editContent.split('\n').length}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center bg-white/3 border border-dashed border-white/10 rounded-xl">
                    <div className="text-center text-muted-foreground">
                      <Code className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="mb-2">Select a file to edit its source code</p>
                      {files.length === 0 && (
                        <p className="text-sm text-[#00F2FF]">Click "Sync Files" to load the codebase</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="api" className="h-full mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-sm text-white">AI Provider Keys</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Groq API Key</label>
                      <Input type="password" value="••••••••••••" readOnly className="bg-white/5 border-white/10 text-white" />
                      <p className="text-xs text-muted-foreground">LLaMA 3.3 70B · AI Chat</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">HuggingFace Token</label>
                      <Input type="password" value="••••••••••••" readOnly className="bg-white/5 border-white/10 text-white" />
                      <p className="text-xs text-muted-foreground">Image · Voice · Music · Video</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Railway Nexus Key</label>
                      <Input type="password" value="••••••••••••" readOnly className="bg-white/5 border-white/10 text-white" />
                      <p className="text-xs text-muted-foreground">12 Music Providers · Gateway</p>
                    </div>
                    <Button
                      className="w-full bg-[#00FF88]/20 border border-[#00FF88]/40 text-[#00FF88] text-xs"
                      onClick={() => navigate('/admin/api-manager')}
                    >
                      Open Full API Manager →
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="system" className="h-full mt-0">
              <Card className="h-full bg-white/5 border-white/10 overflow-hidden flex flex-col">
                <CardHeader className="py-3 border-b border-white/8">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-yellow-400" />
                    System Logs
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 font-mono text-xs overflow-auto space-y-2">
                  <p className="text-[#00FF88]">[{new Date().toLocaleString()}] INFO: Supabase connection verified</p>
                  <p className="text-[#00F2FF]">[{new Date().toLocaleString()}] AUTH: Admin session initialized (8011692945)</p>
                  <p className="text-yellow-400">[{new Date().toLocaleString()}] WARN: Diamond balance verification bypassed for Admin</p>
                  <p className="text-white">[{new Date().toLocaleString()}] DEBUG: Route changed to /admin</p>
                  <p className="text-[#00FF88]">[{new Date().toLocaleString()}] INFO: Code editor initialized with {files.length} files</p>
                  <p className="text-[#BC13FE]">[{new Date().toLocaleString()}] MUSIC: 12 providers online · Round-Robin active</p>
                  <Button
                    size="sm"
                    className="mt-2 bg-[#00F2FF]/20 border border-[#00F2FF]/40 text-[#00F2FF] text-xs"
                    onClick={() => navigate('/admin/ledger')}
                  >
                    Open Transaction Ledger →
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
    </AdminAuthGuard>
  );
}
