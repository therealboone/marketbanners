"use client";

import { cn } from "@/lib/utils";
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
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center text-sm text-zinc-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {folders.map((folder) => (
        <button
          key={folder.id}
          type="button"
          onClick={() => onOpenFolder(folder.id)}
          className="group rounded-xl border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-400 hover:shadow-sm"
        >
          <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <Folder className="h-10 w-10" />
          </div>
          <p className="truncate font-medium text-zinc-900">{folder.name}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {(folder._count?.children ?? 0) + (folder._count?.assets ?? 0)} items
          </p>
        </button>
      ))}

      {assets.map((asset, index) => (
        <button
          key={asset.id}
          type="button"
          onClick={() => onOpenAsset(index)}
          className="group overflow-hidden rounded-xl border border-zinc-200 bg-white text-left transition hover:border-zinc-400 hover:shadow-sm"
        >
          <div className="relative flex h-40 items-center justify-center bg-zinc-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.url}
              alt={asset.filename}
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div className="p-3">
            <p className="truncate text-sm font-medium text-zinc-900">{asset.filename}</p>
            {asset.width && asset.height && (
              <p className="mt-1 text-xs text-zinc-500">
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
