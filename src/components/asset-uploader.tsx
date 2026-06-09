"use client";

import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { useCallback, useState } from "react";

function preventFileDropDefaults(event: React.DragEvent) {
  event.preventDefault();
  event.stopPropagation();
}

type UploadedAsset = {
  id: string;
  filename: string;
  url: string;
  fileSize: number;
  width?: number | null;
  height?: number | null;
};

type Props = {
  uploadUrl: string;
  assets: UploadedAsset[];
  onUploaded: (asset: UploadedAsset) => void;
  onDeleted: (assetId: string) => void;
};

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to read image dimensions"));
    };
    img.src = url;
  });
}

export function AssetUploader({ uploadUrl, assets, onUploaded, onDeleted }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;

      setUploading(true);
      setError(null);

      try {
        for (const file of Array.from(files)) {
          if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
            throw new Error(`${file.name}: unsupported file type`);
          }

          if (file.size > MAX_UPLOAD_BYTES) {
            throw new Error(`${file.name}: file too large (max 4 MB)`);
          }

          let width: number | undefined;
          let height: number | undefined;

          try {
            const dims = await getImageDimensions(file);
            width = dims.width;
            height = dims.height;
          } catch {
            // Optional dimensions
          }

          const formData = new FormData();
          formData.append("file", file);
          if (width) formData.append("width", String(width));
          if (height) formData.append("height", String(height));

          const uploadRes = await fetch(uploadUrl, {
            method: "POST",
            body: formData,
          });

          if (!uploadRes.ok) {
            const data = await uploadRes.json();
            throw new Error(data.error ?? `${file.name}: upload failed`);
          }

          const asset = await uploadRes.json();
          onUploaded(asset);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onUploaded, uploadUrl],
  );

  return (
    <div className="space-y-4">
      <label
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition ${
          dragging
            ? "border-zinc-500 bg-zinc-100"
            : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100"
        }`}
        onDragEnter={(event) => {
          preventFileDropDefaults(event);
          setDragging(true);
        }}
        onDragOver={preventFileDropDefaults}
        onDragLeave={(event) => {
          preventFileDropDefaults(event);
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          setDragging(false);
        }}
        onDrop={(event) => {
          preventFileDropDefaults(event);
          setDragging(false);
          if (!uploading) {
            void handleFiles(event.dataTransfer.files);
          }
        }}
      >
        <Upload className="mb-2 h-8 w-8 text-zinc-400" />
        <span className="text-sm font-medium text-zinc-700">
          {uploading ? "Uploading..." : "Click or drop images to upload"}
        </span>
        <span className="mt-1 text-xs text-zinc-500">PNG, JPG, GIF, WebP — max 4 MB</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {assets.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <div key={asset.id} className="overflow-hidden rounded-lg border border-zinc-200">
              <div className="flex h-32 items-center justify-center bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.url}
                  alt={asset.filename}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="flex items-start justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{asset.filename}</p>
                  <p className="text-xs text-zinc-500">{formatBytes(asset.fileSize)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleted(asset.id)}
                  aria-label={`Delete ${asset.filename}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
