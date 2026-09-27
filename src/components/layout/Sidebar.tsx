"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShieldCheck,
  FlaskConical,
  Swords,
  GitCompareArrows,
  History,
  Workflow,
  FileText,
  Settings,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/policies", label: "Policies", icon: ShieldCheck },
  { href: "/test-generator", label: "Test Generator", icon: FlaskConical },
  { href: "/attack-lab", label: "Attack Lab", icon: Swords },
  { href: "/regression", label: "Regression", icon: GitCompareArrows },
  { href: "/runs", label: "Test Runs", icon: History },
  { href: "/ci", label: "CI/CD", icon: Workflow },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border-soft bg-surface/40 print:hidden lg:flex">
      <Link href="/" className="flex items-center gap-2 border-b border-border-soft px-5 py-4">
        <ShieldAlert className="text-accent" size={20} />
        <div>
          <div className="text-sm font-semibold tracking-tight text-foreground">SentinelLab</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-2">Security Regression Lab</div>
        </div>
      </Link>
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-accent/10 text-accent" : "text-muted hover:bg-white/5 hover:text-foreground"
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border-soft px-4 py-3 text-[11px] leading-relaxed text-muted-2">
        Independent prototype — not affiliated with any AI security vendor.
      </div>
    </aside>
  );
}
