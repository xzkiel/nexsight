import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
    'inline-flex items-center rounded-[var(--radius-sm)] border px-2 py-0.5 text-[11px] font-medium transition-colors',
    {
        variants: {
            variant: {
                default: 'border-transparent bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
                secondary: 'border-transparent bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
                destructive: 'border-transparent bg-[var(--dump-bg)] text-[var(--dump-color)]',
                outline: 'border-[var(--border)] text-[var(--text-secondary)]',
                success: 'border-transparent bg-[var(--pump-bg)] text-[var(--pump-color)]',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
    variant?: "default" | "secondary" | "destructive" | "outline" | "success" | null | undefined;
}

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };
