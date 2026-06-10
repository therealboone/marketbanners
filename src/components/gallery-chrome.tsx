import { BrandLogo } from "@/components/brand-logo";

export function GalleryBrandNav() {
  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <BrandLogo href={null} />
        <span className="type-caption hidden border-l border-white/15 pl-3 sm:inline">
          Banner Portal
        </span>
      </div>
    </header>
  );
}

export function GalleryBrandFooter() {
  return (
    <footer className="mt-16 border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
        <div className="flex items-center gap-3">
          <BrandLogo href={null} className="h-5 opacity-70" />
          <span className="type-caption">Powered by Cornett</span>
        </div>
        <p className="type-caption text-white/40">Marketing asset gallery</p>
      </div>
    </footer>
  );
}
