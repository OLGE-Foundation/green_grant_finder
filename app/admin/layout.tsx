import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin — Green Grant Finder" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Second layer of defence: the middleware redirect is the first.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.app_metadata?.is_admin) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="flex items-center justify-between gap-4 border-b border-emerald-900 bg-emerald-950 px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Admin
          </p>
          <h1 className="text-lg font-bold text-white">Green Grant Finder</h1>
        </div>
        <Link
          href="/"
          className="rounded-full border border-emerald-700 px-4 py-1.5 text-xs font-semibold text-emerald-100 transition-colors hover:bg-emerald-900"
        >
          View site ↗
        </Link>
      </div>
      <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}
