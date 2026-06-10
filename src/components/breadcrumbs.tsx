"use client";

import { ChevronRight } from "lucide-react";

type Breadcrumb = {
  id: string | null;
  name: string;
};

type Props = {
  items: Breadcrumb[];
  onNavigate: (folderId: string | null) => void;
};

export function Breadcrumbs({ items, onNavigate }: Props) {
  return (
    <nav className="type-nav flex flex-wrap items-center gap-1 text-white/60">
      {items.map((item, index) => (
        <span key={`${item.id ?? "root"}-${index}`} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-4 w-4 text-white/30" />}
          <button
            type="button"
            onClick={() => onNavigate(item.id)}
            className="rounded px-1 py-0.5 hover:bg-white/10 hover:text-white"
          >
            {item.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
