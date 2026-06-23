"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, LogIn, Plus, Presentation, Users } from "lucide-react";
import type { PresenterPayload } from "@/app/types";

type RecentPresentation = {
  id: string;
  title: string;
  code: string;
  key: string;
  createdAt: string;
};

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState("Coach Staf Bijeenkomst");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<RecentPresentation[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const stored = window.localStorage.getItem("coach-staf-presentations");
    return stored ? (JSON.parse(stored) as RecentPresentation[]) : [];
  });

  function storeRecent(payload: PresenterPayload) {
    const item: RecentPresentation = {
      id: payload.presentation.id,
      title: payload.presentation.title,
      code: payload.presentation.code,
      key: payload.presentation.presenterKey,
      createdAt: payload.presentation.createdAt,
    };
    const next = [item, ...recent.filter((entry) => entry.id !== item.id)].slice(0, 5);
    setRecent(next);
    window.localStorage.setItem("coach-staf-presentations", JSON.stringify(next));
  }

  async function createPresentation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/presentations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const payload = (await response.json()) as PresenterPayload | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Presentatie kon niet worden aangemaakt.");
      }

      storeRecent(payload);
      router.push(`/presenter/${payload.presentation.id}?key=${payload.presentation.presenterKey}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Presentatie kon niet worden aangemaakt.");
    } finally {
      setBusy(false);
    }
  }

  function joinPresentation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = joinCode.replace(/[^a-z0-9]/gi, "").toUpperCase();
    if (code) {
      router.push(`/join/${code}`);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f5f0] text-zinc-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 md:px-8 lg:py-10">
        <header className="flex flex-col gap-4 border-b border-zinc-300 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-800">Coach Staf Bijeenkomst</p>
            <h1 className="mt-2 text-3xl font-bold md:text-5xl">Interactieve sessie starten</h1>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-zinc-700">
            <span className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2">
              <Presentation aria-hidden className="h-4 w-4 text-emerald-800" />
              Presentator
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2">
              <Users aria-hidden className="h-4 w-4 text-sky-800" />
              Deelnemers
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2">
              <KeyRound aria-hidden className="h-4 w-4 text-amber-700" />
              Beheersleutel
            </span>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <form className="rounded-lg border border-zinc-300 bg-white p-5 shadow-sm" onSubmit={createPresentation}>
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-800 text-white">
                <Plus aria-hidden className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Nieuwe presentatie</h2>
                <p className="text-sm text-zinc-600">QR-code, join-code en startvragen worden direct aangemaakt.</p>
              </div>
            </div>

            <label className="block text-sm font-semibold text-zinc-800" htmlFor="presentation-title">
              Titel
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              id="presentation-title"
              maxLength={90}
              onChange={(event) => setTitle(event.target.value)}
              value={title}
            />
            {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
            <button
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 font-bold text-white transition hover:bg-emerald-900 disabled:opacity-60 md:w-auto"
              disabled={busy}
              type="submit"
            >
              <Plus aria-hidden className="h-5 w-5" />
              {busy ? "Aanmaken..." : "Maak presentatie"}
            </button>
          </form>

          <form className="rounded-lg border border-zinc-300 bg-white p-5 shadow-sm" onSubmit={joinPresentation}>
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-800 text-white">
                <LogIn aria-hidden className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Meedoen</h2>
                <p className="text-sm text-zinc-600">Gebruik de code van het scherm of scan de QR-code.</p>
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
              <ArrowRight aria-hidden className="h-5 w-5" />
              Open deelnemersscherm
            </button>
          </form>
        </section>

        {recent.length ? (
          <section className="rounded-lg border border-zinc-300 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold">Recente presentaties</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {recent.map((entry) => (
                <button
                  className="rounded-lg border border-zinc-200 p-4 text-left transition hover:border-emerald-700 hover:bg-emerald-50"
                  key={entry.id}
                  onClick={() => router.push(`/presenter/${entry.id}?key=${entry.key}`)}
                  type="button"
                >
                  <span className="block text-base font-bold">{entry.title}</span>
                  <span className="mt-2 inline-flex rounded-md bg-zinc-100 px-2 py-1 font-mono text-sm font-bold text-zinc-700">
                    {entry.code}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
