import { Crown, Pencil, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types/user';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const roleConfig: Record<UserRole, { label: string; icon: React.ElementType; className: string }> = {
  owner: {
    label: 'Owner',
    icon: Crown,
    className: 'bg-primary/20 text-primary border-primary/30',
  },
  editor: {
    label: 'Editor',
    icon: Pencil,
    className: 'bg-secondary text-secondary-foreground border-secondary',
  },
  viewer: {
    label: 'Viewer',
    icon: Eye,
    className: 'bg-muted text-muted-foreground border-muted',
  },
};

const sizeConfig = {
  sm: {
    badge: 'px-1.5 py-0.5 text-[10px] gap-1',
    icon: 'h-2.5 w-2.5',
  },
  md: {
    badge: 'px-2 py-1 text-xs gap-1.5',
    icon: 'h-3 w-3',
  },
  lg: {
    badge: 'px-2.5 py-1.5 text-sm gap-2',
    icon: 'h-4 w-4',
  },
};

const RoleBadge = ({ role, size = 'md', showIcon = true, className }: RoleBadgeProps) => {
  const config = roleConfig[role];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        config.className,
        sizeStyles.badge,
        className
      )}
    >
      {showIcon && <Icon className={sizeStyles.icon} />}
      {config.label}
    </span>
  );
};

export default RoleBadge;
