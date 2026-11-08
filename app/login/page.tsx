"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnswerSheetArt } from "@/app/components/examflex-marketing/AnswerSheetArt";
import {
  examflexDisplay,
  examflexSans,
} from "@/app/components/examflex-marketing/fonts";
import "@/app/components/examflex-marketing/examflex-marketing.css";

function safeNextPath(): string {
  if (typeof window === "undefined") {
    return "/admin";
  }
  const raw = new URLSearchParams(window.location.search).get("next");
  if (
    !raw ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.startsWith("/login")
  ) {
    return "/admin";
  }
  return raw;
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Invalid username or password"
        );
        return;
      }

      router.replace(safeNextPath());
      router.refresh();
    } catch {
      setError("Unable to sign in. Is the API running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`${examflexSans.variable} ${examflexDisplay.variable} ef-shell min-h-screen lg:grid lg:grid-cols-2`}
    >
      <aside className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-[#07101c]" />
        <div className="ef-drift absolute -right-[18%] top-[8%] h-[110%] w-[120%] opacity-45">
          <AnswerSheetArt tone="dark" className="h-full w-full" />
        </div>
        {/* Heavy scrim so brand copy never fights the sheet */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#07101c] via-[#07101c]/92 to-[#07101c]/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07101c] via-transparent to-[#07101c]/55" />

        <div className="relative flex h-full min-h-screen flex-col justify-between p-10 xl:p-14">
          <Link
            href="/"
            className="ef-brand text-4xl text-[var(--ef-paper-bright)] transition-opacity hover:opacity-80 xl:text-5xl"
          >
            ExamFlex
          </Link>
          <div className="max-w-md pb-4">
            <p className="ef-brand text-[clamp(2.2rem,3.4vw,3.25rem)] text-[var(--ef-paper-bright)]">
              Run the catalog with clarity.
            </p>
            <p className="mt-4 max-w-sm text-base leading-7 text-[var(--ef-mist)]">
              Questions, papers, and commerce tools for ExamFlex staff.
            </p>
            <div className="mt-8 h-1.5 w-14 bg-[var(--ef-mark)]" />
          </div>
        </div>
      </aside>

      <main className="relative flex min-h-screen flex-col bg-[var(--ef-paper)] px-5 py-8 sm:px-8 sm:py-10 lg:justify-center lg:px-12 lg:py-12 xl:px-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_100%_0%,rgba(240,180,41,0.12),transparent_55%)]" />

        {/* Mobile / tablet: dark art header, form on solid paper below */}
        <div className="relative mb-7 overflow-hidden rounded-md lg:hidden">
          <div className="relative h-28 sm:h-36">
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <div className="absolute inset-0 bg-[radial-gradient(100%_90%_at_80%_10%,#1c3148_0%,#0a1628_75%)]" />
              <div className="absolute -right-8 -top-10 h-[160%] w-[90%] opacity-45">
                <AnswerSheetArt tone="dark" className="h-full w-full" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628] via-[#0a1628]/80 to-[#0a1628]/45" />
            </div>
            <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
              <div className="h-1.5 w-12 bg-[var(--ef-mark)]" aria-hidden="true" />
              <Link
                href="/"
                className="ef-brand text-3xl text-[var(--ef-paper-bright)] transition-opacity hover:opacity-80 sm:text-4xl"
              >
                ExamFlex
              </Link>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:mx-0 xl:mx-auto">
          <div className="ef-rise ef-rise-delay-1 mb-6 sm:mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--ef-ink)] sm:text-3xl">
              Admin sign in
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--ef-steel)] sm:text-base">
              Use your admin username and password. Student OTP login is
              separate.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="ef-rise ef-rise-delay-2 space-y-3.5 sm:space-y-4"
          >
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-[var(--ef-ink-soft)]">
                Username
              </span>
              <input
                className="ef-field"
                type="text"
                autoComplete="username"
                placeholder="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-[var(--ef-ink-soft)]">
                Password
              </span>
              <input
                className="ef-field"
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error ? (
              <p className="text-sm font-medium text-red-700" role="alert">
                {error}
              </p>
            ) : null}

            <button type="submit" className="ef-submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
