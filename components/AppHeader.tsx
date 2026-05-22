"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

const navLinks = [
  { href: "/", label: "Directory" },
  { href: "/saved", label: "Saved" },
  { href: "/submit", label: "Submit grant" },
];

export function AppHeader() {
  const pathname = usePathname();
  const { user, loading, openAuthModal, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/70 [backdrop-filter:blur(12px)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-sm font-bold tracking-tight text-emerald-950 transition-colors hover:text-emerald-700"
        >
          Green Grant Finder
        </Link>

        <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                  active
                    ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80"
                    : "text-zinc-600 hover:bg-white/80 hover:text-emerald-800"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {loading ? (
            <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
          ) : user ? (
            <>
              <span className="hidden max-w-[10rem] truncate text-xs text-zinc-500 sm:block">
                {user.email}
              </span>
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-full border border-zinc-200/90 bg-white/90 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-emerald-300 hover:text-emerald-800"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:text-emerald-800 sm:text-sm"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => openAuthModal("signup")}
                className="rounded-full bg-emerald-950 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-900 sm:text-sm"
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
