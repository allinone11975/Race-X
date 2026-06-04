/**
 * RX SOCIAL SEARCH — users, posts, hashtags
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';
import RxBadge from '@/components/common/RxBadge';
import { supabase } from '@/db/supabase';

interface UserResult { id: string; username: string; avatar_url: string | null; user_level: number; }

export default function SocialSearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('users')
      .select('id, username, avatar_url, user_level')
      .ilike('username', `%${q}%`)
      .limit(20);
    setResults(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/rx-social')} className="p-2 rounded-lg border border-white/10 hover:border-[#00F2FF]/40 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <RxBadge label="SEARCH" />
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search creators..."
              className="pl-9 bg-white/5 border-white/10 text-sm" autoFocus />
          </div>
        </div>
      </div>

      <div className="p-4">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-white/10" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-white/10 rounded w-1/3" />
                  <div className="h-2 bg-white/5 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && results.length === 0 && query && (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No creators found for "{query}"</p>
          </div>
        )}
        {!loading && !query && (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Search for creators by username</p>
          </div>
        )}
        <div className="space-y-2">
          {results.map((u) => (
            <motion.button key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(`/rx-social/profile?userId=${u.id}`)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.03] hover:border-[#00F2FF]/30 hover:bg-white/[0.05] transition-all text-left">
              <div className="w-10 h-10 rounded-full bg-[#00F2FF]/20 border border-[#00F2FF]/30 flex items-center justify-center shrink-0 overflow-hidden">
                {u.avatar_url
                  ? <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                  : <User className="w-4 h-4 text-[#00F2FF]" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">@{u.username}</p>
                <p className="text-[10px] text-muted-foreground">Level {u.user_level}</p>
              </div>
              <Badge variant="secondary" className="text-[10px] shrink-0">View</Badge>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
