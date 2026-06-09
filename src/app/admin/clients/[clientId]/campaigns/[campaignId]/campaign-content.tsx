"use client";

import { AssetUploader } from "@/components/asset-uploader";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FolderBrowser } from "@/components/folder-browser";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Copy, FolderPlus, Layers, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

type FolderItem = {
  id: string;
  name: string;
  _count?: { children: number; assets: number };
};

type AssetItem = {
  id: string;
  filename: string;
  url: string;
  fileSize: number;
  width?: number | null;
  height?: number | null;
};

type CampaignData = {
  id: string;
  name: string;
  slug: string;
  client: { id: string; name: string; slug: string };
  folders: FolderItem[];
  publicUrl: string;
};

type FolderData = {
  id: string;
  name: string;
  parentId: string | null;
  breadcrumbs: { id: string | null; name: string }[];
  children: FolderItem[];
  assets: AssetItem[];
};

export default function CampaignPageContent() {
  const params = useParams<{ clientId: string; campaignId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const clientId = params.clientId;
  const campaignId = params.campaignId;
  const folderId = searchParams.get("folder");

  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [folder, setFolder] = useState<FolderData | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingSizes, setCreatingSizes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const campaignRes = await fetch(`/api/clients/${clientId}/campaigns/${campaignId}`);
    if (!campaignRes.ok) {
      setError("Campaign not found");
      setLoading(false);
      return;
    }

    const campaignData: CampaignData = await campaignRes.json();
    setCampaign(campaignData);

    if (!folderId) {
      setFolder(null);
      setBreadcrumbs([{ id: null, name: campaignData.name }]);
      setFolders(campaignData.folders);
      setAssets([]);
      setLoading(false);
      return;
    }

    const folderRes = await fetch(
      `/api/clients/${clientId}/campaigns/${campaignId}/folders/${folderId}`,
    );

    if (!folderRes.ok) {
      setError("Folder not found");
      setLoading(false);
      return;
    }

    const folderData: FolderData = await folderRes.json();
    setFolder(folderData);
    setFolders(folderData.children);
    setAssets(folderData.assets);
    setBreadcrumbs(folderData.breadcrumbs);
    setLoading(false);
  }, [campaignId, clientId, folderId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function navigateToFolder(id: string | null) {
    const url = id
      ? `/admin/clients/${clientId}/campaigns/${campaignId}?folder=${id}`
      : `/admin/clients/${clientId}/campaigns/${campaignId}`;
    router.push(url);
  }

  async function handleCreateFolder(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);

    const res = await fetch(`/api/clients/${clientId}/campaigns/${campaignId}/folders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName, parentId: folderId }),
    });

    setCreating(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create folder");
      return;
    }

    setNewFolderName("");
    await loadData();
  }

  async function handleCreateStandardSizes() {
    setCreatingSizes(true);
    setError(null);

    const res = await fetch(`/api/clients/${clientId}/campaigns/${campaignId}/folders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template: "standard-sizes",
        parentId: folderId,
        prefix: campaign?.name,
      }),
    });

    setCreatingSizes(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create size folders");
      return;
    }

    await loadData();
  }

  async function handleDeleteFolder(id: string, name: string) {
    if (!confirm(`Delete folder "${name}" and all its contents?`)) return;

    const res = await fetch(
      `/api/clients/${clientId}/campaigns/${campaignId}/folders/${id}`,
      { method: "DELETE" },
    );

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to delete folder");
      return;
    }

    if (folderId === id) {
      navigateToFolder(folder?.parentId ?? null);
    } else {
      await loadData();
    }
  }

  async function handleDeleteAsset(assetId: string) {
    if (!folderId) return;
    if (!confirm("Delete this image?")) return;

    const res = await fetch(
      `/api/clients/${clientId}/campaigns/${campaignId}/folders/${folderId}/assets/${assetId}`,
      { method: "DELETE" },
    );

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to delete asset");
      return;
    }

    setAssets((prev) => prev.filter((a) => a.id !== assetId));
  }

  function copyPublicUrl() {
    if (!campaign) return;
    void navigator.clipboard.writeText(campaign.publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading...</p>;
  }

  if (!campaign) {
    return <p className="text-sm text-red-600">{error ?? "Campaign not found"}</p>;
  }

  const uploadUrl = folderId
    ? `/api/clients/${clientId}/campaigns/${campaignId}/folders/${folderId}/assets`
    : null;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/admin/clients/${clientId}`}
          className="mb-4 inline-flex items-center text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {campaign.client.name}
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{campaign.name}</h1>
            <Breadcrumbs items={breadcrumbs} onNavigate={navigateToFolder} />
          </div>
          <Button variant="secondary" size="sm" onClick={copyPublicUrl}>
            <Copy className="mr-1 h-4 w-4" />
            {copied ? "Copied!" : "Copy client link"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-medium">New folder</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <form onSubmit={handleCreateFolder} className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Google Display, Lights, 728x90 v1"
              required
            />
            <Button type="submit" disabled={creating}>
              <FolderPlus className="mr-2 h-4 w-4" />
              {creating ? "Creating..." : "Add folder"}
            </Button>
          </form>
          <div>
            <Button variant="secondary" onClick={handleCreateStandardSizes} disabled={creatingSizes}>
              <Layers className="mr-2 h-4 w-4" />
              {creatingSizes ? "Creating..." : "Add standard size folders"}
            </Button>
            <p className="mt-2 text-xs text-zinc-500">
              Creates 160×600, 300×50, 300×250, 300×600, 320×50, 336×280, and 728×90 folders
            </p>
          </div>
        </CardBody>
      </Card>

      {folderId && uploadUrl && (
        <Card>
          <CardHeader>
            <h2 className="font-medium">Upload banners</h2>
          </CardHeader>
          <CardBody>
            <AssetUploader
              uploadUrl={uploadUrl}
              assets={assets}
              onUploaded={(asset) => setAssets((prev) => [asset, ...prev])}
              onDeleted={handleDeleteAsset}
            />
          </CardBody>
        </Card>
      )}

      <div>
        <h2 className="mb-4 font-medium">{folderId ? folder?.name : "Campaign folders"}</h2>

        {folders.length === 0 && (!folderId || assets.length === 0) ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-500">
            {folderId
              ? "No subfolders or images in this folder yet."
              : "No folders yet. Create your first folder above."}
          </div>
        ) : (
          <div className="space-y-4">
            <FolderBrowser
              folders={folders}
              assets={[]}
              onOpenFolder={navigateToFolder}
              onOpenAsset={() => {}}
            />
            <div className="flex flex-wrap gap-2">
              {folders.map((f) => (
                <Button
                  key={f.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteFolder(f.id, f.name)}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Delete {f.name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
