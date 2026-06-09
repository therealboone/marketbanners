import { signOut } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-lg font-semibold">
              Banner Portal
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/admin" className="text-zinc-600 hover:text-zinc-900">
                Clients
              </Link>
              <Link href="/admin/team" className="text-zinc-600 hover:text-zinc-900">
                Team
              </Link>
            </nav>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="text-sm text-zinc-600 hover:text-zinc-900">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
