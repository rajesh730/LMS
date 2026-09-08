"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Settings, ClipboardList } from "lucide-react";
import { useParentApp } from "./ParentAppContext";
import ChildSwitcher from "./ChildSwitcher";
import ParentBottomNav, { ParentNavRail } from "./ParentBottomNav";
import ParentNotificationBell from "./ParentNotificationBell";
import { ParentNotificationProvider } from "./ParentNotificationContext";
import styles from "./ParentDesign.module.css";

export default function ParentAppShell({ children }) {
  const { loading, error, needsChildLink, selectedChildId, childList, selectedChild, simpleMode, t, reload, badges } = useParentApp();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && needsChildLink && pathname !== "/parent/link") router.replace("/parent/link");
  }, [loading, needsChildLink, pathname, router]);

  if (loading || error) return <div className={styles.shell}>
    <main className={styles.main}><div className={styles.content} role="status">
      <p>{t(error ? "common.somethingWrong" : "common.loading")}</p>
      {error ? <button type="button" className={styles.action} onClick={reload}>{t("common.retry")}</button> :
        <div className={styles.skeleton} aria-hidden="true" />}
    </div></main>
  </div>;

  return <ParentNotificationProvider><div className={styles.shell} data-simple={simpleMode}>
    <a href="#parent-content" className={styles.skip}>{t("nav.skipContent")}</a>
    <div className={styles.frame}>
      <ParentNavRail badges={badges} />
      <div className={styles.workspace}>
        <header className={styles.header}>
          <div className={styles.toolbar}>
            <Link href="/parent" className={styles.brand}>
              <strong>Pravyo.</strong><span>{t("home.parentSpace")}</span>
            </Link>
            <div className={styles.tools}>
              {[
                { href: "/parent/notices", label: t("notices.title"), icon: ClipboardList, count: badges["/parent/notices"] },
              ].map(({ href, label, icon: Icon, count }) => <Link key={href} href={href} aria-label={label} title={label}
                aria-current={pathname === href ? "page" : undefined} className={styles.tool}>
                <Icon aria-hidden="true" strokeWidth={1.8} />
                {count > 0 && <span className={styles.badge} aria-label={t("nav.newCount", { count })}>{count > 9 ? "9+" : count}</span>}
              </Link>)}
              <ParentNotificationBell />
              <Link
                href="/parent/settings"
                aria-label={t("settings.title")}
                title={t("settings.title")}
                aria-current={pathname === "/parent/settings" ? "page" : undefined}
                className={styles.tool}
              >
                <Settings aria-hidden="true" strokeWidth={1.8} />
              </Link>
            </div>
          </div>
          <ChildSwitcher />
          {childList.length === 1 && pathname !== "/parent" && selectedChild && <div className={styles.singleContext}>
            <span>{selectedChild.name}</span><small>{selectedChild.school?.name}</small>
          </div>}
        </header>
        <main id="parent-content" tabIndex={-1} className={styles.main}>
          {/* Remount child-specific pages immediately, so old data/drafts never
              remain under a newly selected child's name while requests load. */}
          <div key={selectedChildId} className={styles.content}>{children}</div>
        </main>
      </div>
    </div>
    <ParentBottomNav badges={badges} />
  </div></ParentNotificationProvider>;
}
