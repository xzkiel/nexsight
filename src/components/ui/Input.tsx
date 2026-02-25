import * as React from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    'flex h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-[13px] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--green-glow-border)] focus-visible:border-[var(--pump-border)] disabled:cursor-not-allowed disabled:opacity-50 text-[var(--text-primary)] transition-all',
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = 'Input';

export { Input };
