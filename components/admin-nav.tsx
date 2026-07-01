"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Shuffle, LogOut, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

const LINKS = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/accounts", label: "الحسابات", icon: Users },
  { href: "/redistribute", label: "إعادة التوزيع", icon: Shuffle },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-1">
          <span className="ml-3 font-bold text-primary">٨٠٠٠</span>
          <nav className="flex items-center gap-1">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/export"
            className="flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">تحميل Excel</span>
          </a>
          <button
            onClick={signOut}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </div>
    </header>
  );
}
