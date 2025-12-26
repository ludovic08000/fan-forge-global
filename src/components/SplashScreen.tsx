import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState<'logo' | 'text' | 'exit'>('logo');

  useEffect(() => {
    const logoTimer = setTimeout(() => setPhase('text'), 1200);
    const textTimer = setTimeout(() => setPhase('exit'), 3500);
    const exitTimer = setTimeout(() => onComplete(), 4200);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(textTimer);
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  const showText = phase === 'text' || phase === 'exit';

  return (
    <AnimatePresence>
      {phase !== 'exit' && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/20 overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-primary/20"
                initial={{
                  x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                  y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 100,
                  scale: Math.random() * 0.5 + 0.5,
                }}
                animate={{
                  y: -100,
                  transition: {
                    duration: Math.random() * 3 + 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: 'linear',
                  },
                }}
              />
            ))}
          </div>

          {/* Glowing ring effect */}
          <motion.div
            className="absolute w-96 h-96 rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.5, 1.2], 
              opacity: [0, 0.8, 0.4],
            }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />

          {/* Logo container */}
          <div className="relative flex flex-col items-center">
            {/* Logo icon */}
            <motion.div
              className="relative"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: 'spring', 
                stiffness: 200, 
                damping: 15,
                duration: 0.8 
              }}
            >
              {/* Outer glow */}
              <motion.div
                className="absolute inset-0 blur-2xl bg-primary/50 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              
              {/* Logo SVG */}
              <motion.svg
                width="120"
                height="120"
                viewBox="0 0 120 120"
                className="relative z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {/* Background circle */}
                <motion.circle
                  cx="60"
                  cy="60"
                  r="55"
                  fill="url(#logoGradient)"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1 }}
                />
                
                {/* C letter stylized */}
                <motion.path
                  d="M75 35C65 28 50 28 40 38C30 48 30 72 40 82C50 92 65 92 75 85"
                  stroke="white"
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                />
                
                {/* Accent dot */}
                <motion.circle
                  cx="78"
                  cy="38"
                  r="6"
                  fill="white"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.2, type: 'spring', stiffness: 300 }}
                />
                
                <defs>
                  <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--primary) / 0.7)" />
                  </linearGradient>
                </defs>
              </motion.svg>
            </motion.div>

            {/* Brand name */}
            <motion.div
              className="mt-8 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={showText ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <motion.h1
                className="text-5xl md:text-6xl font-bold tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 50%, hsl(var(--foreground)) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {'Crub'.split('').map((letter, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, y: 50 }}
                    animate={showText ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                    transition={{ 
                      duration: 0.4, 
                      delay: index * 0.1,
                      ease: 'easeOut' 
                    }}
                    className="inline-block"
                  >
                    {letter}
                  </motion.span>
                ))}
              </motion.h1>
            </motion.div>

            {/* Tagline */}
            <motion.p
              className="mt-4 text-muted-foreground text-lg tracking-wide"
              initial={{ opacity: 0 }}
              animate={showText ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              Exclusive Content Platform
            </motion.p>

            {/* Loading bar */}
            <motion.div
              className="mt-8 w-48 h-1 bg-muted rounded-full overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2.5, ease: 'easeInOut' }}
              />
            </motion.div>
          </div>

          {/* Corner decorations */}
          <motion.div
            className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-primary/30"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          />
          <motion.div
            className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-primary/30"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
