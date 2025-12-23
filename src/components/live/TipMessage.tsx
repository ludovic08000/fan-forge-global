/**
 * Composant d'affichage animé pour les tips reçus dans le chat live
 */

import { motion } from 'framer-motion';
import { Coins, Heart, Sparkles } from 'lucide-react';

interface TipMessageProps {
  senderName: string;
  amount: number;
  message?: string;
  currency?: string;
}

export const TipMessage = ({ senderName, amount, message, currency = 'EUR' }: TipMessageProps) => {
  const formattedAmount = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        type: 'spring', 
        stiffness: 300, 
        damping: 20,
        duration: 0.5
      }}
      className="relative overflow-hidden rounded-xl p-3 my-2"
    >
      {/* Background gradient animé */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-amber-500/30 via-yellow-400/30 to-orange-500/30"
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{ backgroundSize: '200% 200%' }}
      />
      
      {/* Particules scintillantes */}
      <motion.div
        className="absolute top-1 right-2"
        animate={{ 
          rotate: [0, 15, -15, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Sparkles className="h-4 w-4 text-yellow-400" />
      </motion.div>
      
      <motion.div
        className="absolute bottom-1 left-2"
        animate={{ 
          rotate: [0, -15, 15, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
      >
        <Sparkles className="h-3 w-3 text-amber-400" />
      </motion.div>

      {/* Contenu */}
      <div className="relative z-10 flex items-center gap-3">
        {/* Icône tip animée */}
        <motion.div
          className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg"
          animate={{ 
            boxShadow: [
              '0 0 10px rgba(251, 191, 36, 0.5)',
              '0 0 20px rgba(251, 191, 36, 0.8)',
              '0 0 10px rgba(251, 191, 36, 0.5)',
            ]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Coins className="h-5 w-5 text-white" />
        </motion.div>

        {/* Info tip */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <motion.span
              className="font-bold text-amber-600 dark:text-amber-400"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {senderName}
            </motion.span>
            <span className="text-sm text-muted-foreground">a envoyé</span>
            <motion.span
              className="font-bold text-lg bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.3 }}
            >
              {formattedAmount}
            </motion.span>
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Heart className="h-4 w-4 text-red-500 fill-red-500" />
            </motion.div>
          </div>
          
          {message && (
            <motion.p
              className="text-sm mt-1 text-foreground/80 italic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              "{message}"
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  );
};
