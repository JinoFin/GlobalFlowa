import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2",
        variant === "primary" &&
          "bg-navy-950 text-white shadow-sm hover:bg-navy-900",
        variant === "secondary" &&
          "border border-navy-200 bg-white text-navy-950 hover:border-teal-400 hover:text-teal-700",
        variant === "ghost" && "text-navy-700 hover:bg-navy-50",
        className,
      )}
    >
      {children}
    </Link>
  );
}
