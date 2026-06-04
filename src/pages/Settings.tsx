import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Palette, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { motion } from 'motion/react';

export default function Settings() {
  const navigate = useNavigate();
  const [bgColor, setBgColor] = useState('#000000');
  const [isLoading, setIsLoading] = useState(false);
  
  const user = JSON.parse(localStorage.getItem('race-x-user') || '{}');
  const isAdmin = user.is_admin;

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const { data, error } = await supabase
      .from('app_configurations')
      .select('config_value')
      .eq('config_key', 'background_color')
      .maybeSingle();
    
    if (!error && data) {
      setBgColor(data.config_value.color || '#000000');
    }
  };

  const handleSaveBgColor = async () => {
    if (!isAdmin) {
      toast.error('Only admins can change global settings');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase
      .from('app_configurations')
      .update({ config_value: { color: bgColor, type: 'solid' }, updated_at: new Date().toISOString() })
      .eq('config_key', 'background_color');

    if (error) {
      toast.error('Failed to update background color');
    } else {
      toast.success('App background updated globally');
      // Trigger a refresh or emit event for other components
      window.dispatchEvent(new Event('app-config-changed'));
    }
    setIsLoading(false);
  };

  const handleReset = async () => {
    setBgColor('#000000');
    if (isAdmin) {
      await handleSaveBgColor();
    }
  };

  return (
    <div className="min-h-screen carbon-fiber p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-2xl font-bold gradient-text">Settings</h1>
        </div>

        {/* Admin Settings Section */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass-strong border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  God Mode: Global App Customization
                </CardTitle>
                <CardDescription>
                  These settings affect the application experience for all users.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        App Background Color
                      </h3>
                      <p className="text-sm text-muted-foreground">Select a custom color for the app background</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={bgColor} 
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-12 h-12 rounded cursor-pointer bg-transparent border-2 border-primary/30"
                      />
                      <div 
                        className="w-12 h-12 rounded border border-border"
                        style={{ backgroundColor: bgColor }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      className="flex-1 pill-button" 
                      onClick={handleSaveBgColor}
                      disabled={isLoading}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Apply Globally
                    </Button>
                    <Button 
                      variant="outline" 
                      className="gap-2"
                      onClick={handleReset}
                      disabled={isLoading}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Standard User Settings */}
        <Card className="glass-strong border-border">
          <CardHeader>
            <CardTitle>App Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <span>Dark Mode</span>
              <div className="w-10 h-5 bg-primary rounded-full relative">
                <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <span>Data Saver Mode</span>
              <div className="w-10 h-5 bg-muted rounded-full relative">
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <span>Language</span>
              <span className="text-sm text-muted-foreground">English (Indian)</span>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card className="glass-strong border-border">
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => {
              localStorage.removeItem('race-x-user');
              navigate('/login');
            }}>
              Logout from this device
            </Button>
            <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/login')}>
              Add another account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
