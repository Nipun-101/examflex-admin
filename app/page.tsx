import Link from "next/link";
import { AnswerSheetArt } from "@/app/components/examflex-marketing/AnswerSheetArt";
import { MobileHeroArt } from "@/app/components/examflex-marketing/MobileHeroArt";
import {
  examflexDisplay,
  examflexSans,
} from "@/app/components/examflex-marketing/fonts";
import "@/app/components/examflex-marketing/examflex-marketing.css";

export default function Home() {
  return (
    <div
      className={`${examflexSans.variable} ${examflexDisplay.variable} ef-shell relative overflow-hidden`}
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

      <div className="relative flex min-h-[100dvh] flex-col lg:min-h-screen lg:block">
        {/* Mobile / tablet: complete paper card (not a cropped desktop sheet) */}
        <div className="shrink-0 px-4 pt-4 sm:px-6 sm:pt-5 lg:hidden" aria-hidden="true">
          <div className="overflow-hidden rounded-xl bg-[radial-gradient(90%_120%_at_50%_20%,#243b53_0%,#0a1628_55%,#07101c_100%)] px-3 py-4 sm:px-5 sm:py-5">
            <MobileHeroArt className="mx-auto h-auto w-full max-w-[21rem] sm:max-w-md" />
          </div>
        </div>

        <main className="relative z-10 flex flex-1 flex-col bg-[var(--ef-paper)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-8 sm:pb-10 sm:pt-7 lg:min-h-screen lg:justify-center lg:bg-transparent lg:px-10 lg:pb-24 lg:pt-24">
          <div className="mx-auto w-full max-w-6xl">
            <div className="max-w-xl">
              <div className="ef-rise mb-3 hidden h-1.5 w-14 bg-[var(--ef-mark)] lg:block" />

              <p className="ef-brand ef-rise ef-rise-delay-1 text-[clamp(2.6rem,10.5vw,6.75rem)] text-[var(--ef-ink)]">
                ExamFlex
              </p>

              <h1 className="ef-rise ef-rise-delay-2 mt-3 max-w-md text-[clamp(1.1rem,3.3vw,2rem)] font-semibold tracking-tight text-[var(--ef-ink-soft)] sm:mt-5">
                Staff console for the question bank and papers.
              </h1>

              <p className="ef-rise ef-rise-delay-3 mt-2.5 max-w-md text-[0.95rem] leading-6 text-[var(--ef-steel)] sm:mt-4 sm:text-lg sm:leading-7">
                Manage catalog, uploads, and mock tests from one place — this is
                not the student app.
              </p>

              <div className="ef-rise ef-rise-delay-3 mt-6 sm:mt-9">
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
