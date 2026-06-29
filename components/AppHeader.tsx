"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth/AuthProvider";

const navLinks = [
  { href: "/", label: "Directory" },
  { href: "/saved", label: "Saved" },
  { href: "/submit", label: "Submit grant" },
];

export function AppHeader() {
  const pathname = usePathname();
  const { user, loading, openAuthModal, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const isAdmin = Boolean(user?.app_metadata?.is_admin);

  const startClose = useCallback(() => setIsOpen(false), []);

  // Close the mobile menu on route change (incl. browser back/forward).
  // Adjusting state during render is React's recommended alternative to a
  // synchronous setState inside an effect.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  // Close menu on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/70 [backdrop-filter:blur(12px)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-sm font-bold tracking-tight text-emerald-950 transition-colors hover:text-emerald-700"
        >
          Green Grant Finder
        </Link>

        {/* Desktop nav: visible at md and above */}
        <nav className="hidden items-center gap-1 md:flex md:gap-2">
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
          {isAdmin && (
            <Link
              href="/admin"
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                pathname.startsWith("/admin")
                  ? "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80"
                  : "text-zinc-500 ring-1 ring-zinc-200/70 hover:bg-white/80 hover:text-amber-800"
              }`}
            >
              Admin
            </Link>
          )}
        </nav>

        {/* Desktop auth buttons: visible at md and above */}
        <div className="hidden items-center gap-2 md:flex">
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

        {/* Mobile hamburger: visible below md */}
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex size-10 items-center justify-center rounded-xl text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-emerald-800 md:hidden"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
        >
          <svg
            className="size-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-x-0 top-full border-t border-white/40 bg-white/95 px-4 pb-4 pt-2 shadow-lg [backdrop-filter:blur(16px)] md:hidden"
          >
            <nav className="flex flex-col gap-1">
              {navLinks.map(({ href, label }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={startClose}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                      active
                        ? "bg-emerald-100 text-emerald-900"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-emerald-800"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={startClose}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                    pathname.startsWith("/admin")
                      ? "bg-amber-100 text-amber-900"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-amber-800"
                  }`}
                >
                  Admin
                </Link>
              )}
            </nav>

            <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3">
              {loading ? (
                <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
              ) : user ? (
                <>
                  <span className="truncate px-4 py-1 text-xs text-zinc-500">
                    {user.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      startClose();
                      signOut();
                    }}
                    className="rounded-xl border border-zinc-200/90 bg-white/90 px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:border-emerald-300 hover:text-emerald-800"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      startClose();
                      setTimeout(() => openAuthModal("login"), 150);
                    }}
                    className="rounded-xl px-4 py-3 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-emerald-800"
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      startClose();
                      setTimeout(() => openAuthModal("signup"), 150);
                    }}
                    className="rounded-xl bg-emerald-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-900"
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
