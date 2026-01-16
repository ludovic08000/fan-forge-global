import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import splashPortrait from '@/assets/splash-portrait.jpg';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState<'reveal' | 'text' | 'tagline' | 'exit'>('reveal');

  useEffect(() => {
    const textTimer = setTimeout(() => setPhase('text'), 1500);
    const taglineTimer = setTimeout(() => setPhase('tagline'), 3500);
    const exitTimer = setTimeout(() => setPhase('exit'), 5000);
    const completeTimer = setTimeout(() => onComplete(), 5800);

    return () => {
      clearTimeout(textTimer);
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
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
          }}
        >
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/50 to-black pointer-events-none z-10" />
          
          {/* Split portrait image with reveal animation */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="relative w-full h-full max-w-lg mx-auto">
              {/* Image container with split reveal effect */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center overflow-hidden"
                initial={{ clipPath: 'inset(50% 0 50% 0)' }}
                animate={{ clipPath: 'inset(10% 0 10% 0)' }}
                transition={{ duration: 1.2, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                <img 
                  src={splashPortrait} 
                  alt="" 
                  className="w-full h-full object-cover object-top"
                  style={{ 
                    filter: 'brightness(0.9) contrast(1.1)',
                  }}
                />
                
              </motion.div>
              
              {/* Vignette overlay */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at center, transparent 30%, black 100%)',
                }}
              />
            </div>
          </motion.div>

          {/* Content overlay */}
          <div className="relative z-20 flex flex-col items-center justify-end pb-24 h-full">
            {/* Brand name */}
            <div className="flex items-center justify-center overflow-hidden">
              <div className="flex">
                {letters.map((letter, index) => (
                  <motion.span
                    key={index}
                    className="text-6xl md:text-8xl font-bold inline-block font-display"
                    style={{
                      color: 'white',
                      textShadow: '0 0 60px hsl(var(--primary) / 0.5), 0 4px 20px rgba(0,0,0,0.8)',
                    }}
                    initial={{ opacity: 0, y: 50, rotateX: -90 }}
                    animate={showText ? { 
                      opacity: 1, 
                      y: 0, 
                      rotateX: 0,
                    } : {}}
                    transition={{ 
                      duration: 0.6,
                      delay: index * 0.12,
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
              className="w-32 h-[1px] mt-6 rounded-full overflow-hidden"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={showText ? { scaleX: 1, opacity: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
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
              className="mt-4 text-sm md:text-base tracking-[0.4em] uppercase font-light"
              style={{ color: 'hsl(var(--muted-foreground))' }}
              initial={{ opacity: 0, y: 15 }}
              animate={showTagline ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              Premium Content
            </motion.p>

            {/* Loading dots */}
            <motion.div
              className="mt-8 flex items-center gap-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-white/60"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.4, 1, 0.4],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </motion.div>
          </div>

          {/* Top gradient fade */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black to-transparent z-10" />
          
          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black via-black/90 to-transparent z-10" />

          {/* Subtle corner accents */}
          <motion.div
            className="absolute top-6 left-6 w-16 h-16 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-white/30 to-transparent" />
            <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-white/30 to-transparent" />
          </motion.div>
          <motion.div
            className="absolute bottom-6 right-6 w-16 h-16 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-white/30 to-transparent" />
            <div className="absolute bottom-0 right-0 w-[1px] h-full bg-gradient-to-t from-white/30 to-transparent" />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default SplashScreen;
