"use client";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Copy, Megaphone, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  slug: string;
};

type Client = {
  id: string;
  name: string;
  slug: string;
  campaigns: Campaign[];
};

export default function ClientDetailPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const [client, setClient] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadClient = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}`);
    const data = await res.json();
    setClient(data);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    void loadClient();
  }, [loadClient]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);

    const res = await fetch(`/api/clients/${clientId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    setCreating(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create campaign");
      return;
    }

    setName("");
    await loadClient();
  }

  function copyPublicUrl(campaign: Campaign) {
    const base = window.location.origin;
    const url = `${base}/g/${client!.slug}/${campaign.slug}`;
    void navigator.clipboard.writeText(url);
    setCopiedId(campaign.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading...</p>;
  }

  if (!client) {
    return <p className="text-sm text-red-600">Client not found</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          All clients
        </Link>
        <h1 className="text-2xl font-semibold">{client.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">Campaigns and banner folders</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-medium">New campaign</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. LLCR-11598-01 Holiday 2023 HTML5 Banners"
              required
            />
            <Button type="submit" disabled={creating}>
              <Plus className="mr-2 h-4 w-4" />
              {creating ? "Creating..." : "Add campaign"}
            </Button>
          </form>
          {error && (
            <div className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
        </CardBody>
      </Card>

      {client.campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-500">
          No campaigns yet.
        </div>
      ) : (
        <div className="space-y-3">
          {client.campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                    <Megaphone className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <Link
                      href={`/admin/clients/${clientId}/campaigns/${campaign.id}`}
                      className="font-medium hover:underline"
                    >
                      {campaign.name}
                    </Link>
                    <p className="mt-1 text-xs text-zinc-500">/g/{client.slug}/{campaign.slug}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => copyPublicUrl(campaign)}>
                    <Copy className="mr-1 h-4 w-4" />
                    {copiedId === campaign.id ? "Copied!" : "Copy link"}
                  </Button>
                  <Link href={`/admin/clients/${clientId}/campaigns/${campaign.id}`}>
                    <Button size="sm">Manage</Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
