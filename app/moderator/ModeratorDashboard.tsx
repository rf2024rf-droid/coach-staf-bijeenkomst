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
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionButton,
  Badge,
  CompactRow,
  DangerButton,
  EmptyState,
  MetricBadge,
  OverflowMenu,
  PageHeader,
  Panel,
  SectionHeader,
  StatusBadge,
  type Tone,
} from "@/app/components/design-system";
import type {
  ModeratorAccountSummary,
  ModeratorPresentationSummary,
  ModeratorRole,
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

function statusTone(status: ModeratorAccountSummary["status"]): Tone {
  if (status === "active") {
    return "emerald";
  }
  if (status === "deactivated") {
    return "rose";
  }
  if (status === "deleted") {
    return "zinc";
  }
  return "amber";
}

function presentationStatusLabel(status: ModeratorPresentationSummary["workflowStatus"]) {
  if (status === "published") {
    return "Gepubliceerd";
  }
  if (status === "completed") {
    return "Afgerond";
  }
  return "Concept";
}

function presentationStatusTone(status: ModeratorPresentationSummary["workflowStatus"]): Tone {
  if (status === "published") {
    return "emerald";
  }
  if (status === "completed") {
    return "sky";
  }
  return "amber";
}

function presentationTypeLabel(type: ModeratorPresentationSummary["presentationType"]) {
  if (type === "quiz") {
    return "Quiz";
  }
  if (type === "combined") {
    return "Combinatie";
  }
  return "Interactieve presentatie";
}

function moderatorTabClassName(active: boolean) {
  return `rounded-lg px-3 py-3 text-left text-sm font-black transition sm:px-4 ${
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
          slides: accumulator.slides + presentation.totals.slides,
          items: accumulator.items + presentation.totals.items,
          answers: accumulator.answers + presentation.totals.answers,
          participants: accumulator.participants + presentation.totals.participants,
        }),
        { questions: 0, slides: 0, items: 0, answers: 0, participants: 0 }
      ),
    [presentations]
  );

  const presentationLimitReached = Boolean(
    session?.role === "tester" &&
      session.limits.maxPresentations &&
      presentations.length >= session.limits.maxPresentations
  );

  function builderPath(presentationId?: string) {
    const params = new URLSearchParams({
      returnTo: session?.role === "admin" ? "beheerder" : "moderator",
    });

    if (presentationId) {
      params.set("id", presentationId);
    }

    return `/moderator/nieuw?${params.toString()}`;
  }

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

  useEffect(() => {
    if (!session?.authenticated || !session.role) {
      return;
    }

    const wrongEntry =
      (entryMode === "admin" && session.role !== "admin") ||
      (entryMode === "users" && session.role === "admin");

    if (wrongEntry) {
      router.replace(session.role === "admin" ? "/beheerder" : "/moderator");
    }
  }, [entryMode, router, session?.authenticated, session?.role]);

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
      <main className="grid min-h-screen place-items-center bg-[#f5f5f0] px-4 py-6 text-zinc-950 sm:px-5 sm:py-8">
        <section className="w-full max-w-md rounded-lg border border-zinc-300 bg-white p-5 shadow-sm sm:p-6">
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
            <div className="mb-5 grid grid-cols-2 gap-2">
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
        <div className="flex items-center gap-3 font-bold text-zinc-700">
          <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
          Dashboard openen...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f5f0] text-zinc-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-3 md:gap-4 md:px-8 md:py-5">
        <PageHeader
          actions={
            <>
              <ActionButton
                disabled={busy === "logout"}
                icon={<LogOut aria-hidden className="h-4 w-4" />}
                onClick={logout}
                variant="secondary"
              >
                Uitloggen
              </ActionButton>
              {session.role === "tester" ? (
                <DangerButton
                  className="text-xs"
                  disabled={busy === "delete-own-account"}
                  icon={<Trash2 aria-hidden className="h-3.5 w-3.5" />}
                  onClick={deleteOwnAccount}
                  size="sm"
                >
                  {busy === "delete-own-account" ? "Verwijderen..." : "Account verwijderen"}
                </DangerButton>
              ) : null}
            </>
          }
          eyebrow="Sessie Interactief"
          metrics={
            <>
              <MetricBadge label="Presentaties" value={presentations.length} />
              <MetricBadge label="Onderdelen" value={totals.items} />
              <MetricBadge label="Antwoorden" value={totals.answers} />
              <MetricBadge
                label={session.role === "admin" ? "Accounts" : "Deelnemers"}
                value={session.role === "admin" ? `${session.limits.accountCount}/${session.limits.maxAccounts}` : totals.participants}
              />
            </>
          }
          subtitle={
            session.role === "admin"
              ? "Beheer accounts, presentaties, QR-codes en presenter-schermen vanuit een rustig overzicht."
              : `Ingelogd als ${session.email}. Je presentaties en quizzen blijven bewaard.`
          }
          title={session.role === "admin" ? "Platformbeheer" : "Mijn omgeving"}
        />

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
          <nav className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-300 bg-zinc-100 p-2">
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

        <Panel className={session.role === "admin" && moderatorTab !== "presentations" ? "hidden" : ""}>
          <SectionHeader
            actions={
              <ActionButton
                disabled={presentationLimitReached}
                icon={<Plus aria-hidden className="h-5 w-5" />}
                onClick={() => router.push(builderPath())}
                trailingIcon={<ArrowRight aria-hidden className="h-4 w-4" />}
                variant="success"
              >
                Nieuwe presentatie
              </ActionButton>
            }
            eyebrow="Startpunt"
            subtitle={
              session.role === "tester"
                ? `Maximaal ${session.limits.maxPresentations} presentaties of quizzen met maximaal ${session.limits.maxQuestions} onderdelen per presentatie.`
                : "Maak stap voor stap een presentatie, quiz of combinatie met vragen en slides."
            }
            title="Nieuwe presentatie maken"
          />
        </Panel>

        {session.role === "admin" && moderatorTab === "accounts" ? (
          <Panel>
            <SectionHeader
              actions={<MetricBadge label="Gebruikersaccounts" value={`${accounts.length}/${session.limits.maxAccounts}`} />}
              eyebrow="Beheerder"
              title="Aangemelde accounts"
            />
            {!accounts.length ? (
              <EmptyState
                description="Nieuwe testgebruikers verschijnen hier zodra ze hun account hebben aangemaakt."
                title="Nog geen gebruikersaccounts"
              />
            ) : (
              <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 md:mt-4">
                {accounts.map((account) => (
                  <CompactRow
                    actions={
                      <>
                        {account.status === "deactivated" ? (
                          <ActionButton
                            disabled={busy === `activate-account-${account.id}`}
                            icon={<CheckCircle2 aria-hidden className="h-4 w-4" />}
                            onClick={() => updateAccountStatus(account, "activate")}
                            size="sm"
                            variant="success"
                          >
                            Activeer
                          </ActionButton>
                        ) : (
                          <ActionButton
                            disabled={busy === `deactivate-account-${account.id}`}
                            icon={<Ban aria-hidden className="h-4 w-4" />}
                            onClick={() => updateAccountStatus(account, "deactivate")}
                            size="sm"
                          >
                            Deactiveer
                          </ActionButton>
                        )}
                        <DangerButton
                          disabled={busy === `delete-account-${account.id}`}
                          icon={<Trash2 aria-hidden className="h-4 w-4" />}
                          onClick={() => deleteAccount(account)}
                          size="sm"
                        >
                          Verwijder
                        </DangerButton>
                      </>
                    }
                    key={account.id}
                    meta={
                      <>
                        <StatusBadge tone={statusTone(account.status)}>{statusLabel(account.status)}</StatusBadge>
                        <Badge>{account.totals.presentations} presentaties</Badge>
                      </>
                    }
                    title={account.email}
                  >
                    <p className="mt-2 text-sm font-semibold text-zinc-600">
                      Aangemaakt {formatDate(account.createdAt)} · Laatst ingelogd {formatDate(account.lastLoginAt)}
                    </p>
                  </CompactRow>
                ))}
              </div>
            )}
          </Panel>
        ) : null}

        <Panel className={session.role === "admin" && moderatorTab !== "presentations" ? "hidden" : ""}>
          <SectionHeader
            actions={
              <label className="relative block w-full md:w-80">
                <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  className="w-full rounded-lg border border-zinc-300 py-2.5 pl-10 pr-3 text-sm font-bold outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Zoek op titel, code of eigenaar"
                  value={query}
                />
              </label>
            }
            eyebrow="Overzicht"
            title={session.role === "admin" ? "Aangemaakte presentaties" : "Mijn presentaties"}
          />

          {!filtered.length ? (
            <EmptyState
              action={
                !presentations.length ? (
                  <ActionButton
                    icon={<Plus aria-hidden className="h-5 w-5" />}
                    onClick={() => router.push(builderPath())}
                    variant="success"
                  >
                    Nieuwe presentatie maken
                  </ActionButton>
                ) : null
              }
              description={
                presentations.length
                  ? "Pas je zoekopdracht aan om andere sessies te tonen."
                  : "Start met een titel, kies daarna het type en voeg stap voor stap vragen of slides toe."
              }
              title={presentations.length ? "Geen presentaties gevonden" : "Je eerste presentatie staat klaar om gemaakt te worden"}
            />
          ) : (
            <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 md:mt-4">
              {filtered.map((presentation) => {
                const presenterUrl = `/presenter/${presentation.id}`;
                const joinUrl = `${origin}/join/${presentation.code}`;
                const screenUrl = `${origin}/screen/${presentation.code}`;
                const isEditing = editingId === presentation.id;

                return (
                  <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 md:p-4" key={presentation.id}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-bold outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                              maxLength={90}
                              onChange={(event) => setTitleDraft(event.target.value)}
                              value={titleDraft}
                            />
                            <ActionButton
                              disabled={busy === `rename-${presentation.id}`}
                              onClick={() => renamePresentation(presentation.id)}
                              size="sm"
                              variant="success"
                            >
                              Opslaan
                            </ActionButton>
                          </div>
                        ) : (
                          <h3 className="break-words text-base font-black leading-snug md:text-xl">{presentation.title}</h3>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs md:mt-3 md:gap-2 md:text-sm">
                          <Badge tone="black">{presentation.code}</Badge>
                          {session.role === "admin" ? <Badge tone="emerald">{presentation.ownerEmail ?? "Beheerder"}</Badge> : null}
                          <Badge tone="black">{presentationTypeLabel(presentation.presentationType)}</Badge>
                          <StatusBadge tone={presentationStatusTone(presentation.workflowStatus)}>
                            {presentationStatusLabel(presentation.workflowStatus)}
                          </StatusBadge>
                          <Badge>{presentation.totals.items} onderdelen</Badge>
                          <Badge className="hidden sm:inline-flex">
                            {presentation.totals.questions} vragen / {presentation.totals.slides} slides
                          </Badge>
                          <Badge className="hidden sm:inline-flex">{presentation.totals.answers} antwoorden</Badge>
                          <Badge>{presentation.totals.participants} deelnemers</Badge>
                        </div>
                        <p className="mt-2 text-xs text-zinc-600 md:mt-3 md:text-sm">
                          Laatste wijziging {formatDate(presentation.updatedAt)}
                        </p>
                      </div>

                      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 md:hidden">
                        <ActionButton
                          href={presenterUrl}
                          icon={<ArrowRight aria-hidden className="h-4 w-4" />}
                          variant="primary"
                        >
                          Regie
                        </ActionButton>
                        <ActionButton
                          href={builderPath(presentation.id)}
                          icon={<Pencil aria-hidden className="h-4 w-4" />}
                          variant="success"
                        >
                          Bewerk
                        </ActionButton>
                        <OverflowMenu summary={<MoreHorizontal aria-hidden className="h-5 w-5" />}>
                            <a
                              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold hover:bg-zinc-100"
                              href={`/screen/${presentation.code}`}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <Monitor aria-hidden className="h-4 w-4" />
                              Scherm
                            </a>
                            <button
                              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold hover:bg-zinc-100"
                              onClick={() => copyValue(joinUrl, "Deelnemerslink")}
                              type="button"
                            >
                              <Copy aria-hidden className="h-4 w-4" />
                              Link kopiëren
                            </button>
                            <button
                              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold hover:bg-zinc-100"
                              onClick={() => {
                                setEditingId(isEditing ? "" : presentation.id);
                                setTitleDraft(isEditing ? "" : presentation.title);
                              }}
                              type="button"
                            >
                              <Pencil aria-hidden className="h-4 w-4" />
                              Naam wijzigen
                            </button>
                            <button
                              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold hover:bg-zinc-100 disabled:opacity-60"
                              disabled={busy === `duplicate-${presentation.id}` || presentationLimitReached}
                              onClick={() => duplicatePresentation(presentation.id)}
                              type="button"
                            >
                              <Copy aria-hidden className="h-4 w-4" />
                              Dupliceer
                            </button>
                            <button
                              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold text-rose-800 hover:bg-rose-50 disabled:opacity-60"
                              disabled={busy === `delete-${presentation.id}`}
                              onClick={() => deletePresentation(presentation.id, presentation.title)}
                              type="button"
                            >
                              <Trash2 aria-hidden className="h-4 w-4" />
                              Verwijder
                            </button>
                        </OverflowMenu>
                      </div>

                      <div className="hidden gap-2 md:grid md:grid-cols-3 lg:flex lg:flex-wrap lg:justify-end">
                        <ActionButton
                          href={builderPath(presentation.id)}
                          icon={<Pencil aria-hidden className="h-4 w-4" />}
                          size="sm"
                          variant="success"
                        >
                          Bewerk
                        </ActionButton>
                        <ActionButton
                          href={presenterUrl}
                          icon={<ArrowRight aria-hidden className="h-4 w-4" />}
                          size="sm"
                          variant="primary"
                        >
                          Regie
                        </ActionButton>
                        <ActionButton
                          external
                          href={`/screen/${presentation.code}`}
                          icon={<Monitor aria-hidden className="h-4 w-4" />}
                          size="sm"
                        >
                          Scherm
                        </ActionButton>
                        <ActionButton
                          icon={<Copy aria-hidden className="h-4 w-4" />}
                          onClick={() => copyValue(joinUrl, "Deelnemerslink")}
                          size="sm"
                        >
                          Link
                        </ActionButton>
                        <ActionButton
                          icon={<ExternalLink aria-hidden className="h-4 w-4" />}
                          onClick={() => copyValue(screenUrl, "Schermlink")}
                          size="sm"
                        >
                          URL
                        </ActionButton>
                        <ActionButton
                          icon={<Pencil aria-hidden className="h-4 w-4" />}
                          onClick={() => {
                            setEditingId(isEditing ? "" : presentation.id);
                            setTitleDraft(isEditing ? "" : presentation.title);
                          }}
                          size="sm"
                        >
                          {isEditing ? "Annuleer" : "Naam"}
                        </ActionButton>
                        <ActionButton
                          disabled={busy === `duplicate-${presentation.id}` || presentationLimitReached}
                          icon={<Copy aria-hidden className="h-4 w-4" />}
                          onClick={() => duplicatePresentation(presentation.id)}
                          size="sm"
                          variant="info"
                        >
                          Dupliceer
                        </ActionButton>
                        <DangerButton
                          disabled={busy === `delete-${presentation.id}`}
                          icon={<Trash2 aria-hidden className="h-4 w-4" />}
                          onClick={() => deletePresentation(presentation.id, presentation.title)}
                          size="sm"
                        >
                          Verwijder
                        </DangerButton>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </main>
  );
}
