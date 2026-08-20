"use client";

import { signOut } from "next-auth/react";
import { useParentApp } from "@/components/parent/ParentAppContext";
import { LOCALE_LABELS, SUPPORTED_LOCALES } from "@/lib/parentI18n";
import ParentPushNotifications from "@/components/parent/ParentPushNotifications";

/**
 * Settings — accessibility, language, data (§8, §22, §23).
 *
 * Simple Parent Mode and the language switch are the two most important
 * controls in the whole app for the target audience, so they sit at the top,
 * above the fold, as large toggles rather than buried in a preferences list.
 */
export default function ParentSettingsPage() {
  const { t, parent, preferences, updatePreferences, childList } =
    useParentApp();

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[var(--brand-ink)]">
        {t("settings.title")}
      </h1>

      {/* --- Language: highly visible, per §8 ----------------------------- */}
      <section className="rounded-2xl border border-[var(--brand-border)] bg-white p-4">
        <h2 className="text-sm font-bold text-[var(--brand-ink)]">
          {t("settings.language")}
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
          {SUPPORTED_LOCALES.map((locale) => {
            const active = preferences.language === locale;
            return (
              <button
                key={locale}
                type="button"
                onClick={() => updatePreferences({ language: locale })}
                aria-pressed={active}
                className={[
                  "min-h-[56px] rounded-xl border-2 text-base font-bold transition-colors",
                  active
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                    : "border-[var(--brand-border)] bg-white text-[var(--brand-ink)]",
                ].join(" ")}
              >
                {LOCALE_LABELS[locale]}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--brand-border)] bg-white p-4">
        <ToggleRow
          emoji="🔤"
          title={t("settings.simpleMode")}
          description={t("settings.simpleModeHelp")}
          checked={preferences.simpleMode}
          onChange={(value) => updatePreferences({ simpleMode: value })}
        />
        <ToggleRow
          emoji="📶"
          title={t("settings.dataSaver")}
          description={t("settings.dataSaverHelp")}
          checked={preferences.dataSaver}
          onChange={(value) => updatePreferences({ dataSaver: value })}
        />
      </section>

      {/* --- Notification channels ---------------------------------------- */}
      <section className="rounded-2xl border border-[var(--brand-border)] bg-white p-4">
        <h2 className="mb-3 text-sm font-bold text-[var(--brand-ink)]">
          {t("settings.notifications")}
        </h2>
        <div className="space-y-3">
          <ParentPushNotifications />
          <ToggleRow
            emoji="🔔"
            title="In the app"
            checked={preferences.notifications?.inApp !== false}
            onChange={(value) =>
              updatePreferences({
                notifications: { ...preferences.notifications, inApp: value },
              })
            }
          />
          <ToggleRow
            emoji="✉️"
            title="Email"
            checked={preferences.notifications?.email !== false}
            onChange={(value) =>
              updatePreferences({
                notifications: { ...preferences.notifications, email: value },
              })
            }
          />
          {/* SMS is recorded but not yet delivered — see §21. Labelled so a
              guardian is not misled into relying on it. */}
          <ToggleRow
            emoji="💬"
            title="SMS"
            description="Coming soon"
            checked={Boolean(preferences.notifications?.sms)}
            onChange={(value) =>
              updatePreferences({
                notifications: { ...preferences.notifications, sms: value },
              })
            }
          />
        </div>
      </section>

      {/* --- Calendar ------------------------------------------------------ */}
      <section className="rounded-2xl border border-[var(--brand-border)] bg-white p-4">
        <h2 className="text-sm font-bold text-[var(--brand-ink)]">Calendar</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
          {["BS", "AD"].map((calendar) => {
            const active = preferences.calendarPreference === calendar;
            return (
              <button
                key={calendar}
                type="button"
                onClick={() =>
                  updatePreferences({ calendarPreference: calendar })
                }
                aria-pressed={active}
                className={[
                  "min-h-[52px] rounded-xl border-2 font-bold transition-colors",
                  active
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                    : "border-[var(--brand-border)] bg-white text-[var(--brand-ink)]",
                ].join(" ")}
              >
                {calendar === "BS" ? "बिक्रम सम्वत् (BS)" : "AD"}
              </button>
            );
          })}
        </div>
      </section>

      {/* --- Account ------------------------------------------------------- */}
      <section className="rounded-2xl border border-[var(--brand-border)] bg-white p-4">
        <p className="break-words font-bold text-[var(--brand-ink)]">{parent?.name}</p>
        <p className="break-all text-sm text-[var(--brand-muted)]">
          {parent?.email || parent?.phone}
        </p>
        <p className="mt-1 text-xs text-[var(--brand-muted)]">
          {childList.length} {childList.length === 1 ? "child" : "children"}{" "}
          connected
        </p>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/parent/login" })}
          className="mt-4 min-h-[52px] w-full rounded-xl border-2 border-red-300 font-bold text-red-700"
        >
          {t("settings.signOut")}
        </button>
      </section>
    </div>
  );
}

/** A large, obviously-tappable switch row. */
function ToggleRow({ emoji, title, description, checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-[56px] w-full items-center gap-3 text-left"
    >
      {emoji ? (
        <span aria-hidden="true" className="text-xl">
          {emoji}
        </span>
      ) : null}

      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-[var(--brand-ink)]">
          {title}
        </span>
        {description ? (
          <span className="block text-xs text-[var(--brand-muted)]">
            {description}
          </span>
        ) : null}
      </span>

      <span
        aria-hidden="true"
        className={[
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-[var(--brand-primary)]" : "bg-slate-300",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 h-5 w-5 rounded-full bg-white transition-all",
            checked ? "left-6" : "left-1",
          ].join(" ")}
        />
      </span>
    </button>
  );
}
