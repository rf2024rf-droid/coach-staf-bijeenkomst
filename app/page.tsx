"use client";

import { ArrowRight, LogIn, ShieldCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  function joinPresentation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = joinCode.replace(/[^a-z0-9]/gi, "").toUpperCase();
    if (code) {
      router.push(`/join/${code}`);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f5f0] text-zinc-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-5 py-6 md:px-8">
        <header className="flex flex-col gap-4 border-b border-zinc-300 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-800">Coach Staf Bijeenkomst</p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">Startpunt voor sessies</h1>
            <p className="mt-3 max-w-2xl leading-7 text-zinc-700">
              Moderators beheren presentaties centraal. Deelnemers gebruiken alleen de sessiecode of QR-code.
            </p>
          </div>
          <a
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 font-bold text-white hover:bg-emerald-900"
            href="/moderator"
          >
            <ShieldCheck aria-hidden className="h-5 w-5" />
            Moderator login
          </a>
        </header>

        <section className="grid flex-1 items-start gap-6 lg:grid-cols-[1fr_0.9fr]">
          <article className="rounded-lg border border-zinc-300 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-emerald-800 text-white">
                <ShieldCheck aria-hidden className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase text-emerald-800">Moderator</p>
                <h2 className="text-xl font-black">Centrale beheeromgeving</h2>
              </div>
            </div>
            <p className="leading-7 text-zinc-700">
              Log in als bedrijfsmoderator om presentaties aan te maken, bestaande sessies te openen, QR-codes te
              behouden en het grote scherm te bedienen.
            </p>
            <a
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 font-bold text-white hover:bg-zinc-700 sm:w-auto"
              href="/moderator"
            >
              Open moderatoromgeving
              <ArrowRight aria-hidden className="h-5 w-5" />
            </a>
          </article>

          <form className="rounded-lg border border-zinc-300 bg-white p-6 shadow-sm" onSubmit={joinPresentation}>
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-sky-800 text-white">
                <Users aria-hidden className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase text-sky-800">Deelnemer</p>
                <h2 className="text-xl font-black">Meedoen met een sessie</h2>
              </div>
            </div>

            <label className="block text-sm font-semibold text-zinc-800" htmlFor="join-code">
              Sessiecode
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3 text-center text-2xl font-black uppercase outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
              id="join-code"
              maxLength={12}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="ABC123"
              value={joinCode}
            />
            <button
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-800 px-4 py-3 font-bold text-white transition hover:bg-sky-900"
              type="submit"
            >
              <LogIn aria-hidden className="h-5 w-5" />
              Open deelnemersscherm
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
