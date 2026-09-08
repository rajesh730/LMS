"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardList, MessageCircle, Trophy, BookOpen } from "lucide-react";
import { useParentApp, useParentResource } from "@/components/parent/ParentAppContext";
import StatusCard from "@/components/parent/StatusCard";
import ParentEmptyState from "@/components/parent/ParentEmptyState";
import ChildAvatar from "@/components/parent/ChildAvatar";
import JourneyPreview from "@/components/parent/JourneyPreview";
import { formatParentDate } from "@/lib/parentFormat";
import styles from "@/components/parent/ParentDesign.module.css";

export default function ParentHomePage() {
  const { selectedChildId, t, preferences } = useParentApp();
  const { loading, error, data, reload } = useParentResource("/api/parent/home");
  if (!selectedChildId) return null;
  if (loading) return <div className={styles.home} aria-busy="true" aria-label={t("common.loading")}>
    {[0, 1, 2].map((item) => <div key={item} className={styles.skeleton} />)}
  </div>;
  if (error || !data) return <ParentEmptyState emoji="!" tone="neutral" title={t("common.somethingWrong")}
    action={<button type="button" onClick={reload} className={styles.action}>{t("common.retry")}</button>} />;

  const { child, cards } = data;
  return <div className={styles.home}>
    <div className={styles.intro}><h1>{t("home.overview")}</h1><p>{t("home.overviewHelp")}</p></div>
    <section className={styles.identity} aria-label={t("nav.child")}>
      <ChildAvatar name={child.name} photoUrl={child.photoUrl} size={56} />
      <div className={styles.identityCopy}>
        <span className={styles.identityLabel}>{t("home.schoolLife")}</span>
        <h2>{child.name}</h2>
        <p>{child.school?.name}</p>
        {child.grade && <span className={styles.identityGrade}>{child.grade}</span>}
      </div>
      <Link href="/parent/child" className={styles.identityArrow} aria-label={t("home.viewChild")}><ArrowRight size={20} aria-hidden="true" /></Link>
    </section>
    <nav className={styles.quickLinks} aria-label={t("home.quickLinks")}>
      {[
        ["/parent/notices", ClipboardList, "notices.title"],
        ["/parent/events", CalendarDays, "nav.events"],
        ["/parent/messages", MessageCircle, "nav.messages"],
      ].map(([href, Icon, label]) => <Link href={href} key={href} className={styles.quickLink}><Icon aria-hidden="true" /><span>{t(label)}</span></Link>)}
    </nav>
    <section aria-labelledby="parent-updates">
      <div className={styles.sectionHeading}><h2 id="parent-updates">{t("home.latestUpdates")}</h2></div>
      {cards.length === 0 ? <ParentEmptyState emoji="✓" title={t("home.allCaughtUp")} message={t("home.caughtUpHelp")} /> :
        <div className={styles.cards}>{cards.map((card) => <HomeCard key={card.id} card={card} t={t} calendar={preferences.calendarPreference} />)}</div>}
    </section>
    <JourneyPreview childName={child.name} />
  </div>;
}

function HomeCard({ card, t, calendar }) {
  const eyebrow = {
    ACTION_REQUIRED: "status.actionRequired", CONSENT_REQUIRED: "status.actionRequired",
    LIVE_EVENT: "events.liveNow", UNREAD_MESSAGE: "home.newMessage", UNREAD_NOTICE: "home.newNotice",
    REGISTRATION_OPEN: "events.openForRegistration", ACHIEVEMENT: "status.newAchievement", NEW_WRITING: "home.newWriting",
  };
  const icons = { ACTION_REQUIRED: ClipboardList, CONSENT_REQUIRED: ClipboardList, UNREAD_NOTICE: ClipboardList,
    LIVE_EVENT: CalendarDays, REGISTRATION_OPEN: CalendarDays, UNREAD_MESSAGE: MessageCircle,
    ACHIEVEMENT: Trophy, NEW_WRITING: BookOpen };
  const dateOptions = { calendar, relative: false };
  const meta = card.deadline ? t("notices.deadline", { date: formatParentDate(card.deadline, dateOptions) }) :
    card.occurredAt ? formatParentDate(card.occurredAt, dateOptions) : "";
  const cta = card.kind === "UNREAD_NOTICE" && card.cta ? t("home.readNotice") : card.cta ? t(card.cta) : null;
  return <StatusCard status={card.status} icon={icons[card.kind]} emoji={icons[card.kind] ? undefined : card.emoji}
    eyebrow={eyebrow[card.kind] ? t(eyebrow[card.kind]) : undefined}
    title={card.titleKey ? `${t(card.titleKey, card.titleParams)} ${card.title}` : card.title}
    body={card.bodyKey ? t(card.bodyKey, card.bodyParams) : card.body} meta={meta} href={card.href} cta={cta}
    live={Boolean(card.live)} listenText={card.listenable ? card.title : ""} />;
}
