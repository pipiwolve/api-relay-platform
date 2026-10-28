import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface SpringInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** 弹簧刚度，越大回弹越快 */
  stiffness?: number;
  damping?: number;
}

/**
 * 弹簧物理入场组件（缩放 + 上移 + 淡入）。
 * 用于登录/注册卡片与重点区块的入场动效（kinetics 风格）。
 */
export function SpringIn({
  children,
  className,
  delay = 0,
  stiffness = 260,
  damping = 22,
}: SpringInProps) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 26 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness, damping, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
