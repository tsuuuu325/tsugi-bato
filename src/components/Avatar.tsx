interface AvatarProps {
  emoji: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function Avatar({ emoji, size = 'md', label }: AvatarProps) {
  return (
    <span
      className={`avatar avatar--${size}`}
      title={label}
      aria-label={label ?? emoji}
    >
      {emoji}
    </span>
  );
}
