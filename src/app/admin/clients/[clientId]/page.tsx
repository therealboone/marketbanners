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
    return <p className="type-caption">Loading...</p>;
  }

  if (!client) {
    return <p className="alert-error inline-block">Client not found</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin"
          className="type-caption mb-4 inline-flex items-center text-white/50 hover:text-white"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          All clients
        </Link>
        <h1 className="page-header__title">{client.name}</h1>
        <p className="page-header__subtitle">Campaigns and banner folders</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="type-h2">New campaign</h2>
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
            <div className="alert-error mt-3">{error}</div>
          )}
        </CardBody>
      </Card>

      {client.campaigns.length === 0 ? (
        <div className="empty-state">
          No campaigns yet.
        </div>
      ) : (
        <div className="space-y-3">
          {client.campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <Megaphone className="h-5 w-5 text-[var(--accent-blue)]" />
                  </div>
                  <div>
                    <Link
                      href={`/admin/clients/${clientId}/campaigns/${campaign.id}`}
                      className="type-h3 hover:underline"
                    >
                      {campaign.name}
                    </Link>
                    <p className="type-caption mt-1">/g/{client.slug}/{campaign.slug}</p>
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
