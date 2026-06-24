"use client";

import {
  ArrowRight,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  LogOut,
  Monitor,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ModeratorPresentationSummary } from "@/app/types";

type SessionState = {
  configured: boolean;
  authenticated: boolean;
};

type PresentationsResponse = {
  presentations: ModeratorPresentationSummary[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ModeratorDashboard() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [presentations, setPresentations] = useState<ModeratorPresentationSummary[]>([]);
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return presentations;
    }

    return presentations.filter(
      (presentation) =>
        presentation.title.toLowerCase().includes(needle) ||
        presentation.code.toLowerCase().includes(needle)
    );
  }, [presentations, query]);

  const totals = useMemo(
    () =>
      presentations.reduce(
        (accumulator, presentation) => ({
          questions: accumulator.questions + presentation.totals.questions,
          answers: accumulator.answers + presentation.totals.answers,
          participants: accumulator.participants + presentation.totals.participants,
        }),
        { questions: 0, answers: 0, participants: 0 }
      ),
    [presentations]
  );

  const loadPresentations = useCallback(async () => {
    const response = await fetch("/api/moderator/presentations", { cache: "no-store" });
    const data = (await response.json()) as PresentationsResponse | { error: string };
    if (!response.ok || "error" in data) {
      throw new Error("error" in data ? data.error : "Presentaties konden niet worden geladen.");
    }
    setPresentations(data.presentations);
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const response = await fetch("/api/moderator/session", { cache: "no-store" });
      const data = (await response.json()) as SessionState;
      setSession(data);
      if (data.authenticated) {
        await loadPresentations();
      }
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Moderatorstatus kon niet worden geladen.");
    } finally {
      setLoading(false);
    }
  }, [loadPresentations]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSession();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSession]);

  function applyPresentations(data: PresentationsResponse | { error: string }) {
    if ("error" in data) {
      throw new Error(data.error);
    }
    setPresentations(data.presentations);
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("login");
    setError("");

    try {
      const response = await fetch("/api/moderator/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { ok: true } | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Inloggen is mislukt.");
      }
      setSession({ configured: true, authenticated: true });
      setPassword("");
      await loadPresentations();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Inloggen is mislukt.");
    } finally {
      setBusy("");
    }
  }

  async function logout() {
    setBusy("logout");
    await fetch("/api/moderator/logout", { method: "POST" });
    setSession((current) => ({ configured: current?.configured ?? true, authenticated: false }));
    setPresentations([]);
    setBusy("");
  }

  async function copyValue(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setNotice(`${label} gekopieerd`);
    window.setTimeout(() => setNotice(""), 1800);
  }

  async function renamePresentation(id: string) {
    const title = titleDraft.trim();
    if (!title) {
      setError("Titel is verplicht.");
      return;
    }

    setBusy(`rename-${id}`);
    setError("");
    try {
      const response = await fetch(`/api/moderator/presentations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      });
      applyPresentations((await response.json()) as PresentationsResponse | { error: string });
      setEditingId("");
      setTitleDraft("");
      setNotice("Presentatie hernoemd");
      window.setTimeout(() => setNotice(""), 1800);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Presentatie kon niet worden hernoemd.");
    } finally {
      setBusy("");
    }
  }

  async function duplicatePresentation(id: string) {
    setBusy(`duplicate-${id}`);
    setError("");
    try {
      const response = await fetch(`/api/moderator/presentations/${id}/duplicate`, {
        method: "POST",
      });
      applyPresentations((await response.json()) as PresentationsResponse | { error: string });
      setNotice("Presentatie gedupliceerd met nieuwe QR-code");
      window.setTimeout(() => setNotice(""), 1800);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Presentatie kon niet worden gedupliceerd.");
    } finally {
      setBusy("");
    }
  }

  async function deletePresentation(id: string, title: string) {
    const confirmed = window.confirm(`Presentatie verwijderen?\n\n${title}\n\nDit verwijdert ook alle vragen en antwoorden.`);
    if (!confirmed) {
      return;
    }

    setBusy(`delete-${id}`);
    setError("");
    try {
      const response = await fetch(`/api/moderator/presentations/${id}`, {
        method: "DELETE",
      });
      applyPresentations((await response.json()) as PresentationsResponse | { error: string });
      setNotice("Presentatie verwijderd");
      window.setTimeout(() => setNotice(""), 1800);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Presentatie kon niet worden verwijderd.");
    } finally {
      setBusy("");
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f5f0] text-zinc-800">
        <div className="flex items-center gap-3 font-bold">
          <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
          Moderator laden...
        </div>
      </main>
    );
  }

  if (!session?.configured) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f5f0] px-5 text-zinc-950">
        <section className="w-full max-w-lg rounded-lg border border-amber-200 bg-white p-6 shadow-sm">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-amber-700 text-white">
            <KeyRound aria-hidden className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black">Moderator-login instellen</h1>
          <p className="mt-3 leading-7 text-zinc-700">
            Zet in Vercel bij Environment Variables eerst <code>MODERATOR_PASSWORD</code>.
            Daarna opnieuw deployen. Dan kun je hier inloggen en presentaties beheren.
          </p>
        </section>
      </main>
    );
  }

  if (!session.authenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f5f0] px-5 text-zinc-950">
        <form className="w-full max-w-md rounded-lg border border-zinc-300 bg-white p-6 shadow-sm" onSubmit={login}>
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-zinc-900 text-white">
              <KeyRound aria-hidden className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black">Moderator login</h1>
              <p className="text-sm text-zinc-600">Beheer bestaande presentaties en QR-codes.</p>
            </div>
          </div>
          <label className="block text-sm font-semibold text-zinc-700" htmlFor="moderator-password">
            Wachtwoord
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            id="moderator-password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
          {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">{error}</p> : null}
          <button
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
            disabled={busy === "login"}
            type="submit"
          >
            <KeyRound aria-hidden className="h-5 w-5" />
            {busy === "login" ? "Inloggen..." : "Open beheer"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f5f0] text-zinc-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 md:px-8">
        <header className="flex flex-col gap-4 border-b border-zinc-300 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-800">Coach Staf Bijeenkomst</p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">Moderator beheer</h1>
            <p className="mt-2 max-w-2xl text-zinc-700">
              Open bestaande presentaties, behoud QR-codes, hernoem sessies of maak een schone kopie.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-900"
              href="/"
            >
              <Plus aria-hidden className="h-4 w-4" />
              Nieuwe presentatie
            </Link>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-bold hover:bg-zinc-50"
              disabled={busy === "logout"}
              onClick={logout}
              type="button"
            >
              <LogOut aria-hidden className="h-4 w-4" />
              Uitloggen
            </button>
          </div>
        </header>

        {notice || error ? (
          <div
            className={`rounded-lg px-4 py-3 text-sm font-semibold ${
              error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-900"
            }`}
          >
            {error || notice}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <article className="rounded-lg border border-zinc-300 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-zinc-600">Presentaties</p>
            <p className="mt-2 text-3xl font-black">{presentations.length}</p>
          </article>
          <article className="rounded-lg border border-zinc-300 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-zinc-600">Vragen</p>
            <p className="mt-2 text-3xl font-black">{totals.questions}</p>
          </article>
          <article className="rounded-lg border border-zinc-300 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-zinc-600">Antwoorden</p>
            <p className="mt-2 text-3xl font-black">{totals.answers}</p>
          </article>
          <article className="rounded-lg border border-zinc-300 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-zinc-600">Deelnemers</p>
            <p className="mt-2 text-3xl font-black">{totals.participants}</p>
          </article>
        </section>

        <section className="rounded-lg border border-zinc-300 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-black">Aangemaakte presentaties</h2>
            <label className="relative block w-full md:w-80">
              <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                className="w-full rounded-lg border border-zinc-300 py-3 pl-10 pr-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Zoek op titel of code"
                value={query}
              />
            </label>
          </div>

          {!filtered.length ? (
            <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-600">
              Geen presentaties gevonden.
            </div>
          ) : (
            <div className="grid gap-4">
              {filtered.map((presentation) => {
                const presenterUrl = `/presenter/${presentation.id}?key=${presentation.presenterKey}`;
                const joinUrl = `${origin}/join/${presentation.code}`;
                const screenUrl = `${origin}/screen/${presentation.code}`;
                const isEditing = editingId === presentation.id;

                return (
                  <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={presentation.id}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-bold outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                              maxLength={90}
                              onChange={(event) => setTitleDraft(event.target.value)}
                              value={titleDraft}
                            />
                            <button
                              className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
                              disabled={busy === `rename-${presentation.id}`}
                              onClick={() => renamePresentation(presentation.id)}
                              type="button"
                            >
                              Opslaan
                            </button>
                          </div>
                        ) : (
                          <h3 className="truncate text-xl font-black">{presentation.title}</h3>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                          <span className="rounded-md bg-zinc-900 px-2 py-1 font-mono font-black text-white">
                            {presentation.code}
                          </span>
                          <span className="rounded-md bg-white px-2 py-1 text-zinc-700">
                            {presentation.totals.questions} vragen
                          </span>
                          <span className="rounded-md bg-white px-2 py-1 text-zinc-700">
                            {presentation.totals.answers} antwoorden
                          </span>
                          <span className="rounded-md bg-white px-2 py-1 text-zinc-700">
                            {presentation.totals.participants} deelnemers
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-zinc-600">
                          Aangemaakt {formatDate(presentation.createdAt)} / bijgewerkt {formatDate(presentation.updatedAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <a
                          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-bold text-white hover:bg-zinc-700"
                          href={presenterUrl}
                        >
                          <ArrowRight aria-hidden className="h-4 w-4" />
                          Open
                        </a>
                        <a
                          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-100"
                          href={`/screen/${presentation.code}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <Monitor aria-hidden className="h-4 w-4" />
                          Scherm
                        </a>
                        <button
                          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-100"
                          onClick={() => copyValue(joinUrl, "Deelnemerslink")}
                          type="button"
                        >
                          <Copy aria-hidden className="h-4 w-4" />
                          Link
                        </button>
                        <button
                          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-100"
                          onClick={() => copyValue(screenUrl, "Schermlink")}
                          type="button"
                        >
                          <ExternalLink aria-hidden className="h-4 w-4" />
                          URL
                        </button>
                        <button
                          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-100"
                          onClick={() => {
                            setEditingId(isEditing ? "" : presentation.id);
                            setTitleDraft(isEditing ? "" : presentation.title);
                          }}
                          type="button"
                        >
                          <Pencil aria-hidden className="h-4 w-4" />
                          {isEditing ? "Annuleer" : "Naam"}
                        </button>
                        <button
                          className="inline-flex items-center gap-2 rounded-lg bg-sky-800 px-3 py-2 text-sm font-bold text-white hover:bg-sky-900 disabled:opacity-60"
                          disabled={busy === `duplicate-${presentation.id}`}
                          onClick={() => duplicatePresentation(presentation.id)}
                          type="button"
                        >
                          <Copy aria-hidden className="h-4 w-4" />
                          Dupliceer
                        </button>
                        <button
                          className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
                          disabled={busy === `delete-${presentation.id}`}
                          onClick={() => deletePresentation(presentation.id, presentation.title)}
                          type="button"
                        >
                          <Trash2 aria-hidden className="h-4 w-4" />
                          Verwijder
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
