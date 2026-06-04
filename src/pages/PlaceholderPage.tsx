import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const placeholderPages = [
  'RxSocialSearch',
  'RxSocialNotifications',
  'RxSocialMessages',
  'AdminPortal',
  'Settings',
  'Feedback',
];

export default function PlaceholderPage({ title }: { title: string }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen carbon-fiber flex items-center justify-center">
      <div className="text-center">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-3xl font-bold gradient-text mb-4">{title}</h1>
        <p className="text-muted-foreground">This feature is coming soon</p>
      </div>
    </div>
  );
}

export { placeholderPages };
