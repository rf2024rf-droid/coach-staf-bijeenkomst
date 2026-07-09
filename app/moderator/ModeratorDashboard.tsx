"use client";

import {
  ArrowRight,
  Ban,
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  LogOut,
  MailCheck,
  Monitor,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type {
  ModeratorAccountSummary,
  ModeratorPresentationSummary,
  ModeratorRole,
  PresenterPayload,
} from "@/app/types";

type SessionState = {
  configured: boolean;
  moderatorConfigured: boolean;
  accountAuthConfigured: boolean;
  signupCodeRequired: boolean;
  authenticated: boolean;
  role: ModeratorRole | null;
  email: string | null;
  limits: {
    accountCount: number;
    presentationCount: number;
    maxAccounts: number;
    maxPresentations: number | null;
    maxQuestions: number | null;
  };
};

type PresentationsResponse = {
  presentations: ModeratorPresentationSummary[];
};

type AccountsResponse = {
  accounts: ModeratorAccountSummary[];
};

type AccountActionResponse = AccountsResponse & {
  authCleanupWarning?: string | null;
  presentationsDeleted?: number;
};

type AuthMode = "login" | "signup" | "admin";
type EntryMode = "users" | "admin";
type ModeratorTab = "presentations" | "accounts";

type ModeratorDashboardProps = {
  entryMode?: EntryMode;
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status: ModeratorAccountSummary["status"]) {
  if (status === "active") {
    return "Actief";
  }
  if (status === "deactivated") {
    return "Gedeactiveerd";
  }
  if (status === "deleted") {
    return "Verwijderd";
  }
  return "Wacht op mailactivatie";
}

function statusClassName(status: ModeratorAccountSummary["status"]) {
  if (status === "active") {
    return "bg-emerald-100 text-emerald-900";
  }
  if (status === "deactivated") {
    return "bg-rose-100 text-rose-900";
  }
  if (status === "deleted") {
    return "bg-zinc-200 text-zinc-700";
  }
  return "bg-amber-100 text-amber-900";
}

function moderatorTabClassName(active: boolean) {
  return `rounded-lg px-4 py-3 text-left text-sm font-black transition ${
    active ? "bg-zinc-950 text-white shadow-sm" : "bg-white text-zinc-700 hover:bg-zinc-100"
  }`;
}

export default function ModeratorDashboard({ entryMode = "users" }: ModeratorDashboardProps) {
  const router = useRouter();
  const [session, setSession] = useState<SessionState | null>(null);
  const [presentations, setPresentations] = useState<ModeratorPresentationSummary[]>([]);
  const [accounts, setAccounts] = useState<ModeratorAccountSummary[]>([]);
  const [authMode, setAuthMode] = useState<AuthMode>(entryMode === "admin" ? "admin" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordRepeat, setSignupPasswordRepeat] = useState("");
  const [signupCode, setSignupCode] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [newTitle, setNewTitle] = useState("Sessie Interactief");
  const [newTemplate, setNewTemplate] = useState<"default" | "quiz">("default");
  const [query, setQuery] = useState("");
  const [moderatorTab, setModeratorTab] = useState<ModeratorTab>("presentations");
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
        presentation.code.toLowerCase().includes(needle) ||
        (presentation.ownerEmail ?? "").toLowerCase().includes(needle)
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

  const presentationLimitReached = Boolean(
    session?.role === "tester" &&
      session.limits.maxPresentations &&
      presentations.length >= session.limits.maxPresentations
  );

  const loadAccounts = useCallback(async () => {
    const response = await fetch("/api/moderator/accounts", { cache: "no-store" });
    const data = (await response.json()) as AccountsResponse | { error: string };
    if (!response.ok || "error" in data) {
      throw new Error("error" in data ? data.error : "Accounts konden niet worden geladen.");
    }
    setAccounts(data.accounts);
  }, []);

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
      const data = (await response.json()) as SessionState | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Inlogstatus kon niet worden geladen.");
      }

      setSession(data);
      if (data.authenticated) {
        await loadPresentations();
        if (data.role === "admin") {
          await loadAccounts();
        } else {
          setAccounts([]);
        }
      }
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Inlogstatus kon niet worden geladen.");
    } finally {
      setLoading(false);
    }
  }, [loadAccounts, loadPresentations]);

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

  function applyAccounts(data: AccountActionResponse | { error: string }) {
    if ("error" in data) {
      throw new Error(data.error);
    }
    setAccounts(data.accounts);
    return data;
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(authMode);
    setError("");

    try {
      const response = await fetch(authMode === "admin" ? "/api/moderator/login" : "/api/accounts/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(authMode === "admin" ? { password: adminPassword } : { email, password }),
      });
      const data = (await response.json()) as { ok: true } | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Inloggen is mislukt.");
      }

      setEmail("");
      setPassword("");
      setAdminPassword("");
      await loadSession();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Inloggen is mislukt.");
    } finally {
      setBusy("");
    }
  }

  async function signup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (signupPassword !== signupPasswordRepeat) {
      setError("De wachtwoorden zijn niet gelijk.");
      return;
    }

    setBusy("signup");
    setError("");

    try {
      const response = await fetch("/api/accounts/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
          signupCode,
        }),
      });
      const data = (await response.json()) as { ok: true; message: string } | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Account kon niet worden aangemaakt.");
      }

      setNotice(data.message);
      setAuthMode("login");
      setEmail(signupEmail);
      setSignupEmail("");
      setSignupPassword("");
      setSignupPasswordRepeat("");
      setSignupCode("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Account kon niet worden aangemaakt.");
    } finally {
      setBusy("");
    }
  }

  async function logout() {
    setBusy("logout");
    await fetch("/api/accounts/logout", { method: "POST" });
    setSession((current) =>
      current
        ? { ...current, authenticated: false, role: null, email: null }
        : current
    );
    setPresentations([]);
    setAccounts([]);
    setBusy("");
  }

  async function deleteOwnAccount() {
    const confirmed = window.confirm(
      "Je account verwijderen?\n\nDit verwijdert ook je presentaties, vragen en antwoorden. Dit kun je niet ongedaan maken."
    );
    if (!confirmed) {
      return;
    }

    const confirmedAgain = window.confirm("Weet je zeker dat je je gebruikersaccount definitief wilt verwijderen?");
    if (!confirmedAgain) {
      return;
    }

    setBusy("delete-own-account");
    setError("");

    try {
      const response = await fetch("/api/accounts/me", { method: "DELETE" });
      const data = (await response.json()) as { ok: true; authCleanupWarning?: string | null } | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Account kon niet worden verwijderd.");
      }

      setSession((current) =>
        current
          ? { ...current, authenticated: false, role: null, email: null }
          : current
      );
      setPresentations([]);
      setAccounts([]);
      setNotice(
        data.authCleanupWarning
          ? "Account lokaal verwijderd. Controleer Supabase Auth handmatig."
          : "Account verwijderd."
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Account kon niet worden verwijderd.");
    } finally {
      setBusy("");
    }
  }

  async function updateAccountStatus(account: ModeratorAccountSummary, action: "activate" | "deactivate") {
    if (action === "deactivate") {
      const confirmed = window.confirm(
        `Account tijdelijk deactiveren?\n\n${account.email}\n\nDe gebruiker kan dan niet meer inloggen of presentaties beheren.`
      );
      if (!confirmed) {
        return;
      }
    }

    setBusy(`${action}-account-${account.id}`);
    setError("");

    try {
      const response = await fetch(`/api/moderator/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      applyAccounts((await response.json()) as AccountActionResponse | { error: string });
      setNotice(action === "activate" ? "Account opnieuw geactiveerd" : "Account gedeactiveerd");
      window.setTimeout(() => setNotice(""), 1800);
      void loadSession();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Accountstatus kon niet worden bijgewerkt.");
    } finally {
      setBusy("");
    }
  }

  async function deleteAccount(account: ModeratorAccountSummary) {
    const confirmed = window.confirm(
      `Account verwijderen?\n\n${account.email}\n\nDit verwijdert ook alle presentaties, vragen en antwoorden van dit account.`
    );
    if (!confirmed) {
      return;
    }

    setBusy(`delete-account-${account.id}`);
    setError("");

    try {
      const response = await fetch(`/api/moderator/accounts/${account.id}`, {
        method: "DELETE",
      });
      const data = applyAccounts((await response.json()) as AccountActionResponse | { error: string });
      setNotice(
        data.authCleanupWarning
          ? "Account lokaal verwijderd. Controleer Supabase Auth handmatig."
          : "Account verwijderd."
      );
      window.setTimeout(() => setNotice(""), 2400);
      void loadSession();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Account kon niet worden verwijderd.");
    } finally {
      setBusy("");
    }
  }

  async function copyValue(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setNotice(`${label} gekopieerd`);
    window.setTimeout(() => setNotice(""), 1800);
  }

  async function createPresentation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) {
      setError("Titel is verplicht.");
      return;
    }

    if (presentationLimitReached) {
      setError(`Je kunt maximaal ${session?.limits.maxPresentations} presentaties of quizzen aanmaken.`);
      return;
    }

    setBusy("create");
    setError("");

    try {
      const response = await fetch("/api/presentations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, template: newTemplate }),
      });
      const payload = (await response.json()) as PresenterPayload | { error: string };
      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Presentatie kon niet worden aangemaakt.");
      }

      setNotice("Presentatie aangemaakt");
      router.push(`/presenter/${payload.presentation.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Presentatie kon niet worden aangemaakt.");
    } finally {
      setBusy("");
    }
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
      void loadSession();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Presentatie kon niet worden hernoemd.");
    } finally {
      setBusy("");
    }
  }

  async function duplicatePresentation(id: string) {
    if (presentationLimitReached) {
      setError(`Je kunt maximaal ${session?.limits.maxPresentations} presentaties of quizzen aanmaken.`);
      return;
    }

    setBusy(`duplicate-${id}`);
    setError("");
    try {
      const response = await fetch(`/api/moderator/presentations/${id}/duplicate`, {
        method: "POST",
      });
      applyPresentations((await response.json()) as PresentationsResponse | { error: string });
      setNotice("Presentatie gedupliceerd met nieuwe QR-code");
      window.setTimeout(() => setNotice(""), 1800);
      void loadSession();
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
      void loadSession();
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
          Omgeving laden...
        </div>
      </main>
    );
  }

  if (!session?.configured) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f5f0] px-5 text-zinc-950">
        <section className="w-full max-w-xl rounded-lg border border-amber-200 bg-white p-6 shadow-sm">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-amber-700 text-white">
            <KeyRound aria-hidden className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black">Login instellen</h1>
          <p className="mt-3 leading-7 text-zinc-700">
            Zet in Vercel minimaal <code>SUPABASE_URL</code> en <code>SUPABASE_ANON_KEY</code> voor gebruikersaccounts.
            Voor beheerderlogin kun je <code>MODERATOR_PASSWORD</code> blijven gebruiken.
          </p>
        </section>
      </main>
    );
  }

  if (!session.authenticated) {
    const availableModes: AuthMode[] = entryMode === "admin" ? ["admin"] : ["login", "signup"];

    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f5f0] px-5 py-8 text-zinc-950">
        <section className="w-full max-w-md rounded-lg border border-zinc-300 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-zinc-900 text-white">
              {entryMode === "admin" ? (
                <ShieldCheck aria-hidden className="h-5 w-5" />
              ) : (
                <KeyRound aria-hidden className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-xs font-black uppercase text-emerald-800">Sessie Interactief</p>
              <h1 className="text-xl font-black">
                {entryMode === "admin" ? "Beheerder login" : "Gebruikerslogin"}
              </h1>
            </div>
          </div>

          {availableModes.length > 1 ? (
            <div className="mb-5 grid gap-2 sm:grid-cols-2">
              {availableModes.map((mode) => (
                <button
                  className={`rounded-lg px-3 py-3 text-sm font-black ${
                    authMode === mode ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                  key={mode}
                  onClick={() => {
                    setAuthMode(mode);
                    setError("");
                    setNotice("");
                  }}
                  type="button"
                >
                  {mode === "login" ? "Inloggen" : "Account aanvragen"}
                </button>
              ))}
            </div>
          ) : null}

          {notice || error ? (
            <div
              className={`mb-4 rounded-lg px-4 py-3 text-sm font-semibold ${
                error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-900"
              }`}
            >
              {error || notice}
            </div>
          ) : null}

          {authMode === "signup" ? (
            <form onSubmit={signup}>
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-800 text-white">
                  <UserPlus aria-hidden className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Account aanvragen</h2>
                  <p className="text-sm text-zinc-600">Na aanmelding ontvang je een activatielink per e-mail.</p>
                </div>
              </div>
              <label className="block text-sm font-semibold text-zinc-700" htmlFor="signup-email">
                E-mailadres
              </label>
              <input
                className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                id="signup-email"
                onChange={(event) => setSignupEmail(event.target.value)}
                type="email"
                value={signupEmail}
              />
              <label className="mt-4 block text-sm font-semibold text-zinc-700" htmlFor="signup-password">
                Wachtwoord
              </label>
              <input
                className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                id="signup-password"
                minLength={8}
                onChange={(event) => setSignupPassword(event.target.value)}
                type="password"
                value={signupPassword}
              />
              <label className="mt-4 block text-sm font-semibold text-zinc-700" htmlFor="signup-password-repeat">
                Herhaal wachtwoord
              </label>
              <input
                className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                id="signup-password-repeat"
                minLength={8}
                onChange={(event) => setSignupPasswordRepeat(event.target.value)}
                type="password"
                value={signupPasswordRepeat}
              />
              {session.signupCodeRequired ? (
                <>
                  <label className="mt-4 block text-sm font-semibold text-zinc-700" htmlFor="signup-code">
                    Uitnodigingscode
                  </label>
                  <input
                    className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    id="signup-code"
                    onChange={(event) => setSignupCode(event.target.value)}
                    value={signupCode}
                  />
                </>
              ) : null}
              <button
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
                disabled={busy === "signup" || !session.accountAuthConfigured}
                type="submit"
              >
                <MailCheck aria-hidden className="h-5 w-5" />
                {busy === "signup" ? "Aanvragen..." : "Maak account aan"}
              </button>
              {!session.accountAuthConfigured ? (
                <p className="mt-3 text-sm font-semibold text-rose-800">
                  Supabase Auth staat nog niet ingesteld in Vercel.
                </p>
              ) : null}
            </form>
          ) : (
            <form onSubmit={login}>
              {authMode === "admin" ? (
                <>
                  <label className="block text-sm font-semibold text-zinc-700" htmlFor="admin-password">
                    Beheerwachtwoord
                  </label>
                  <input
                    className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    id="admin-password"
                    onChange={(event) => setAdminPassword(event.target.value)}
                    type="password"
                    value={adminPassword}
                  />
                </>
              ) : (
                <>
                  <label className="block text-sm font-semibold text-zinc-700" htmlFor="account-email">
                    E-mailadres
                  </label>
                  <input
                    className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    id="account-email"
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    value={email}
                  />
                  <label className="mt-4 block text-sm font-semibold text-zinc-700" htmlFor="account-password">
                    Wachtwoord
                  </label>
                  <input
                    className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    id="account-password"
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    value={password}
                  />
                </>
              )}
              <button
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
                disabled={busy === authMode || (authMode === "login" && !session.accountAuthConfigured)}
                type="submit"
              >
                <KeyRound aria-hidden className="h-5 w-5" />
                {busy === authMode ? "Inloggen..." : "Inloggen"}
              </button>
            </form>
          )}

          <a
            className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
            href={entryMode === "admin" ? "/moderator" : "/beheerder"}
          >
            {entryMode === "admin" ? "Naar gebruikerslogin" : "Naar beheerderlogin"}
          </a>
        </section>
      </main>
    );
  }

  if ((entryMode === "admin" && session.role !== "admin") || (entryMode === "users" && session.role === "admin")) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f5f0] px-5 text-zinc-950">
        <section className="w-full max-w-md rounded-lg border border-zinc-300 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase text-emerald-800">Sessie Interactief</p>
          <h1 className="mt-2 text-2xl font-black">Andere ingang nodig</h1>
          <p className="mt-3 leading-7 text-zinc-700">
            Je bent al ingelogd. Gebruik de juiste ingang voor dit account of log uit.
          </p>
          <div className="mt-5 grid gap-2">
            <a
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-3 font-bold text-white hover:bg-zinc-700"
              href={session.role === "admin" ? "/beheerder" : "/moderator"}
            >
              Open juiste omgeving
            </a>
            <button
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-3 font-bold text-zinc-700 hover:bg-zinc-50"
              onClick={logout}
              type="button"
            >
              Uitloggen
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f5f0] text-zinc-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 md:px-8">
        <header className="flex flex-col gap-4 border-b border-zinc-300 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-800">Sessie Interactief</p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">
              {session.role === "admin" ? "Platformbeheer" : "Mijn omgeving"}
            </h1>
            <p className="mt-2 max-w-2xl text-zinc-700">
              {session.role === "admin"
                ? "Beheer alle accounts, presentaties, QR-codes en presenter-schermen."
                : `Ingelogd als ${session.email}. Je presentaties en quizzen blijven bewaard.`}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-bold hover:bg-zinc-50"
              disabled={busy === "logout"}
              onClick={logout}
              type="button"
            >
              <LogOut aria-hidden className="h-4 w-4" />
              Uitloggen
            </button>
            {session.role === "tester" ? (
              <button
                className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 underline-offset-4 hover:text-rose-700 hover:underline disabled:opacity-60"
                disabled={busy === "delete-own-account"}
                onClick={deleteOwnAccount}
                type="button"
              >
                <Trash2 aria-hidden className="h-3.5 w-3.5" />
                {busy === "delete-own-account" ? "Verwijderen..." : "Account verwijderen"}
              </button>
            ) : null}
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

        {session.role === "admin" ? (
          <nav className="grid gap-2 rounded-lg border border-zinc-300 bg-zinc-100 p-2 sm:grid-cols-2">
            <button
              className={moderatorTabClassName(moderatorTab === "presentations")}
              onClick={() => setModeratorTab("presentations")}
              type="button"
            >
              <span className="block">Presentaties</span>
              <span className={`mt-1 block text-xs ${moderatorTab === "presentations" ? "text-zinc-300" : "text-zinc-500"}`}>
                {presentations.length} sessies
              </span>
            </button>
            <button
              className={moderatorTabClassName(moderatorTab === "accounts")}
              onClick={() => setModeratorTab("accounts")}
              type="button"
            >
              <span className="block">Gebruikers</span>
              <span className={`mt-1 block text-xs ${moderatorTab === "accounts" ? "text-zinc-300" : "text-zinc-500"}`}>
                {accounts.length}/{session.limits.maxAccounts} accounts
              </span>
            </button>
          </nav>
        ) : null}

        <section className={`${session.role === "admin" && moderatorTab !== "presentations" ? "hidden" : ""} grid gap-4 rounded-lg border border-zinc-300 bg-white p-5 shadow-sm lg:grid-cols-[1fr_auto] lg:items-end`}>
          <div>
            <p className="text-xs font-black uppercase text-emerald-800">Nieuwe sessie</p>
            <h2 className="mt-1 text-xl font-black">Presentatie aanmaken</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              {session.role === "tester"
                ? `Je kunt maximaal ${session.limits.maxPresentations} presentaties of quizzen maken met maximaal ${session.limits.maxQuestions} vragen per presentatie.`
                : "Maak hier een presentatie aan. Beheerderspresentaties hebben geen gebruikerslimiet."}
            </p>
          </div>
          <form className="grid gap-3 sm:grid-cols-[minmax(220px,340px)_minmax(180px,240px)] lg:grid-cols-[minmax(220px,340px)_minmax(180px,240px)_auto]" onSubmit={createPresentation}>
            <label className="sr-only" htmlFor="new-presentation-title">
              Titel
            </label>
            <input
              className="rounded-lg border border-zinc-300 px-4 py-3 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              id="new-presentation-title"
              maxLength={90}
              onChange={(event) => setNewTitle(event.target.value)}
              value={newTitle}
            />
            <label className="sr-only" htmlFor="new-presentation-template">
              Presentatietype
            </label>
            <select
              className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base font-bold outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              id="new-presentation-template"
              onChange={(event) => setNewTemplate(event.target.value === "quiz" ? "quiz" : "default")}
              value={newTemplate}
            >
              <option value="default">Interactieve sessie</option>
              <option value="quiz">Quizpresentatie</option>
            </select>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
              disabled={busy === "create" || presentationLimitReached}
              type="submit"
            >
              <Plus aria-hidden className="h-5 w-5" />
              {busy === "create" ? "Aanmaken..." : "Maak presentatie"}
            </button>
          </form>
        </section>

        <section className={`${session.role === "admin" && moderatorTab !== "presentations" ? "hidden" : ""} grid gap-2 rounded-lg border border-zinc-300 bg-white/80 p-2 md:grid-cols-4`}>
          <article className="rounded-lg bg-zinc-50 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-600">Presentaties</p>
            <p className="mt-1 text-2xl font-black">
              {presentations.length}
              {session.role === "tester" && session.limits.maxPresentations ? `/${session.limits.maxPresentations}` : ""}
            </p>
          </article>
          <article className="rounded-lg bg-zinc-50 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-600">Vragen</p>
            <p className="mt-1 text-2xl font-black">{totals.questions}</p>
          </article>
          <article className="rounded-lg bg-zinc-50 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-600">Antwoorden</p>
            <p className="mt-1 text-2xl font-black">{totals.answers}</p>
          </article>
          <article className="rounded-lg bg-zinc-50 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-600">
              {session.role === "admin" ? "Gebruikersaccounts" : "Deelnemers"}
            </p>
            <p className="mt-1 text-2xl font-black">
              {session.role === "admin"
                ? `${session.limits.accountCount}/${session.limits.maxAccounts}`
                : totals.participants}
            </p>
          </article>
        </section>

        {session.role === "admin" && moderatorTab === "accounts" ? (
          <section className="rounded-lg border border-zinc-300 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase text-emerald-800">Beheerder</p>
                <h2 className="text-lg font-black">Aangemelde accounts</h2>
              </div>
              <span className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-bold text-zinc-700">
                {accounts.length}/{session.limits.maxAccounts} gebruikersaccounts
              </span>
            </div>
            {!accounts.length ? (
              <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-zinc-600">
                Nog geen gebruikersaccounts aangemaakt.
              </div>
            ) : (
              <div className="grid gap-3">
                {accounts.map((account) => (
                  <article className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-[1fr_auto]" key={account.id}>
                    <div>
                      <h3 className="font-black">{account.email}</h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-sm">
                        <span className={`rounded-md px-2 py-1 font-bold ${statusClassName(account.status)}`}>
                          {statusLabel(account.status)}
                        </span>
                        <span className="rounded-md bg-white px-2 py-1 text-zinc-700">
                          {account.totals.presentations} presentaties
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 md:items-end">
                      <div className="text-sm text-zinc-600 md:text-right">
                        <p>Aangemaakt {formatDate(account.createdAt)}</p>
                        <p>Laatst ingelogd {formatDate(account.lastLoginAt)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        {account.status === "deactivated" ? (
                          <button
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
                            disabled={busy === `activate-account-${account.id}`}
                            onClick={() => updateAccountStatus(account, "activate")}
                            type="button"
                          >
                            <CheckCircle2 aria-hidden className="h-4 w-4" />
                            Activeer
                          </button>
                        ) : (
                          <button
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-100 disabled:opacity-60"
                            disabled={busy === `deactivate-account-${account.id}`}
                            onClick={() => updateAccountStatus(account, "deactivate")}
                            type="button"
                          >
                            <Ban aria-hidden className="h-4 w-4" />
                            Deactiveer
                          </button>
                        )}
                        <button
                          className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
                          disabled={busy === `delete-account-${account.id}`}
                          onClick={() => deleteAccount(account)}
                          type="button"
                        >
                          <Trash2 aria-hidden className="h-4 w-4" />
                          Verwijder
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}

        <section className={`${session.role === "admin" && moderatorTab !== "presentations" ? "hidden" : ""} rounded-lg border border-zinc-300 bg-white p-5 shadow-sm`}>
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-black">
              {session.role === "admin" ? "Aangemaakte presentaties" : "Mijn presentaties"}
            </h2>
            <label className="relative block w-full md:w-80">
              <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                className="w-full rounded-lg border border-zinc-300 py-3 pl-10 pr-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Zoek op titel, code of eigenaar"
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
                const presenterUrl = `/presenter/${presentation.id}`;
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
                          {session.role === "admin" ? (
                            <span className="rounded-md bg-emerald-50 px-2 py-1 font-bold text-emerald-900">
                              {presentation.ownerEmail ?? "Beheerder"}
                            </span>
                          ) : null}
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
                          disabled={busy === `duplicate-${presentation.id}` || presentationLimitReached}
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
