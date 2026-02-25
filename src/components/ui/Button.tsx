import { cn } from '@/lib/cn';
import { VariantProps, cva } from 'class-variance-authority';
import { motion, HTMLMotionProps } from 'framer-motion';
import React from 'react';
import { Loader2 } from 'lucide-react';

export const buttonVariants = cva(
    'inline-flex items-center justify-center rounded-[var(--radius-md)] text-[13px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green-glow-border)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
    {
        variants: {
            variant: {
                primary:
                    'bg-[var(--green)] text-black font-semibold hover:bg-[var(--green-dim)]',
                secondary:
                    'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-light)]',
                glass:
                    'bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]',
                outline:
                    'border border-[var(--border)] bg-transparent hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]',
                ghost:
                    'hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                danger:
                    'bg-[var(--dump-bg)] text-[var(--dump-color)] border border-[var(--dump-border)] hover:bg-[var(--dump-bg-hover)]',
                violet:
                    'bg-[var(--sol-purple)] text-white hover:opacity-90'
            },
            size: {
                default: 'h-9 px-5 py-2',
                sm: 'h-8 px-3 text-[12px]',
                lg: 'h-10 px-6 text-[14px]',
                icon: 'h-9 w-9',
            },
            fullWidth: {
                true: 'w-full',
            }
        },
        defaultVariants: {
            variant: 'primary',
            size: 'default',
            fullWidth: false,
        },
    }
);

export interface ButtonProps
    extends HTMLMotionProps<'button'>,
    VariantProps<typeof buttonVariants> {
    isLoading?: boolean;
    children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, fullWidth, isLoading, children, ...props }, ref) => {
        return (
            <motion.button
                ref={ref}
                className={cn(buttonVariants({ variant, size, fullWidth, className }))}
                whileTap={{ scale: 0.97 }}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </motion.button>
        );
    }
);

Button.displayName = 'Button';
