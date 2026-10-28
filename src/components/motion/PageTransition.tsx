import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/**
 * 页面切换转场（fade-slide）：配合路由 pathname 作为 key 使用，
 * 每次路由变化时内容以淡入上移方式进入，营造流畅的页面过渡。
 */
export function PageTransition({ children, className, delay = 0 }: PageTransitionProps) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
