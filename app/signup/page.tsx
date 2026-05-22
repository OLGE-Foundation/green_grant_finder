"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { PageBackground } from "@/components/PageBackground";

export default function SignUpPage() {
  const router = useRouter();

  return (
    <PageBackground>
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-3xl border border-white/70 bg-white/85 p-8 shadow-xl ring-1 ring-emerald-950/[0.04] [backdrop-filter:blur(16px)]">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Sign up</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Create an account to bookmark grants and receive weekly alerts.
          </p>
          <div className="mt-6">
            <AuthForm mode="signup" onSuccess={() => router.push("/saved")} />
          </div>
          <p className="mt-6 text-center text-sm text-zinc-500">
            <Link href="/" className="font-medium text-emerald-700 hover:text-emerald-800">
              ← Back to directory
            </Link>
          </p>
        </div>
      </div>
    </PageBackground>
  );
}
