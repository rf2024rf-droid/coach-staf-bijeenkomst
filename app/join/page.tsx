"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LogIn } from "lucide-react";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = code.replace(/[^a-z0-9]/gi, "").toUpperCase();
    if (normalized) {
      router.push(`/join/${normalized}`);
    }
  }

  return (
    <main className="liquid-participant grid min-h-screen place-items-center px-5 text-white">
      <form className="glass-surface w-full max-w-md rounded-lg p-6" onSubmit={submit}>
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-emerald-300 text-emerald-950">
            <LogIn aria-hidden className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-300">Sessie Interactief</p>
            <h1 className="text-2xl font-black">Meedoen</h1>
          </div>
        </div>
        <label className="block text-sm font-semibold text-zinc-200" htmlFor="session-code">
          Sessiecode
        </label>
        <input
          autoFocus
          className="glass-field mt-2 w-full rounded-lg px-4 py-4 text-center text-3xl font-black uppercase outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/30"
          id="session-code"
          maxLength={12}
          onChange={(event) => setCode(event.target.value)}
          placeholder="ABC123"
          value={code}
        />
        <button className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-300 px-4 py-4 font-bold text-emerald-950 hover:bg-emerald-200" type="submit">
          <ArrowRight aria-hidden className="h-5 w-5" />
          Open vraag
        </button>
      </form>
    </main>
  );
}
