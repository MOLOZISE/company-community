interface AvatarProps {
  src?: string | null;
  name: string;
  isAnon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  title?: string;
}

const sizeClasses = {
  sm: 'w-5 h-5 text-[10px]',
  md: 'w-7 h-7 text-xs',
  lg: 'w-16 h-16 text-2xl',
};

export function Avatar({ src, name, isAnon = false, size = 'sm', onClick, title }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  const base = `${sizeClasses[size]} rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 overflow-hidden shrink-0`;

  const content = !isAnon && src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} className="w-full h-full object-cover" />
  ) : initial;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} title={title} className={`${base} hover:opacity-80 transition-opacity`}>
        {content}
      </button>
    );
  }

  return <span className={base} title={title}>{content}</span>;
}
