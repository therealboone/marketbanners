"use client";

import { AppShell } from "@/components/app-shell";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) {
      setValid(false);
      return;
    }

    void fetch(`/api/register?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        setValid(data.valid);
        if (data.valid) setEmail(data.email);
      });
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Registration failed");
      return;
    }

    router.push("/login");
  }

  if (valid === null) {
    return <div className="type-caption">Validating invite...</div>;
  }

  if (!valid) {
    return (
      <div className="text-center">
        <p className="type-body-sm">This invite link is invalid or has expired.</p>
        <Link href="/login" className="type-label mt-4 inline-block underline">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="type-label mb-1 block">Email</label>
        <Input value={email ?? ""} disabled />
      </div>
      <div>
        <label className="type-label mb-1 block">Your name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
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

      {error && (
        <div className="alert-error">{error}</div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <AppShell className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <BrandLogo href={null} className="mb-4 h-8" priority />
          <h1 className="type-h1">Join the team</h1>
          <p className="type-caption mt-1">Complete your account setup</p>
        </CardHeader>
        <CardBody>
          <Suspense fallback={<div className="type-caption">Loading...</div>}>
            <RegisterForm />
          </Suspense>
        </CardBody>
      </Card>
    </AppShell>
  );
}
