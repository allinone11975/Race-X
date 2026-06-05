import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Camera, Mic, Film, Music, Video, Sparkles, Clapperboard, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { RxBadge } from '@/components/common/RxBadge';

export default function RxStudioHome() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('race-x-user') || '{}');

  const creationButtons = [
    {
      label: 'CREATE IMAGE',
      subtitle: 'HuggingFace RealVisXL',
      icon: ImageIcon,
      path: '/rx-studio/create/image',
      type: 'image',
    },
    {
      label: 'CREATE VOICE',
      subtitle: 'HuggingFace Bark Synthesis',
      icon: Mic,
      path: '/rx-studio/create/voice',
      type: 'voice',
    },
    {
      label: 'CREATE MELODY',
      subtitle: 'HuggingFace MusicGen Melody',
      icon: Music,
      path: '/rx-studio/create/melody',
      type: 'melody',
    },
    {
      label: 'CREATE MUSIC',
      subtitle: 'HuggingFace MusicGen Full Track',
      icon: Music,
      path: '/rx-studio/create/music',
      type: 'music',
    },
    {
      label: 'CREATE VIDEO',
      subtitle: 'HuggingFace Zeroscope',
      icon: Video,
      path: '/rx-studio/create/video',
      type: 'video',
    },
    {
      label: 'CREATE SONG',
      subtitle: 'Race-X Studio: HF MusicGen + Bark',
      icon: Sparkles,
      path: '/rx-studio/create/song',
      type: 'song',
      highlighted: true,
    },
    {
      label: 'CREATE CINEMA',
      subtitle: 'HuggingFace CogVideo HD',
      icon: Clapperboard,
      path: '/rx-studio/create/cinema',
      type: 'cinema',
    },
  ];

  return (
    <div className="min-h-screen carbon-fiber p-4 md:p-8">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/gateway')}
          className="mb-4 text-primary hover:text-primary-glow"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>

        {/* User Avatar - Top Right */}
        <div className="absolute top-4 right-4 flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold text-white glow-blue">
            {user.username?.[0] || 'U'}
          </div>
          <span className="text-xs text-muted-foreground">{user.username || 'User'}</span>
        </div>

        {/* Central Dashboard Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="glass-strong rounded-3xl p-8 md:p-12 border-2 border-primary/30 glow-blue mx-auto max-w-5xl mt-20"
        >
          {/* Greeting Banner */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Hi {user.username || 'Creator'}, <span className="text-primary">Race-X Neural Core Active</span>
            </h1>
            <p className="text-xl text-muted-foreground">Where should we start?</p>
          </div>

          {/* 7 Creation Buttons - 3x2 Grid + 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {creationButtons.map((button, index) => {
              const Icon = button.icon;
              return (
                <motion.div
                  key={button.type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="relative"
                >
                  <RxBadge />
                  <Button
                    onClick={() => navigate(button.path)}
                    className={`w-full h-32 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                      button.highlighted
                        ? 'bg-gradient-to-r from-primary via-secondary to-primary glow-blue border-4 border-primary/50 hover:scale-105'
                        : 'pill-button hover:scale-105'
                    }`}
                  >
                    <Icon className="w-8 h-8" />
                    <div className="text-center">
                      <div className="font-bold text-sm">{button.label}</div>
                      <div className="text-xs opacity-80">{button.subtitle}</div>
                    </div>
                  </Button>
                </motion.div>
              );
            })}
          </div>

          {/* Animated Waveform */}
          <div className="flex items-center justify-center gap-1 h-16">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ height: 4 }}
                animate={{
                  height: [4, 32, 4],
                }}
                transition={{
                  duration: 1,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * 0.05,
                  ease: 'easeInOut',
                }}
                className="w-1 bg-gradient-to-t from-primary to-secondary rounded-full"
              />
            ))}
          </div>
        </motion.div>

        {/* Editor Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="flex justify-center mt-8"
        >
          <Button
            onClick={() => navigate('/rx-studio/editor')}
            className="pill-button-purple text-xl px-12 py-6"
          >
            Editor
          </Button>
        </motion.div>

        {/* Decorative Sparkle */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          className="absolute bottom-8 right-8 text-6xl"
        >
          ✨
        </motion.div>
      </div>
    </div>
  );
}
