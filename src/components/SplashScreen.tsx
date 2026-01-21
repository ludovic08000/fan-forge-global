import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import splashPortrait from '@/assets/splash-portrait.jpg';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState<'reveal' | 'text' | 'tagline' | 'exit'>('reveal');

  useEffect(() => {
    const textTimer = setTimeout(() => setPhase('text'), 600);
    const taglineTimer = setTimeout(() => setPhase('tagline'), 1400);
    const exitTimer = setTimeout(() => setPhase('exit'), 2000);
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2800);

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
    <AnimatePresence onExitComplete={onComplete}>
      {phase !== 'exit' && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            scale: 1.05,
            transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
          }}
        >
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden z-0">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-primary/30"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -100, 0],
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          {/* Background image with Ken Burns effect */}
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.8, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.img 
              src={splashPortrait} 
              alt="" 
              className="w-full h-full object-cover"
              style={{ 
                filter: 'brightness(1.2) contrast(1.05) saturate(1.15)',
                objectPosition: 'center 25%',
              }}
              animate={{ scale: [1, 1.05] }}
              transition={{ duration: 3, ease: 'easeOut' }}
            />
            
            {/* Gradient overlay animé */}
            <motion.div 
              className="absolute inset-0"
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 0.5 }}
              transition={{ duration: 1.5, delay: 0.5 }}
              style={{
                background: 'radial-gradient(ellipse at center 30%, transparent 30%, rgba(0,0,0,0.6) 100%)',
              }}
            />
          </motion.div>

          {/* Glow effect behind text */}
          <motion.div
            className="absolute inset-0 z-10"
            initial={{ opacity: 0 }}
            animate={showText ? { opacity: 1 } : {}}
            transition={{ duration: 1 }}
          >
            <div 
              className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full blur-3xl"
              style={{ background: 'hsl(var(--primary) / 0.3)' }}
            />
          </motion.div>

          {/* Content */}
          <div className="relative z-20 flex flex-col items-center justify-end pb-20 h-full">
            {/* Brand name with 3D flip effect */}
            <div className="flex items-center justify-center perspective-1000">
              <div className="flex gap-1">
                {letters.map((letter, index) => (
                  <motion.span
                    key={index}
                    className="text-7xl md:text-9xl font-bold inline-block font-display"
                    style={{
                      color: 'white',
                      textShadow: '0 0 80px hsl(var(--primary) / 0.6), 0 0 40px hsl(var(--primary) / 0.4), 0 4px 30px rgba(0,0,0,0.9)',
                    }}
                    initial={{ opacity: 0, y: 80, rotateX: -90, scale: 0.5 }}
                    animate={showText ? { 
                      opacity: 1, 
                      y: 0, 
                      rotateX: 0,
                      scale: 1,
                    } : {}}
                    transition={{ 
                      duration: 0.7,
                      delay: index * 0.1,
                      ease: [0.2, 0.65, 0.3, 0.9],
                    }}
                  >
                    {letter}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Animated decorative line */}
            <motion.div
              className="relative w-40 h-[2px] mt-6 rounded-full overflow-hidden"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={showText ? { scaleX: 1, opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
            >
              <div 
                className="absolute inset-0"
                style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)' }}
              />
              <motion.div
                className="absolute inset-0 w-1/3 h-full"
                style={{ background: 'linear-gradient(90deg, transparent, white, transparent)' }}
                animate={{ x: ['-100%', '400%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.5 }}
              />
            </motion.div>

            {/* Tagline with glow */}
            <motion.p
              className="mt-5 text-sm md:text-base tracking-[0.5em] uppercase font-light"
              style={{ 
                color: 'white',
                textShadow: '0 0 20px hsl(var(--primary) / 0.5)',
              }}
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={showTagline ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              Premium Content
            </motion.p>

            {/* Modern loading indicator */}
            <motion.div
              className="mt-10 relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <motion.div
                className="w-12 h-12 rounded-full border-2 border-white/20"
                style={{ borderTopColor: 'hsl(var(--primary))' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent"
                style={{ borderBottomColor: 'white' }}
                animate={{ rotate: -360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
            </motion.div>
          </div>

          {/* Top gradient */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/50 to-transparent z-10" />
          
          {/* Bottom gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />

          {/* Animated corner accents */}
          <motion.div
            className="absolute top-8 left-8 z-20"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <motion.div 
              className="w-20 h-20"
              animate={{ rotate: [0, 90] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-primary/60 to-transparent" />
              <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-primary/60 to-transparent" />
            </motion.div>
          </motion.div>
          
          <motion.div
            className="absolute bottom-8 right-8 z-20"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <motion.div 
              className="w-20 h-20"
              animate={{ rotate: [0, -90] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-primary/60 to-transparent" />
              <div className="absolute bottom-0 right-0 w-[1px] h-full bg-gradient-to-t from-primary/60 to-transparent" />
            </motion.div>
          </motion.div>

          {/* Scan line effect */}
          <motion.div
            className="absolute inset-0 z-30 pointer-events-none overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.03 }}
          >
            <motion.div
              className="absolute left-0 right-0 h-[2px] bg-white"
              animate={{ top: ['-2px', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
