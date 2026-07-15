import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Presentation, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Organisatie login | Sessie Interactief",
  description: "Aparte login voor moderators en de hoofdbeheerder van Sessie Interactief.",
};

export default function LoginPortalPage() {
  return (
    <main className="liquid-app grid min-h-screen place-items-center px-4 py-8 text-white sm:px-6">
      <div className="w-full max-w-lg">
        <header className="mb-6 text-center">
          <p className="text-xs font-black uppercase text-emerald-300">Sessie Interactief</p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Organisatie login</h1>
          <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-zinc-300 sm:text-base">
            Kies de omgeving die bij je rol hoort.
          </p>
        </header>

        <section className="glass-surface grid gap-3 rounded-lg p-4 sm:p-6">
          <Link
            className="liquid-button flex min-h-16 items-center gap-4 rounded-lg border border-emerald-300/35 bg-emerald-400/12 px-4 py-3 text-left text-emerald-50 hover:bg-emerald-400/18"
            href="/moderator"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-400 text-black">
              <Presentation aria-hidden className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block font-black">Moderator of presentator</strong>
              <span className="mt-0.5 block text-sm font-semibold text-zinc-300">Beheer eigen presentaties en open de regie.</span>
            </span>
            <ArrowRight aria-hidden className="h-5 w-5 shrink-0" />
          </Link>

          <Link
            className="liquid-button flex min-h-16 items-center gap-4 rounded-lg border border-white/15 bg-white/[0.055] px-4 py-3 text-left text-white hover:bg-white/[0.09]"
            href="/beheerder"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/[0.11] text-white ring-1 ring-white/15">
              <ShieldCheck aria-hidden className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block font-black">Hoofdbeheerder</strong>
              <span className="mt-0.5 block text-sm font-semibold text-zinc-300">Beheer accounts en alle presentaties.</span>
            </span>
            <ArrowRight aria-hidden className="h-5 w-5 shrink-0" />
          </Link>

          <Link
            className="liquid-button mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-sm font-bold text-zinc-300 hover:bg-white/[0.055] hover:text-white"
            href="/"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Naar deelnemersingang
          </Link>
        </section>
      </div>
    </main>
  );
}
