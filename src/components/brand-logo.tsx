import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

type Props = {
  className?: string;
  href?: string | null;
  priority?: boolean;
  onDark?: boolean;
};

export function BrandLogo({
  className,
  href = "/admin",
  priority,
  onDark = true,
}: Props) {
  const image = (
    <Image
      src="/brand/cornett-logo.png"
      alt="Cornett"
      width={287}
      height={87}
      priority={priority}
      className={cn("h-7 w-auto", onDark && "brand-logo--on-dark", className)}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0 items-center">
        {image}
      </Link>
    );
  }

  return <span className="inline-flex shrink-0 items-center">{image}</span>;
}
