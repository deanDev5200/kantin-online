"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

type NavLink = { href: string; label: string };

export function AppHeader({
  title,
  subtitle,
  username,
  roleLabel,
  links = [],
}: {
  title: string;
  subtitle?: string;
  username: string;
  roleLabel: string;
  links?: NavLink[];
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-bold">{title}</h1>
          {subtitle && <p className="kc-muted">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <div className="font-medium">{username}</div>
            <div className="kc-muted">{roleLabel}</div>
          </div>
          <button onClick={logout} className="kc-btn kc-btn-secondary" disabled={loggingOut}>
            {loggingOut ? "Keluar..." : "Keluar"}
          </button>
        </div>
      </div>
      {links.length > 0 && (
        <nav className="mx-auto max-w-5xl px-4 flex gap-1 overflow-x-auto">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-2 text-sm font-medium text-muted hover:text-foreground border-b-2 border-transparent hover:border-primary"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
