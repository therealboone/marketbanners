"use client";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FolderKanban, Plus } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Client = {
  id: string;
  name: string;
  slug: string;
  _count: { campaigns: number };
};

export default function AdminDashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    setCreating(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create client");
      return;
    }

    setName("");
    await loadClients();
  }

  return (
    <div className="space-y-8">
      <header className="page-header">
        <h1 className="page-header__title">Clients</h1>
        <p className="page-header__subtitle">Manage client accounts and their banner campaigns</p>
      </header>

      <Card>
        <CardHeader>
          <h2 className="type-h2">New client</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Legoland"
              required
            />
            <Button type="submit" disabled={creating}>
              <Plus className="mr-2 h-4 w-4" />
              {creating ? "Creating..." : "Add client"}
            </Button>
          </form>
          {error && (
            <div className="alert-error mt-3">{error}</div>
          )}
        </CardBody>
      </Card>

      {loading ? (
        <p className="type-caption">Loading clients...</p>
      ) : clients.length === 0 ? (
        <div className="empty-state">
          No clients yet. Create your first client above.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/admin/clients/${client.id}`}>
              <Card className="transition hover:border-white/25 hover:bg-white/[0.08]">
                <CardBody>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                    <FolderKanban className="h-6 w-6 text-white/70" />
                  </div>
                  <h3 className="type-h3">{client.name}</h3>
                  <p className="type-caption mt-1">
                    {client._count.campaigns} campaign{client._count.campaigns === 1 ? "" : "s"}
                  </p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
