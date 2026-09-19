import { useEffect, useState } from 'react';

import { cn } from '../../lib/classNames.js';

const sizes = {
  sm: 'size-9 text-xs',
  md: 'size-12 text-sm',
  lg: 'size-16 text-lg',
};

function initialsFor(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function Avatar({ alt, className, name = 'User', size = 'md', src }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(src && !imageFailed);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-health-100 font-bold text-health-800',
        sizes[size],
        className,
      )}
      role={showImage ? undefined : 'img'}
      aria-label={showImage ? undefined : name}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt ?? name}
          className="size-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initialsFor(name)}</span>
      )}
    </span>
  );
}
