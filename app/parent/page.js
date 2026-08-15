"use client";

import {
  useParentApp,
  useParentResource,
} from "@/components/parent/ParentAppContext";
import StatusCard from "@/components/parent/StatusCard";
import ParentEmptyState from "@/components/parent/ParentEmptyState";
import ChildAvatar from "@/components/parent/ChildAvatar";
import JourneyPreview from "@/components/parent/JourneyPreview";
import { formatParentDate } from "@/lib/parentFormat";

/**
 * Parent Home (§3).
 *
 * Answers one question — "what is happening with my child today?" — as a
 * priority-ordered stack of cards. No charts, no tables, no dashboard widgets.
 *
 * The ordering is decided SERVER-side by lib/parentHome.js so that the rule in
 * §30 lives in one testable place; this screen renders whatever it is given, in
 * order.
 */
export default function ParentHomePage() {
  const { selectedChildId, t, refreshBadges } = useParentApp();
  const { loading, error, data, reload } = useParentResource("/api/parent/home");

  if (!selectedChildId) return null;

  if (loading) return <HomeSkeleton />;

  if (error || !data) {
    return (
      <ParentEmptyState
        emoji="⚠️"
        tone="neutral"
        title={t("common.somethingWrong")}
        action={
          <button
            type="button"
            onClick={reload}
            className="min-h-[48px] rounded-xl bg-[var(--brand-primary)] px-6 font-bold text-white"
          >
            {t("common.retry")}
          </button>
        }
      />
    );
  }

  const { child, cards } = data;

  return (
    <div className="space-y-4">
      <ChildHeader child={child} />

      {cards.length === 0 ? (
        <ParentEmptyState
          emoji="✓"
          title={t("home.allCaughtUp")}
          message={t("notices.empty")}
        />
      ) : (
        cards.map((card) => <HomeCard key={card.id} card={card} t={t} />)
      )}

      {/* Journey preview closes Home: after "what needs attention", the last
          thing a parent should see is their child's progress (§3). */}
      <JourneyPreview childName={child.name} />
    </div>
  );
}

/** The child header: photo, name, grade, school (§3). */
function ChildHeader({ child }) {
  const { simpleMode } = useParentApp();

  return (
    <section className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-surface-end)] p-4 text-white shadow-sm">
      <ChildAvatar
        name={child.name}
        photoUrl={child.photoUrl}
        size={simpleMode ? 68 : 60}
      />
      <div className="min-w-0">
        <h1
          className={[
            "truncate font-bold",
            simpleMode ? "text-2xl" : "text-xl",
          ].join(" ")}
        >
          {child.name}
        </h1>
        <p className="truncate text-sm text-white/85">
          {child.grade}
          {child.grade && child.school?.name ? " · " : ""}
          {child.school?.name}
        </p>
      </div>
    </section>
  );
}

/**
 * Render one priority card. The card's `kind` chooses the eyebrow wording; the
 * status descriptor chooses the colour, icon and shape.
 */
function HomeCard({ card, t }) {
  const eyebrowByKind = {
    ACTION_REQUIRED: t("status.actionRequired"),
    CONSENT_REQUIRED: t("status.actionRequired"),
    LIVE_EVENT: t("events.liveNow"),
    UNREAD_MESSAGE: t("home.newMessage"),
    UNREAD_NOTICE: t("status.needsAttention"),
    REGISTRATION_OPEN: t("events.openForRegistration"),
    ACHIEVEMENT: t("status.newAchievement"),
    NEW_WRITING: t("home.newWriting"),
  };

  // A few card kinds carry a translated body built from server-supplied params
  // (e.g. "{name} is currently participating").
  const body = card.bodyKey ? t(card.bodyKey, card.bodyParams) : card.body;

  const meta = card.deadline
    ? t("notices.deadline", { date: formatParentDate(card.deadline) })
    : card.occurredAt
      ? formatParentDate(card.occurredAt)
      : "";

  return (
    <StatusCard
      status={card.status}
      emoji={card.emoji}
      eyebrow={eyebrowByKind[card.kind]}
      title={
        card.titleKey
          ? `${t(card.titleKey, card.titleParams)} ${card.title}`
          : card.title
      }
      body={body}
      meta={meta}
      href={card.href}
      cta={card.cta ? t(card.cta) : null}
      live={Boolean(card.live)}
      // Only writing offers Listen on Home; notices get it on their detail page
      // where the full text is available (§7).
      listenText={card.listenable ? card.title : ""}
    />
  );
}

/** Skeleton rather than a spinner: the layout does not jump when data lands. */
function HomeSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-32 animate-pulse rounded-2xl bg-slate-100"
        />
      ))}
    </div>
  );
}
