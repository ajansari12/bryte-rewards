type Size = 'sm' | 'md' | 'lg';

interface BrandWordmarkProps {
  size?: Size;
  tone?: 'default' | 'on-dark';
  suffix?: string;
  className?: string;
}

export function BrandWordmark({
  size = 'md',
  tone = 'default',
  suffix = 'Rewards',
  className,
}: BrandWordmarkProps) {
  const classes = [
    'brand-wordmark',
    `brand-wordmark--${size}`,
    tone === 'on-dark' ? 'brand-wordmark--on-dark' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} role="img" aria-label={`Bryte ${suffix}`}>
      <span className="brand-wordmark__name">Bryte</span>
      <span className="brand-wordmark__dot" aria-hidden="true">.</span>
      <span className="brand-wordmark__suffix">{suffix}</span>
    </span>
  );
}
