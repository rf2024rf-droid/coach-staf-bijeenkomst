"use client";

import { ArrowRight, Hash, LogIn } from "lucide-react";
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
    <main className="liquid-participant grid min-h-screen place-items-center px-4 py-8 text-white sm:px-6">
      <div className="w-full max-w-lg">
        <header className="mb-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-emerald-300/25 bg-emerald-400/12 text-emerald-200 shadow-lg shadow-black/20">
            <LogIn aria-hidden className="h-6 w-6" />
          </div>
          <p className="mt-5 text-xs font-black uppercase text-emerald-300">Sessie Interactief</p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Doe mee met de sessie</h1>
          <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-zinc-300 sm:text-base">
            Vul de sessiecode in die op het grote scherm staat.
          </p>
        </header>

        <form className="glass-surface rounded-lg p-4 sm:p-6" onSubmit={joinPresentation}>
          <label className="flex items-center gap-2 text-sm font-bold text-zinc-200" htmlFor="join-code">
            <Hash aria-hidden className="h-4 w-4 text-emerald-300" />
            Sessiecode
          </label>
          <input
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            className="glass-field mt-2 w-full rounded-lg px-4 py-4 text-center font-mono text-3xl font-black uppercase outline-none focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/15"
            id="join-code"
            inputMode="text"
            maxLength={12}
            onChange={(event) => setJoinCode(event.target.value)}
            placeholder="ABC123"
            spellCheck={false}
            value={joinCode}
          />
          <button
            className="liquid-button mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-emerald-300/50 bg-emerald-400 px-4 py-3 font-black text-black hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!joinCode.replace(/[^a-z0-9]/gi, "")}
            type="submit"
          >
            Deelnemen
            <ArrowRight aria-hidden className="h-5 w-5" />
          </button>
        </form>
      </div>
    </main>
  );
}
