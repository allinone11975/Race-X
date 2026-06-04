import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, ShoppingCart } from 'lucide-react';
import { RxBadge } from '@/components/common/RxBadge';

export default function RxShopping() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen carbon-fiber">
      <div className="glass-strong border-b border-border p-4">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gateway')}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold gradient-text">Rx Shopping</h1>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={() => {}}>
            <ShoppingCart className="w-6 h-6" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input placeholder="Search products..." className="pl-10" />
        </div>
      </div>

      <div className="p-4">
        <div className="glass-strong rounded-xl p-6 mb-6 border border-accent/30 glow-green">
          <h2 className="text-2xl font-bold mb-2">Flash Sale</h2>
          <p className="text-muted-foreground">Up to 70% off on selected items</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="relative glass-strong rounded-xl p-4 border border-border">
              <RxBadge />
              <div className="aspect-square bg-muted rounded-lg mb-3" />
              <h3 className="font-semibold text-sm mb-1">Product {i + 1}</h3>
              <p className="text-primary font-bold mb-2">₹{(i + 1) * 100}</p>
              <Button size="sm" className="w-full pill-button-green" onClick={() => {}}>
                Add to Cart
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
