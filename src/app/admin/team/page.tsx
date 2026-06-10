"use client";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Copy, UserPlus } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Invite = {
  id: string;
  email: string;
  token: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
};

export default function TeamPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadInvites = useCallback(async () => {
    const res = await fetch("/api/invites");
    const data = await res.json();
    setInvites(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setLastInviteUrl(null);

    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setCreating(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to send invite");
      return;
    }

    const data = await res.json();
    setLastInviteUrl(data.inviteUrl);
    setEmail("");
    await loadInvites();
  }

  function copyInviteUrl() {
    if (!lastInviteUrl) return;
    void navigator.clipboard.writeText(lastInviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-header__title">Team</h1>
        <p className="page-header__subtitle">Invite team members to the admin portal</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="type-h2">Invite a team member</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              required
            />
            <Button type="submit" disabled={creating}>
              <UserPlus className="mr-2 h-4 w-4" />
              {creating ? "Creating..." : "Create invite"}
            </Button>
          </form>

          {error && (
            <div className="alert-error">{error}</div>
          )}

          {lastInviteUrl && (
            <div className="alert-success">
              <p className="font-medium">Invite link created</p>
              <p className="mt-1 break-all opacity-90">{lastInviteUrl}</p>
              <Button variant="secondary" size="sm" className="mt-2" onClick={copyInviteUrl}>
                <Copy className="mr-1 h-4 w-4" />
                {copied ? "Copied!" : "Copy link"}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="type-h2">Recent invites</h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="type-caption">Loading...</p>
          ) : invites.length === 0 ? (
            <p className="type-caption">No invites yet.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {invites.map((invite) => (
                <div key={invite.id} className="type-body-sm flex items-center justify-between py-3">
                  <div>
                    <p className="type-h3">{invite.email}</p>
                    <p className="type-caption">
                      {invite.usedAt
                        ? "Accepted"
                        : new Date(invite.expiresAt) < new Date()
                          ? "Expired"
                          : "Pending"}
                    </p>
                  </div>
                  <p className="type-caption opacity-70">
                    {new Date(invite.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
