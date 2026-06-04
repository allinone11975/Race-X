import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function RxSocialProfile() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('race-x-user') || '{}');

  return (
    <div className="min-h-screen carbon-fiber">
      <div className="glass-strong border-b border-border p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/rx-social')}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold gradient-text">Profile</h1>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <div className="glass-strong rounded-xl p-8 border border-primary/30 text-center">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-4xl font-bold text-white mx-auto mb-4 glow-blue">
            {user.username?.[0] || 'U'}
          </div>
          <h2 className="text-2xl font-bold mb-2">{user.username || 'User'}</h2>
          <p className="text-muted-foreground mb-4">{user.phone_number}</p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <div className="text-2xl font-bold text-primary">{user.user_level}</div>
              <div className="text-sm text-muted-foreground">Level</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-secondary">{user.rx_points}</div>
              <div className="text-sm text-muted-foreground">RX Points</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent">
                {user.is_admin ? '∞' : (user.diamonds || 0)}
              </div>
              <div className="text-sm text-muted-foreground">Diamonds</div>
            </div>
          </div>
          <div className="flex gap-4 justify-center">
            <Button className="pill-button" onClick={() => {}}>Edit Profile</Button>
            <Button variant="outline" className="rounded-full" onClick={() => navigate('/settings')}>Settings</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
