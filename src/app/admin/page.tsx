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
      <div>
        <h1 className="text-2xl font-semibold">Clients</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage client accounts and their banner campaigns
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-medium">New client</h2>
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
            <div className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
        </CardBody>
      </Card>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading clients...</p>
      ) : clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-500">
          No clients yet. Create your first client above.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/admin/clients/${client.id}`}>
              <Card className="transition hover:border-zinc-400 hover:shadow-md">
                <CardBody>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100">
                    <FolderKanban className="h-6 w-6 text-zinc-600" />
                  </div>
                  <h3 className="font-medium">{client.name}</h3>
                  <p className="mt-1 text-sm text-zinc-500">
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
