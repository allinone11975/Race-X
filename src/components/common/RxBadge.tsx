import { cn } from '@/lib/utils';

interface RxBadgeProps {
  label?: string;
  variant?: 'blue' | 'purple' | 'green';
  className?: string;
}

const colorMap = {
  blue: 'border-[#00F2FF]/60 text-[#00F2FF] shadow-[0_0_8px_rgba(0,242,255,0.4)]',
  purple: 'border-[#BC13FE]/60 text-[#BC13FE] shadow-[0_0_8px_rgba(188,19,254,0.4)]',
  green: 'border-[#00FF88]/60 text-[#00FF88] shadow-[0_0_8px_rgba(0,255,136,0.4)]',
};

export function RxBadge({ label = 'RX', variant = 'blue', className }: RxBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black tracking-widest border uppercase bg-black/40 backdrop-blur-sm',
        colorMap[variant],
        className
      )}
    >
      {label}
    </span>
  );
}

export default RxBadge;
