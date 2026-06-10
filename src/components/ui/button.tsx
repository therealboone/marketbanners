import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "type-label inline-flex items-center justify-center rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" ? "px-4 py-1.5" : "px-5 py-2",
          variant === "primary" &&
            "border border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/15",
          variant === "secondary" &&
            "border border-white/15 bg-transparent text-white/80 hover:border-white/25 hover:bg-white/5 hover:text-white",
          variant === "danger" &&
            "border border-red-400/30 bg-red-500/15 text-red-200 hover:bg-red-500/25",
          variant === "ghost" &&
            "border border-transparent bg-transparent text-white/70 hover:bg-white/5 hover:text-white",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
