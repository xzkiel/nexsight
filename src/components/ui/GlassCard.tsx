import { cn } from '@/lib/cn';
import { HTMLMotionProps, motion } from 'framer-motion';
import React from 'react';

interface GlassCardProps extends HTMLMotionProps<'div'> {
    variant?: 'base' | 'elevated' | 'interactive';
    gradient?: boolean;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, children, variant = 'base', gradient = false, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={cn(
                    'bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 transition-all duration-200',
                    variant === 'interactive' && 'hover:border-[var(--border-light)] hover:bg-[var(--bg-card-hover)] cursor-pointer',
                    gradient && 'bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-card)]',
                    className
                )}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);

GlassCard.displayName = 'GlassCard';
