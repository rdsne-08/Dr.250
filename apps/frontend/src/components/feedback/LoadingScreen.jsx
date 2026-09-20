import { DNAAnimation } from '../background/DNAAnimation.jsx';
import { BrandMark } from '../layout/BrandMark.jsx';
import { Loader } from '../ui/index.js';

export function LoadingScreen({ label = 'Loading your secure health space…' }) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-canvas px-5 py-12">
      <DNAAnimation className="absolute -right-32 top-0 h-full w-[34rem] opacity-35" />
      <div className="hero-grid absolute inset-0" aria-hidden="true" />
      <div className="relative z-10 flex flex-col items-center rounded-3xl border border-health-100 bg-white/90 px-8 py-7 text-center shadow-card backdrop-blur-xl">
        <BrandMark />
        <Loader className="mt-6" label={label} />
        <p className="mt-4 text-sm font-semibold text-ink-500">{label}</p>
      </div>
    </main>
  );
}
