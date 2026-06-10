"use client";

import { Folder, ImageIcon } from "lucide-react";

type FolderItem = {
  id: string;
  name: string;
  _count?: { children: number; assets: number };
};

type AssetItem = {
  id: string;
  filename: string;
  url: string;
  width?: number | null;
  height?: number | null;
};

type Props = {
  folders: FolderItem[];
  assets: AssetItem[];
  onOpenFolder: (folderId: string) => void;
  onOpenAsset: (index: number) => void;
  emptyMessage?: string;
};

export function FolderBrowser({
  folders,
  assets,
  onOpenFolder,
  onOpenAsset,
  emptyMessage = "This folder is empty.",
}: Props) {
  if (folders.length === 0 && assets.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {folders.map((folder) => (
        <button
          key={folder.id}
          type="button"
          onClick={() => onOpenFolder(folder.id)}
          className="glass-card group p-4 text-left transition hover:border-white/25 hover:bg-white/[0.08]"
        >
          <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-white/5">
            <Folder className="h-10 w-10 text-[var(--accent-purple)]" />
          </div>
          <p className="type-h3 truncate">{folder.name}</p>
          <p className="type-caption mt-1">
            {(folder._count?.children ?? 0) + (folder._count?.assets ?? 0)} items
          </p>
        </button>
      ))}

      {assets.map((asset, index) => (
        <button
          key={asset.id}
          type="button"
          onClick={() => onOpenAsset(index)}
          className="glass-card group overflow-hidden text-left transition hover:border-white/25 hover:bg-white/[0.08]"
        >
          <div className="relative flex h-40 items-center justify-center bg-black/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.url}
              alt={asset.filename}
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div className="p-3">
            <p className="type-h3 truncate">{asset.filename}</p>
            {asset.width && asset.height && (
              <p className="type-caption mt-1">
                {asset.width} × {asset.height}
              </p>
            )}
          </div>
        </button>
      ))}

      {assets.length === 0 && folders.length > 0 && (
        <div className="hidden">
          <ImageIcon />
        </div>
      )}
    </div>
  );
}
