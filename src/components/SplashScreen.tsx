import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState<'logo' | 'text' | 'tagline' | 'exit'>('logo');

  useEffect(() => {
    const logoTimer = setTimeout(() => setPhase('text'), 1800);
    const taglineTimer = setTimeout(() => setPhase('tagline'), 4000);
    const exitTimer = setTimeout(() => setPhase('exit'), 5500);
    const completeTimer = setTimeout(() => onComplete(), 6300);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(taglineTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const letters = ['C', 'r', 'u', 'b'];
  const showText = phase === 'text' || phase === 'tagline' || phase === 'exit';
  const showTagline = phase === 'tagline' || phase === 'exit';

  return (
    <AnimatePresence>
      {phase !== 'exit' ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at center, hsl(var(--background)) 0%, hsl(var(--background) / 0.95) 50%, hsl(var(--background)) 100%)',
          }}
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
          }}
        >
          {/* Premium background effects */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Subtle grid pattern */}
            <div 
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
                backgroundSize: '50px 50px',
              }}
            />
            
            {/* Animated gradient orbs */}
            <motion.div
              className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px]"
              style={{ background: 'hsl(var(--primary) / 0.15)' }}
              animate={{
                scale: [1, 1.2, 1],
                x: [0, 50, 0],
                y: [0, -30, 0],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[100px]"
              style={{ background: 'hsl(var(--primary) / 0.1)' }}
              animate={{
                scale: [1.2, 1, 1.2],
                x: [0, -40, 0],
                y: [0, 40, 0],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Floating particles */}
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: Math.random() * 4 + 2,
                  height: Math.random() * 4 + 2,
                  background: `hsl(var(--primary) / ${Math.random() * 0.3 + 0.1})`,
                  left: `${Math.random() * 100}%`,
                }}
                initial={{ y: '110vh', opacity: 0 }}
                animate={{
                  y: '-10vh',
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: Math.random() * 6 + 4,
                  repeat: Infinity,
                  delay: Math.random() * 3,
                  ease: 'linear',
                }}
              />
            ))}
          </div>

          {/* Center content */}
          <div className="relative flex flex-col items-center z-10">
            {/* Logo container with glow */}
            <motion.div
              className="relative"
              initial={{ scale: 0, rotate: -180, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ 
                type: 'spring', 
                stiffness: 150, 
                damping: 20,
                duration: 1.2
              }}
            >
              {/* Multi-layer glow effect */}
              <motion.div
                className="absolute inset-[-20px] rounded-full blur-3xl"
                style={{ background: 'hsl(var(--primary) / 0.4)' }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 0.7, 0.4],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute inset-[-40px] rounded-full blur-[60px]"
                style={{ background: 'hsl(var(--primary) / 0.2)' }}
                animate={{
                  scale: [1.2, 1, 1.2],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              />
              
              {/* Logo SVG */}
              <motion.svg
                width="140"
                height="140"
                viewBox="0 0 120 120"
                className="relative z-10 drop-shadow-2xl"
              >
                {/* Outer ring */}
                <motion.circle
                  cx="60"
                  cy="60"
                  r="56"
                  fill="none"
                  stroke="url(#ringGradient)"
                  strokeWidth="2"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
                
                {/* Background circle */}
                <motion.circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="url(#logoGradient)"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                />
                
                {/* C letter stylized - premium curve */}
                <motion.path
                  d="M78 32C66 22 46 24 36 38C26 52 26 68 36 82C46 96 66 98 78 88"
                  stroke="white"
                  strokeWidth="7"
                  strokeLinecap="round"
                  fill="none"
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, delay: 0.6, ease: [0.4, 0, 0.2, 1] }}
                />
                
                {/* Premium accent - diamond */}
                <motion.g
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1.6, type: 'spring', stiffness: 400 }}
                >
                  <motion.path
                    d="M82 32 L86 38 L82 44 L78 38 Z"
                    fill="white"
                    filter="drop-shadow(0 0 6px rgba(255,255,255,0.8))"
                  />
                </motion.g>
                
                <defs>
                  <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="50%" stopColor="hsl(var(--primary) / 0.9)" />
                    <stop offset="100%" stopColor="hsl(var(--primary) / 0.7)" />
                  </linearGradient>
                  <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--primary) / 0.8)" />
                    <stop offset="50%" stopColor="hsl(var(--primary) / 0.3)" />
                    <stop offset="100%" stopColor="hsl(var(--primary) / 0.8)" />
                  </linearGradient>
                </defs>
              </motion.svg>
            </motion.div>

            {/* Brand name - letter by letter */}
            <div className="mt-12 h-20 flex items-center justify-center overflow-hidden">
              <div className="flex">
                {letters.map((letter, index) => (
                  <motion.span
                    key={index}
                    className="text-6xl md:text-7xl font-bold inline-block"
                    style={{
                      background: 'linear-gradient(180deg, hsl(var(--foreground)) 0%, hsl(var(--foreground) / 0.8) 50%, hsl(var(--primary)) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      textShadow: '0 0 40px hsl(var(--primary) / 0.3)',
                    }}
                    initial={{ opacity: 0, y: 60, rotateX: -90 }}
                    animate={showText ? { 
                      opacity: 1, 
                      y: 0, 
                      rotateX: 0,
                    } : {}}
                    transition={{ 
                      duration: 0.6,
                      delay: index * 0.15,
                      ease: [0.2, 0.65, 0.3, 0.9],
                    }}
                  >
                    {letter}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Decorative line */}
            <motion.div
              className="w-24 h-[2px] mt-6 rounded-full overflow-hidden"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={showText ? { scaleX: 1, opacity: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.8, ease: 'easeOut' }}
            >
              <motion.div
                className="w-full h-full"
                style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)' }}
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>

            {/* Tagline */}
            <motion.p
              className="mt-6 text-lg md:text-xl tracking-[0.3em] uppercase font-light"
              style={{ color: 'hsl(var(--muted-foreground))' }}
              initial={{ opacity: 0, y: 20, letterSpacing: '0.5em' }}
              animate={showTagline ? { opacity: 1, y: 0, letterSpacing: '0.3em' } : {}}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              Premium Content
            </motion.p>

            {/* Loading indicator */}
            <motion.div
              className="mt-10 flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'hsl(var(--primary))' }}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </motion.div>
          </div>

          {/* Corner accents */}
          <motion.div
            className="absolute top-8 left-8 w-20 h-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-primary/50 to-transparent" />
            <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-primary/50 to-transparent" />
          </motion.div>
          <motion.div
            className="absolute bottom-8 right-8 w-20 h-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-primary/50 to-transparent" />
            <div className="absolute bottom-0 right-0 w-[1px] h-full bg-gradient-to-t from-primary/50 to-transparent" />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default SplashScreen;
