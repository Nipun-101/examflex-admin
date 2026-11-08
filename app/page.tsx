import Link from "next/link";
import { AnswerSheetArt } from "@/app/components/examflex-marketing/AnswerSheetArt";
import {
  examflexDisplay,
  examflexSans,
} from "@/app/components/examflex-marketing/fonts";
import "@/app/components/examflex-marketing/examflex-marketing.css";

export default function Home() {
  return (
    <div
      className={`${examflexSans.variable} ${examflexDisplay.variable} ef-shell relative min-h-screen overflow-hidden`}
    >
      {/* Desktop art: right-side plane, text stays on a solid scrim */}
      <div
        className="pointer-events-none absolute inset-0 hidden lg:block"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_12%_18%,#f7fafc_0%,#eef3f8_42%,#d9e2ec_100%)]" />
        <div className="ef-drift absolute right-0 top-0 h-full w-[58%]">
          <AnswerSheetArt className="h-full w-full opacity-90 [mask-image:linear-gradient(90deg,transparent_0%,#000_18%,#000_100%)]" />
        </div>
        <div className="absolute inset-y-0 left-0 w-[62%] bg-gradient-to-r from-[#eef3f8] via-[#eef3f8]/90 to-transparent" />
      </div>

      <div className="relative flex min-h-screen flex-col lg:block">
        {/* Mobile / tablet art band — above copy, never behind it */}
        <div
          className="relative h-[38vh] min-h-[220px] max-h-[360px] overflow-hidden sm:h-[42vh] sm:max-h-[420px] lg:hidden"
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-[radial-gradient(100%_80%_at_70%_20%,#1c3148_0%,#0a1628_70%,#07101c_100%)]" />
          <div className="ef-drift absolute -bottom-[18%] left-1/2 h-[130%] w-[140%] -translate-x-1/2 opacity-70">
            <AnswerSheetArt tone="dark" className="h-full w-full" />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#eef3f8] to-transparent" />
          <div className="absolute left-5 top-5 h-1.5 w-12 bg-[var(--ef-mark)] sm:left-8" />
        </div>

        <main className="relative z-10 flex flex-1 flex-col justify-center bg-[var(--ef-paper)] px-5 pb-12 pt-8 sm:px-8 sm:pb-14 sm:pt-10 lg:min-h-screen lg:bg-transparent lg:px-10 lg:pb-24 lg:pt-24">
          <div className="mx-auto w-full max-w-6xl lg:mx-auto">
            <div className="max-w-xl">
              <div className="ef-rise mb-3 hidden h-1.5 w-14 bg-[var(--ef-mark)] lg:block" />

              <p className="ef-brand ef-rise ef-rise-delay-1 text-[clamp(3.25rem,12vw,6.75rem)] text-[var(--ef-ink)]">
                ExamFlex
              </p>

              <h1 className="ef-rise ef-rise-delay-2 mt-4 max-w-md text-[clamp(1.25rem,3.5vw,2rem)] font-semibold tracking-tight text-[var(--ef-ink-soft)] sm:mt-5">
                Staff console for the question bank and papers.
              </h1>

              <p className="ef-rise ef-rise-delay-3 mt-3 max-w-md text-base leading-7 text-[var(--ef-steel)] sm:mt-4 sm:text-lg">
                Manage catalog, uploads, and mock tests from one place — this is
                not the student app.
              </p>

              <div className="ef-rise ef-rise-delay-3 mt-8 sm:mt-9">
                <Link href="/login" className="ef-cta w-full sm:w-auto">
                  Sign in to admin
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
