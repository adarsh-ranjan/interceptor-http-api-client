import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-ring font-mono uppercase tracking-wide',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-border bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive/20 text-destructive border border-destructive/40',
        outline: 'text-foreground border-border',
        amber: 'bg-[#d99b26]/15 text-[#d99b26] border-[#d99b26]/30',
        get: 'badge-get',
        post: 'badge-post',
        put: 'badge-put',
        patch: 'badge-patch',
        delete: 'badge-delete',
        options: 'badge-options',
        head: 'badge-head',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
