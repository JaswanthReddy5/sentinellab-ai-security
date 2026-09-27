"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/policies", label: "Policies" },
  { href: "/test-generator", label: "Test Generator" },
  { href: "/attack-lab", label: "Attack Lab" },
  { href: "/regression", label: "Regression" },
  { href: "/runs", label: "Test Runs" },
  { href: "/ci", label: "CI/CD" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border-soft bg-surface/30 px-3 py-2 print:hidden lg:hidden">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium",
              active ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
