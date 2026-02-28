import Image from 'next/image';
import { fixLogoUrl } from '@/lib/supabase/storage';

const sizes = {
  sm: 28,
  md: 36,
  lg: 48,
};

function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

export default function Logo({ src: rawSrc, alt, size = 'md' }) {
  const px = sizes[size] || sizes.md;
  const src = fixLogoUrl(rawSrc);

  if (!src || !isValidUrl(src)) {
    const letter = (alt || '?').charAt(0).toUpperCase();
    return (
      <div
        className="flex items-center justify-center rounded-full bg-primary-light/20 text-slate-800 font-bold"
        style={{ width: px, height: px, fontSize: px * 0.4 }}
        aria-hidden="true"
      >
        {letter}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt || ''}
      width={px}
      height={px}
      className="rounded-full object-contain"
    />
  );
}
