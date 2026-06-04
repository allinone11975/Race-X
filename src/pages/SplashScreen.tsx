import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login');
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="fixed inset-0 flex items-center justify-center carbon-fiber overflow-hidden">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20 animate-pulse" />

      {/* Central Logo Animation */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* RX Logo with Fade-in */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative"
        >
          <div className="text-8xl font-bold gradient-text glow-blue-text">
            RX
          </div>

          {/* Neon Aura Effect */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            className="absolute inset-0 -z-10 blur-3xl bg-gradient-to-r from-primary to-secondary rounded-full"
          />
        </motion.div>

        {/* Rotating Energy Ring */}
        <motion.div
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: 1, rotate: 360 }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
          className="absolute w-48 h-48 border-4 border-primary/30 rounded-full"
          style={{ borderTopColor: 'hsl(var(--primary))' }}
        />

        {/* Digital Particles */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 0, y: 0 }}
            animate={{
              opacity: [0, 1, 0],
              x: Math.cos((i * Math.PI * 2) / 12) * 100,
              y: Math.sin((i * Math.PI * 2) / 12) * 100,
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 0.1,
              ease: 'easeOut',
            }}
            className="absolute w-2 h-2 bg-primary rounded-full glow-blue"
          />
        ))}

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-12 text-xl font-semibold text-muted-foreground"
        >
          The Future of Creation
        </motion.div>
      </div>

      {/* Bottom Loading Indicator */}
      <motion.div
        initial={{ width: '0%' }}
        animate={{ width: '100%' }}
        transition={{ duration: 2.5, ease: 'easeInOut' }}
        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent"
      />
    </div>
  );
}
