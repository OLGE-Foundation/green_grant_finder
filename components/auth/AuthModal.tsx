"use client";

import { useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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



  // Lock body scroll while modal is visible
  useEffect(() => {
    if (!authModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [authModalOpen]);

  // Close on Escape
  useEffect(() => {
    if (!authModalOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeAuthModal();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [authModalOpen, closeAuthModal]);

  const handleClose = useCallback(() => {
    closeAuthModal();
  }, [closeAuthModal]);

  return (
    <AnimatePresence>
      {authModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          {/* Backdrop */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            type="button"
            className="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm"
            onClick={handleClose}
            aria-label="Close dialog"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: "100%", scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: "100%", scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative z-10 flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-3xl border border-white/70 bg-white/95 p-6 pb-8 shadow-2xl ring-1 ring-emerald-950/[0.04] [backdrop-filter:blur(16px)] md:max-w-md md:rounded-3xl md:p-8 md:pb-8"
          >
            {/* Drag handle — mobile visual indicator */}
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-300 md:hidden" aria-hidden />

            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              className="touch-target absolute right-3 top-3 flex size-10 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 z-20"
              aria-label="Close"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2
              id="auth-modal-title"
              className="pr-10 text-xl font-bold tracking-tight text-emerald-950"
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
