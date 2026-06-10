"use client";

import { AppShell } from "@/components/app-shell";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function SetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    void fetch("/api/setup")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          throw new Error(data.error ?? "Failed to check setup status");
        }
        setAllowed(data.needsSetup);
      })
      .catch(() => {
        setError(
          "Could not reach the database. Run the migration first (npm run db:deploy), then refresh.",
        );
        setAllowed(false);
      });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, setupSecret }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Setup failed");
      return;
    }

    router.push("/login");
  }

  if (allowed === null) {
    return (
      <AppShell className="type-caption flex min-h-screen items-center justify-center">
        Loading...
      </AppShell>
    );
  }

  if (!allowed) {
    return (
      <AppShell className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardBody className="text-center">
            {error ? (
              <p className="alert-error">{error}</p>
            ) : (
              <p className="type-body-sm">Setup has already been completed.</p>
            )}
            <Link href="/login" className="type-label mt-4 inline-block underline">
              Go to login
            </Link>
          </CardBody>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <BrandLogo href={null} className="mb-4 h-8" priority />
          <h1 className="type-h1">Initial Setup</h1>
          <p className="type-caption mt-1">Create the first admin account</p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="type-label mb-1 block">Your name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="type-label mb-1 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="type-label mb-1 block">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="type-label mb-1 block">Setup secret</label>
              <Input
                type="password"
                value={setupSecret}
                onChange={(e) => setSetupSecret(e.target.value)}
                required
                placeholder="From SETUP_SECRET env var"
              />
            </div>

            {error && (
              <div className="alert-error">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create admin account"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </AppShell>
  );
}
