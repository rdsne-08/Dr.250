import { useLanguage } from '../../hooks/useLanguage.js';
import { BrandMark } from './BrandMark.jsx';

export function SiteFooter() {
  const { copy } = useLanguage();

  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="mx-auto grid max-w-content gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <BrandMark />
          <p className="mt-5 max-w-md text-base leading-7 text-ink-500">{copy.footer.statement}</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-ink-500" aria-label="Footer">
          <a className="inline-flex items-center gap-1 hover:text-health-700" href="#services">
            {copy.footer.product}
          </a>
          <a className="inline-flex items-center gap-1 hover:text-health-700" href="#for-everyone">
            {copy.footer.company}
          </a>
        </nav>
      </div>
      <div className="border-t border-ink-100">
        <p className="mx-auto max-w-content px-5 py-5 text-sm text-ink-500 sm:px-8">
          © {new Date().getFullYear()} {copy.footer.rights}
        </p>
      </div>
    </footer>
  );
}
