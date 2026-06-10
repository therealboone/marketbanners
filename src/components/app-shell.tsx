import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function AppShell({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("app-shell relative min-h-screen", className)} {...props}>
      <div className="app-shell__glow app-shell__glow--purple" aria-hidden />
      <div className="app-shell__glow app-shell__glow--blue" aria-hidden />
      <div className="app-shell__glow app-shell__glow--pink" aria-hidden />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
