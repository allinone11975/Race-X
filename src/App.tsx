import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Toaster } from '@/components/ui/sonner';
import { supabase } from '@/db/supabase';
import { useRxStore, type UserRole } from '@/store/rxStore';
import FestivalOverlay from '@/components/common/FestivalOverlay';

import AiDirectorWidget from '@/components/common/AiDirectorWidget';
import routes from './routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, retry: 1 },
  },
});

const App: React.FC = () => {
  const [bgColor, setBgColor] = useState('#0A0A0F');
  const { festivalTheme, isLockdownMode, setUser } = useRxStore();

  useEffect(() => {
    fetchConfig();
    const handleConfigChange = () => fetchConfig();
    window.addEventListener('app-config-changed', handleConfigChange);
    return () => window.removeEventListener('app-config-changed', handleConfigChange);
  }, []);

  // Persistent session restore — runs once on mount
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && !cancelled) {
        await syncUserToStore(session.user.id);
      }
    };

    restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        return;
      }
      if (session?.user) {
        await syncUserToStore(session.user.id);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [setUser]);

  const syncUserToStore = async (authUserId: string) => {
    const { data } = await supabase
      .from('users')
      .select('id, phone_number, username, avatar_url, diamonds, rx_points, user_level, is_admin, role')
      .eq('id', authUserId)
      .maybeSingle();

    if (data) {
      setUser({
        id: data.id,
        phone_number: data.phone_number ?? '',
        username: data.username ?? '',
        avatar_url: data.avatar_url ?? null,
        diamonds: data.diamonds ?? 0,
        rx_points: data.rx_points ?? 0,
        level: data.user_level ?? 1,
        is_admin: data.is_admin ?? false,
        role: (data.role ?? 'user') as UserRole,
      });
    }
  };

  const fetchConfig = async () => {
    const { data, error } = await supabase
      .from('app_configurations')
      .select('config_value')
      .eq('config_key', 'background_color')
      .maybeSingle();
    if (!error && data) {
      const color = data.config_value.color || '#0A0A0F';
      setBgColor(color);
      document.documentElement.style.setProperty('--app-background-color', color);
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <IntersectObserver />
        <FestivalOverlay theme={festivalTheme} />
        <div
          className="flex flex-col min-h-screen transition-colors duration-500 relative"
          style={{ backgroundColor: bgColor }}
        >
          {isLockdownMode && (
            <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="text-6xl">🔒</div>
                <h1 className="text-3xl font-bold text-[#FF4444]">SYSTEM LOCKDOWN</h1>
                <p className="text-muted-foreground">Platform temporarily suspended by administrator.</p>
              </div>
            </div>
          )}
          <main className="flex-grow">
            <Routes>
              {routes.map((route, index) => (
                <Route key={index} path={route.path} element={route.element} />
              ))}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>


        <AiDirectorWidget />
        <Toaster position="top-center" expand={true} richColors closeButton />
      </Router>
    </QueryClientProvider>
  );
};

export default App;
