"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./AuthProvider";

type AuthFormProps = {
  mode: "login" | "signup";
  onSuccess?: () => void;
  onSwitchMode?: (mode: "login" | "signup") => void;
  compact?: boolean;
};

export function AuthForm({ mode, onSuccess, onSwitchMode, compact }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { refreshSession } = useAuth();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          await refreshSession();
          onSuccess?.();
          return;
        }
        setMessage("Check your email to confirm your account, or sign in if confirmation is disabled.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        await refreshSession();
        onSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-600" htmlFor="auth-email">
          Email
        </label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-zinc-200/90 bg-white/90 px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-600" htmlFor="auth-password">
          Password
        </label>
        <input
          id="auth-password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-zinc-200/90 bg-white/90 px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15"
          placeholder="At least 8 characters"
        />
      </div>

      {error && (
        <p className="rounded-xl border border-red-200/80 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 disabled:opacity-60"
      >
        {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
      </button>

      {!compact && (
        <p className="text-center text-sm text-zinc-600">
          {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
          {onSwitchMode ? (
            <button
              type="button"
              onClick={() => onSwitchMode(mode === "signup" ? "login" : "signup")}
              className="font-semibold text-emerald-700 hover:text-emerald-800"
            >
              {mode === "signup" ? "Log in" : "Sign up"}
            </button>
          ) : (
            <Link
              href={mode === "signup" ? "/login" : "/signup"}
              className="font-semibold text-emerald-700 hover:text-emerald-800"
            >
              {mode === "signup" ? "Log in" : "Sign up"}
            </Link>
          )}
        </p>
      )}
    </form>
  );
}
