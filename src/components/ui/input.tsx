import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "type-body glass-input w-full rounded-xl px-4 py-2.5 transition-colors",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
