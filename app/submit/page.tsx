import Link from "next/link";
import { PageBackground } from "@/components/PageBackground";
import { SubmitGrantForm } from "@/components/SubmitGrantForm";

export default function SubmitPage() {
  return (
    <PageBackground>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-emerald-950">
            Submit a grant
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Providers can submit funding opportunities for review. Approved grants
            appear in the public directory.
          </p>
        </header>
        <SubmitGrantForm />
        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link href="/" className="font-medium text-emerald-700 hover:text-emerald-800">
            ← Back to directory
          </Link>
        </p>
      </div>
    </PageBackground>
  );
}
