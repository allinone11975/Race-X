/**
 * CLOUD VAULT — File manager backed by Supabase Storage
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Cloud, Upload, Trash2, Download, FolderOpen, Music, Image, Film, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import RxBadge from '@/components/common/RxBadge';
import { supabase } from '@/db/supabase';
import type { VaultFile } from '@/types/race-x';

const FILE_ICON: Record<string, typeof File> = { audio: Music, image: Image, video: Film };
const FILE_COLOR: Record<string, string> = { audio: '#BC13FE', image: '#00F2FF', video: '#00FF88', other: '#FFD700' };

function getCategory(type: string): string {
  if (type.startsWith('audio')) return 'audio';
  if (type.startsWith('image')) return 'image';
  if (type.startsWith('video')) return 'video';
  return 'other';
}

export default function CloudVault() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUserId(user.id); fetchFiles(user.id); }
      else setLoading(false);
    });
  }, []);

  const fetchFiles = async (uid: string) => {
    const { data } = await supabase.from('vault_files').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(100);
    setFiles(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (file.size > 50 * 1024 * 1024) { toast.error('Max file size is 50MB'); return; }
    setUploading(true);
    setUploadProgress(0);
    const filePath = `${userId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    try {
      const { data: storageData, error } = await supabase.storage.from('vault').upload(filePath, file, { upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('vault').getPublicUrl(filePath);
      await supabase.from('vault_files').insert({
        user_id: userId,
        file_name: file.name,
        file_type: file.type || 'application/octet-stream',
        file_url: urlData.publicUrl,
        file_size: file.size,
        folder_path: '/',
      });
      toast.success('File uploaded to vault!');
      fetchFiles(userId);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const deleteFile = async (file: VaultFile) => {
    if (!userId) return;
    const filePath = file.file_url.split('/vault/')[1];
    if (filePath) await supabase.storage.from('vault').remove([decodeURIComponent(filePath)]);
    await supabase.from('vault_files').delete().eq('id', file.id);
    setFiles(prev => prev.filter(f => f.id !== file.id));
    toast.success('File deleted');
  };

  const totalSize = files.reduce((s, f) => s + f.file_size, 0);
  const usedGB = (totalSize / (1024 ** 3)).toFixed(2);
  const capacityGB = 10;

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00FF88]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/gateway')} className="p-2 rounded-lg border border-white/10 hover:border-[#00FF88]/40 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <RxBadge label="VAULT" variant="green" />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold tracking-widest">CLOUD VAULT</h1>
          <p className="text-[10px] text-muted-foreground">{usedGB} GB / {capacityGB} GB used</p>
        </div>
        <Button onClick={() => fileRef.current?.click()} size="sm" disabled={uploading}
          className="bg-[#00FF88]/20 border border-[#00FF88]/40 text-[#00FF88] text-xs shrink-0">
          <Upload className="w-3 h-3 mr-1" />{uploading ? 'Uploading...' : 'Upload'}
        </Button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
      </div>

      {/* Storage bar */}
      <div className="px-4 py-2 border-b border-white/5">
        <Progress value={(parseFloat(usedGB) / capacityGB) * 100} className="h-1" />
      </div>

      {uploading && (
        <div className="px-4 py-2 border-b border-[#00FF88]/10 bg-[#00FF88]/5 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[#00FF88] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#00FF88]">Uploading to vault...</span>
        </div>
      )}

      <div className="p-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}
          </div>
        ) : !userId ? (
          <div className="text-center py-16 text-muted-foreground">
            <Cloud className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Login to access your vault</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Vault is empty</p>
            <p className="text-xs mt-1">Upload scripts, audio, images and more</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((f) => {
              const cat = getCategory(f.file_type);
              const Icon = FILE_ICON[cat] || File;
              const color = FILE_COLOR[cat] || FILE_COLOR.other;
              const sizeKB = (f.file_size / 1024).toFixed(0);
              return (
                <motion.div key={f.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.03] hover:border-white/20 transition-all">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{f.file_name}</p>
                    <p className="text-[10px] text-muted-foreground">{sizeKB} KB · {new Date(f.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                      <a href={f.file_url} download={f.file_name} target="_blank" rel="noreferrer">
                        <Download className="w-3.5 h-3.5 text-muted-foreground hover:text-white" />
                      </a>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteFile(f)}>
                      <Trash2 className="w-3.5 h-3.5 text-red-400/60 hover:text-red-400" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
