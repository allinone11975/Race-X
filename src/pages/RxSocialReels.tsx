import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function RxSocialReels() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen carbon-fiber flex items-center justify-center">
      <div className="text-center">
        <Button variant="ghost" size="icon" onClick={() => navigate('/rx-social')} className="mb-4">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-3xl font-bold gradient-text mb-4">Reels</h1>
        <p className="text-muted-foreground">Vertical scrolling reels coming soon</p>
      </div>
    </div>
  );
}
