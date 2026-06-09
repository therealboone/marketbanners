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
    <nav className="flex flex-wrap items-center gap-1 text-sm text-zinc-600">
      {items.map((item, index) => (
        <span key={`${item.id ?? "root"}-${index}`} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-4 w-4 text-zinc-400" />}
          <button
            type="button"
            onClick={() => onNavigate(item.id)}
            className="rounded px-1 py-0.5 hover:bg-zinc-100 hover:text-zinc-900"
          >
            {item.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
