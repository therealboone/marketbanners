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
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm",
          variant === "primary" && "bg-zinc-900 text-white hover:bg-zinc-800",
          variant === "secondary" && "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
          variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
          variant === "ghost" && "bg-transparent text-zinc-700 hover:bg-zinc-100",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
