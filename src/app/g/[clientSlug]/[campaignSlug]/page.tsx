"use client";

import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FolderBrowser } from "@/components/folder-browser";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

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

type GalleryData = {
  campaign: {
    id: string;
    name: string;
    slug: string;
    client: { id: string; name: string; slug: string };
  };
  breadcrumbs: { id: string | null; name: string }[];
  folders: FolderItem[];
  assets: AssetItem[];
};

function PublicGalleryContent() {
  const params = useParams<{ clientSlug: string; campaignSlug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const folderId = searchParams.get("folder");
  const [data, setData] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const loadGallery = useCallback(async () => {
    setLoading(true);
    setError(null);

    const url = folderId
      ? `/api/gallery/${params.clientSlug}/${params.campaignSlug}?folder=${folderId}`
      : `/api/gallery/${params.clientSlug}/${params.campaignSlug}`;

    const res = await fetch(url);
    if (!res.ok) {
      setError("Gallery not found");
      setLoading(false);
      return;
    }

    setData(await res.json());
    setLoading(false);
  }, [folderId, params.campaignSlug, params.clientSlug]);

  useEffect(() => {
    void loadGallery();
  }, [loadGallery]);

  function navigateToFolder(id: string | null) {
    const base = `/g/${params.clientSlug}/${params.campaignSlug}`;
    router.push(id ? `${base}?folder=${id}` : base);
  }

  if (loading) {
    return (
      <AppShell className="type-caption flex min-h-screen items-center justify-center">
        Loading gallery...
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <h1 className="type-h1">Gallery not found</h1>
          <p className="type-caption mt-2">
            This link may be incorrect or the campaign has been removed.
          </p>
        </div>
      </AppShell>
    );
  }

  const slides = data.assets.map((asset) => ({
    src: asset.url,
    alt: asset.filename,
    title: asset.filename,
  }));

  return (
    <AppShell>
      <header className="glass-nav border-b">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <p className="type-overline">{data.campaign.client.name}</p>
          <h1 className="type-display mt-1">{data.campaign.name}</h1>
          <div className="mt-3">
            <Breadcrumbs items={data.breadcrumbs} onNavigate={navigateToFolder} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <FolderBrowser
          folders={data.folders}
          assets={data.assets}
          onOpenFolder={navigateToFolder}
          onOpenAsset={setLightboxIndex}
          emptyMessage="No banners in this folder yet."
        />
      </main>

      <Lightbox
        open={lightboxIndex >= 0}
        close={() => setLightboxIndex(-1)}
        index={lightboxIndex}
        slides={slides}
      />
    </AppShell>
  );
}

export default function PublicGalleryPage() {
  return (
    <Suspense
      fallback={
        <AppShell className="type-caption flex min-h-screen items-center justify-center">
          Loading gallery...
        </AppShell>
      }
    >
      <PublicGalleryContent />
    </Suspense>
  );
}
