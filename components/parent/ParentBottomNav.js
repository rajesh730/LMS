"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sprout, CalendarDays, MessageCircle, UserRound } from "lucide-react";
import { useParentApp } from "./ParentAppContext";
import styles from "./ParentDesign.module.css";

const TABS = [
  { href: "/parent", icon: Home, labelKey: "nav.home", exact: true },
  { href: "/parent/journey", icon: Sprout, labelKey: "nav.journey" },
  { href: "/parent/events", icon: CalendarDays, labelKey: "nav.events" },
  { href: "/parent/messages", icon: MessageCircle, labelKey: "nav.messages" },
  { href: "/parent/child", icon: UserRound, labelKey: "nav.child" },
];

function NavItems({ badges }) {
  const pathname = usePathname();
  const { t } = useParentApp();
  return <ul className={styles.navList}>{TABS.map((tab) => {
    const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
    const Icon = tab.icon;
    const count = badges[tab.href] || 0;
    return <li key={tab.href}>
      <Link href={tab.href} aria-current={active ? "page" : undefined} className={styles.navLink}>
        <span className={styles.navIcon}>
          <Icon aria-hidden="true" strokeWidth={active ? 2.4 : 1.8} />
          {count > 0 && <span className={styles.badge} aria-label={t("nav.newCount", { count })}>{count > 9 ? "9+" : count}</span>}
        </span>
        <span>{t(tab.labelKey)}</span>
      </Link>
    </li>;
  })}</ul>;
}

export default function ParentBottomNav({ badges = {} }) {
  const { t } = useParentApp();
  return <nav className={styles.bottomNav} aria-label={t("nav.parentNavigation")}><NavItems badges={badges} /></nav>;
}

export function ParentNavRail({ badges = {} }) {
  const { t } = useParentApp();
  return <nav className={styles.rail} aria-label={t("nav.parentNavigation")}>
    <div className={styles.railBrand}><Link href="/parent" className={styles.brand}><strong>Pravyo.</strong><span>{t("home.parentSpace")}</span></Link></div>
    <NavItems badges={badges} />
  </nav>;
}
export { TABS as PARENT_NAV_TABS };
