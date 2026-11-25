"use client";

import Link from "next/link";
import { useState } from "react";
import { Tooltip } from "antd";
import { ArrowRight, Book, Mail, MapPin, Phone, Star } from "lucide-react";
import type { AttemptStatusCounts, AppUser } from "@/app/services/ezprep-api/users";
import { ChapterUi } from "@/app/lib/chapter-ui";
import { accessPresentation, badgeTierLabel, BADGE_TIER_TOOLTIP, tierStyle } from "./constants";
import {
  attendedTotal,
  avatarColor,
  formatJoinedDate,
  formatLocation,
  getInitials,
  maskEmail,
  maskPhoneNumber,
  normalizeTestActivity,
  quantityLabel,
} from "./helpers";

const CHIP =
  "inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold leading-none";

function ActivityRow({
  title,
  attendedNoun,
  counts,
}: {
  title: string;
  attendedNoun: { singular: string; plural: string };
  counts: AttemptStatusCounts;
}) {
  const attended = attendedTotal(counts);

  return (
    <div
      className="flex items-center gap-4"
      aria-label={`${quantityLabel(attended, attendedNoun.singular, attendedNoun.plural)}, ${quantityLabel(counts.finished, "finished", "finished")}, ${quantityLabel(counts.open, "in progress", "in progress")}`}
    >
      <span className="w-8 shrink-0 text-center text-[28px] font-bold leading-none tabular-nums text-console-ink">
        {attended}
      </span>
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-console-ink/80">
          {title}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[14px] font-semibold">
          <span className="text-console-green">
            <span className="tabular-nums">{counts.finished}</span> finished
          </span>
          <span aria-hidden="true" className="text-console-muted/50">
            ·
          </span>
          <Tooltip title="Started, in progress, or paused">
            <span className="text-[#9A5A12]">
              <span className="tabular-nums">{counts.open}</span> in progress
            </span>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

function UserAvatar({ user, paid }: { user: AppUser; paid: boolean }) {
  // Remember which URL failed so a new URL (e.g. after a list refresh) gets a fresh try.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showPhoto = Boolean(user.avatarUrl) && failedSrc !== user.avatarUrl;

  return (
    <span
      className={`inline-flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full border-2 bg-white p-[3px] ${
        paid ? "border-console-ink" : "border-console-line"
      }`}
    >
      {showPhoto ? (
        // Avatar hosts vary per learner, so they cannot be listed in next/image remote patterns.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt=""
          // Google profile photos (lh3.googleusercontent.com) refuse hotlinked requests that send a Referer.
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(user.avatarUrl ?? null)}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center rounded-full text-xl font-bold text-white"
          style={{ backgroundColor: avatarColor(user.id || user.name) }}
        >
          {getInitials(user.name)}
        </span>
      )}
    </span>
  );
}

export function UserCard({ user }: { user: AppUser }) {
  const access = accessPresentation(user.access);
  const paid = user.access?.paid === true;
  const tier = tierStyle(user.membershipTier);
  const hasTier = (user.membershipTier ?? "none") !== "none";
  const location = formatLocation(user.location);
  const activity = normalizeTestActivity(user.testActivity);
  const finishedTotal =
    activity.fullExam.finished +
    activity.topicWise.finished +
    activity.sprint.finished;
  const openTotal =
    activity.fullExam.open + activity.topicWise.open + activity.sprint.open;
  const email = maskEmail(user.email);
  const phoneNumber = maskPhoneNumber(user.phoneNumber);

  const card = (
    <article
      className={[
        "flex h-full flex-col rounded-[20px] border p-5 transition-[border-color,box-shadow] duration-200 sm:p-6",
        paid
          ? "border-[#CFDDB4] bg-[#F2F6E7]"
          : "border-console-line bg-white",
        user.id
          ? "group-hover:border-console-green/40 group-hover:shadow-[0_14px_30px_-18px_rgba(23,59,48,0.4)]"
          : "",
        user.isActive ? "" : "opacity-[0.78]",
      ].join(" ")}
      data-testid="user-card"
      data-user-id={user.id}
      data-access={paid ? "paid" : "free"}
    >
      <div className="flex items-start gap-4">
        <UserAvatar user={user} paid={paid} />
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="m-0 truncate text-xl font-bold leading-7 tracking-tight text-console-ink">
              {user.name || "Unnamed learner"}
            </h3>
            <span
              className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${
                user.isActive
                  ? "bg-[#E1EEE4] text-console-green"
                  : "bg-[#ECE9E2] text-console-muted"
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${
                  user.isActive ? "bg-console-green" : "bg-console-muted/60"
                }`}
              />
              {user.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="m-0 mt-1 flex min-w-0 items-center gap-2 text-[15px] text-console-muted">
            <Mail className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span className="truncate">{email || "No email"}</span>
          </p>
          {phoneNumber ? (
            <p className="m-0 mt-1 flex min-w-0 items-center gap-2 text-[15px] tracking-wide text-console-muted">
              <Phone className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span className="truncate">{phoneNumber}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {paid ? (
          <span className={`${CHIP} bg-console-lime text-console-ink`}>
            <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            {access.label}
          </span>
        ) : (
          <span className={`${CHIP} bg-[#EFEBE3] text-console-ink`}>{access.label}</span>
        )}
        <Tooltip title={BADGE_TIER_TOOLTIP}>
          <span
            className={`${CHIP} ${hasTier ? "" : "bg-[#EFEBE3] text-console-ink"}`}
            style={hasTier ? { color: tier.color, background: tier.background } : undefined}
          >
            {badgeTierLabel(user.membershipTier)}
          </span>
        </Tooltip>
        {user.targetExam?.name ? (
          <Tooltip title="Target exam">
            <span className={`${CHIP} border border-console-line bg-white text-console-ink`}>
              <Book className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              {user.targetExam.name}
            </span>
          </Tooltip>
        ) : null}
      </div>

      {location ? (
        <p className="m-0 mt-3 flex items-center gap-1.5 text-[13px] text-console-muted">
          <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          {location}
        </p>
      ) : null}

      <div
        className={`mt-4 flex flex-col gap-4 rounded-2xl px-5 py-4 ${
          paid ? "bg-white" : "bg-[#F5F2EC]"
        }`}
      >
        <ActivityRow
          title="Full mocks"
          attendedNoun={{
            singular: "full mock attended",
            plural: "full mocks attended",
          }}
          counts={activity.fullExam}
        />
        <ActivityRow
          title={ChapterUi.userSectionTitle}
          attendedNoun={ChapterUi.userNounAttempted}
          counts={activity.topicWise}
        />
        <ActivityRow
          title="Sprint tests"
          attendedNoun={{
            singular: "sprint test attended",
            plural: "sprint tests attended",
          }}
          counts={activity.sprint}
        />
      </div>

      {/* Pushes the footer to the bottom so cards in a row line up. */}
      <div aria-hidden="true" className="min-h-[20px] flex-1" />
      <div
        className={`border-t pt-4 ${paid ? "border-[#D9E4C4]" : "border-console-line"}`}
      >
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[14px] text-console-muted">
          <span>
            {quantityLabel(finishedTotal, "finished", "finished")}
            {" · "}
            {quantityLabel(openTotal, "in progress", "in progress")}
          </span>
          <span>Joined {formatJoinedDate(user.createdAt)}</span>
        </div>
        {user.id ? (
          <span className="mt-1.5 inline-flex items-center gap-1.5 text-[15px] font-semibold text-console-green">
            View details
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        ) : null}
      </div>
    </article>
  );

  if (!user.id) {
    return card;
  }

  return (
    <Link
      href={`/admin/users/${user.id}`}
      className="group block h-full rounded-[20px] text-inherit no-underline outline-none hover:text-inherit focus-visible:ring-2 focus-visible:ring-console-green focus-visible:ring-offset-2 focus-visible:ring-offset-console-canvas"
      data-testid="user-card-link"
    >
      {card}
    </Link>
  );
}
