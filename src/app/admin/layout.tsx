import { AdminNav } from "@/components/admin-nav";
import { AppShell } from "@/components/app-shell";
import { BrandLogo } from "@/components/brand-logo";
import { signOut } from "@/lib/auth";
import { requireUser } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <AppShell>
      <header className="glass-nav sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <BrandLogo href="/admin" />
            <span className="type-caption hidden border-l border-white/15 pl-3 sm:inline">
              Banner Portal
            </span>
          </div>

          <AdminNav />

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="type-nav rounded-full px-4 py-2 text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
    </AppShell>
  );
}
