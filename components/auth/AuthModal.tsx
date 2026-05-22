"use client";

import { useEffect } from "react";
import { AuthForm } from "./AuthForm";
import { useAuth } from "./AuthProvider";

export function AuthModal() {
  const {
    authModalOpen,
    authModalMode,
    closeAuthModal,
    openAuthModal,
    refreshSession,
  } = useAuth();

  useEffect(() => {
    if (!authModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [authModalOpen]);

  if (!authModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm"
        onClick={closeAuthModal}
        aria-label="Close dialog"
      />
      <div className="relative w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl ring-1 ring-emerald-950/[0.04] [backdrop-filter:blur(16px)] sm:p-8">
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          aria-label="Close"
        >
          ×
        </button>

        <h2
          id="auth-modal-title"
          className="text-xl font-bold tracking-tight text-emerald-950"
        >
          {authModalMode === "signup" ? "Create your account" : "Log in to save grants"}
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          {authModalMode === "signup"
            ? "Sign up to bookmark grants and receive weekly alerts."
            : "Log in to bookmark grants and access your saved list."}
        </p>

        <div className="mt-6">
          <AuthForm
            key={authModalMode}
            mode={authModalMode}
            compact
            onSwitchMode={(next) => openAuthModal(next)}
            onSuccess={async () => {
              await refreshSession();
              closeAuthModal();
            }}
          />
        </div>
      </div>
    </div>
  );
}
