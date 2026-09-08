"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sprout, ArrowRight } from "lucide-react";
import { useParentApp, useParentFetch } from "./ParentAppContext";
import { formatParentDate } from "@/lib/parentFormat";
import styles from "./ParentDesign.module.css";

export default function JourneyPreview({ childName }) {
  const { t, selectedChildId, preferences } = useParentApp();
  const parentFetch = useParentFetch();
  const [result, setResult] = useState(null);

  useEffect(() => {
    let active = true;
    if (!selectedChildId) return;
    (async () => {
      try {
        const data = await parentFetch("/api/parent/journey?limit=3");
        if (active) setResult({ childId: selectedChildId, entries: (data.groups || []).flatMap((group) => group.entries).slice(0, 3) });
      } catch {
        if (active) setResult({ childId: selectedChildId, entries: [] });
      }
    })();
    return () => { active = false; };
  }, [parentFetch, selectedChildId]);

  if (result?.childId !== selectedChildId || !result?.entries.length) return null;
  return <section className={styles.journey}>
    <div className={styles.journeyHeading}><Sprout aria-hidden="true" /><div>
      <h2>{t("home.journeyTitle", { name: childName })}</h2><p>{t("home.journeyHelp")}</p>
    </div></div>
    <ol className={styles.timeline}>{result.entries.map((entry) => <li key={entry.id}>
      <span className={styles.timelineIcon} aria-hidden="true">{entry.emoji}</span>
      <div><p>{entry.title}</p><small>{formatParentDate(entry.date, { calendar: preferences.calendarPreference, relative: false })}
        {entry.school?.name ? ` · ${entry.school.name}` : ""}</small></div>
    </li>)}</ol>
    <div className={styles.journeyLink}><Link href="/parent/journey">{t("home.viewFullJourney")}<ArrowRight size={18} aria-hidden="true" /></Link></div>
  </section>;
}
