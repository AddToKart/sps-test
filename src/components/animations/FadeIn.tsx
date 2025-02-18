'use client';

import { motion } from 'framer-motion';

const fadeInVariants = {
  initial: {
    opacity: 0,
    y: 10
  },
  animate: (custom: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: custom * 0.1,
      duration: 0.5
    }
  })
};

export function FadeIn({ 
  children, 
  delay = 0 
}: { 
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      custom={delay}
      variants={fadeInVariants}
    >
      {children}
    </motion.div>
  );
} 