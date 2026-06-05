/**
 * MARKETPLACE — Buy/sell AI assets, templates, presets
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ShoppingCart, Diamond, Search, Filter, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import RxBadge from '@/components/common/RxBadge';
import { supabase } from '@/db/supabase';
import { useRxStore } from '@/store/rxStore';
import type { MarketplaceListing } from '@/types/race-x';

const ASSET_TYPE_COLORS: Record<string, string> = {
  image: '#00F2FF', music: '#BC13FE', character: '#00FF88',
  template: '#FFD700', preset: '#FF6B35', video: '#FF4444',
};

const TYPES = ['all', 'image', 'music', 'character', 'template', 'preset', 'video'];

export default function MarketplacePage() {
  const navigate = useNavigate();
  const { user, updateDiamonds } = useRxStore();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [buyTarget, setBuyTarget] = useState<MarketplaceListing | null>(null);
  const [buying, setBuying] = useState(false);

  useEffect(() => { fetchListings(); }, [typeFilter]);

  const fetchListings = async () => {
    setLoading(true);
    let q = supabase.from('marketplace_listings').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(40);
    if (typeFilter !== 'all') q = q.eq('asset_type', typeFilter);
    const { data } = await q;
    setListings(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const handleBuy = async () => {
    if (!buyTarget || !user) return;
    if (user.diamonds < buyTarget.price_diamonds) { toast.error('Insufficient diamonds'); return; }
    setBuying(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not logged in');
      await supabase.from('transaction_ledger').insert({
        user_id: authUser.id,
        action_type: 'marketplace_purchase',
        transaction_category: 'spent',
        input_parameters: { listing_id: buyTarget.id, title: buyTarget.title },
        diamond_balance_before: user.diamonds,
        diamond_balance_after: user.diamonds - buyTarget.price_diamonds,
      });
      updateDiamonds(-buyTarget.price_diamonds);
      toast.success(`Purchased: ${buyTarget.title}`);
      setBuyTarget(null);
    } catch { toast.error('Purchase failed'); }
    finally { setBuying(false); }
  };

  const filtered = listings.filter(l =>
    !search || l.title.toLowerCase().includes(search.toLowerCase()) || l.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#BC13FE]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/gateway')} className="p-2 rounded-lg border border-white/10 hover:border-[#BC13FE]/40 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <RxBadge label="MARKET" variant="purple" />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold tracking-widest">MARKETPLACE</h1>
          <p className="text-[10px] text-muted-foreground">AI Assets · Templates · Presets</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Diamond className="w-3 h-3 text-[#00F2FF]" />
          <span className="text-xs text-[#00F2FF] font-bold">{user?.diamonds ?? 0}</span>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets..." className="pl-9 bg-white/5 border-white/10 text-sm h-8" />
        </div>
      </div>

      {/* Type filter */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto whitespace-nowrap border-b border-white/5">
        {TYPES.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-3 py-1 rounded-full text-xs border transition-all ${typeFilter === t ? 'border-[#BC13FE] bg-[#BC13FE]/10 text-[#BC13FE]' : 'border-white/10 text-muted-foreground'}`}>
            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-square rounded-xl bg-white/5 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No assets found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map((item, i) => {
              const color = ASSET_TYPE_COLORS[item.asset_type] || '#ffffff';
              return (
                <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                  className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-white/20 transition-all group cursor-pointer h-full flex flex-col"
                  onClick={() => setBuyTarget(item)}>
                  <div className="aspect-video bg-black/40 flex items-center justify-center relative overflow-hidden">
                    {item.thumbnail_url
                      ? <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                      : <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                          <ShoppingCart className="w-6 h-6" style={{ color }} />
                        </div>}
                    <div className="absolute top-2 left-2">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${color}20`, color }}>
                        {item.asset_type}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 flex-1 flex flex-col">
                    <p className="text-xs font-medium text-white leading-tight truncate flex-1">{item.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1">
                        <Diamond className="w-3 h-3 text-[#00F2FF]" />
                        <span className="text-xs text-[#00F2FF] font-bold">{item.price_diamonds}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">{item.sales_count} sold</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Buy Dialog */}
      <Dialog open={!!buyTarget} onOpenChange={() => setBuyTarget(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm bg-[#0A0A0F] border-[#BC13FE]/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[#BC13FE]" />Purchase Asset
            </DialogTitle>
          </DialogHeader>
          {buyTarget && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl border border-white/10 bg-white/5">
                <p className="text-sm font-bold text-white">{buyTarget.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 text-pretty">{buyTarget.description}</p>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#00F2FF]/20 bg-[#00F2FF]/5">
                <span className="text-xs text-muted-foreground">Your balance</span>
                <span className="text-sm font-bold text-[#00F2FF]">💎 {user?.diamonds ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#BC13FE]/20 bg-[#BC13FE]/5">
                <span className="text-xs text-muted-foreground">Price</span>
                <span className="text-sm font-bold text-[#BC13FE]">💎 {buyTarget.price_diamonds}</span>
              </div>
              {user && user.diamonds < buyTarget.price_diamonds && (
                <p className="text-xs text-red-400 text-center">Insufficient diamonds</p>
              )}
              <Button onClick={handleBuy} disabled={buying || !user || user.diamonds < buyTarget.price_diamonds}
                className="w-full bg-[#BC13FE]/20 border border-[#BC13FE]/40 text-[#BC13FE] font-bold">
                {buying ? 'Processing...' : `Buy for 💎 ${buyTarget.price_diamonds}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
