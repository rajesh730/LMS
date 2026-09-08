"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useParentApp } from "./ParentAppContext";
import ChildAvatar from "./ChildAvatar";
import styles from "./ParentDesign.module.css";

export default function ChildSwitcher() {
  const { childList, selectedChild, selectChild, t } = useParentApp();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const pointer = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const keyboard = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("pointerdown", pointer);
      document.removeEventListener("keydown", keyboard);
    };
  }, [open]);

  if (!selectedChild || childList.length <= 1) return null;
  return <div ref={containerRef} className={styles.switcher} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={triggerRef} type="button" className={styles.switchTrigger} aria-expanded={open}
      aria-controls={panelId} aria-label={t("child.switch")} onClick={() => setOpen(!open)}>
      <ChildAvatar name={selectedChild.name} photoUrl={selectedChild.photoUrl} size={36} />
      <span className={styles.switchSummary}><strong>{selectedChild.name}</strong><small>{selectedChild.school?.name}</small></span>
      <span className={styles.switchHint}>{t("home.switchChild")}<ChevronDown size={16} aria-hidden="true" /></span>
    </button>
    {open && <div id={panelId} role="group" aria-label={t("child.selectChild")} className={styles.switchMenu}>
      {childList.map((child) => <button key={child.studentId} type="button" className={styles.switchOption}
        aria-pressed={child.studentId === selectedChild.studentId} onClick={() => {
          selectChild(child.studentId); setOpen(false); triggerRef.current?.focus();
        }}>
        <ChildAvatar name={child.name} photoUrl={child.photoUrl} size={36} />
        <span className={styles.switchSummary}><strong>{child.name}</strong><small>{[child.grade, child.school?.name].filter(Boolean).join(" · ")}</small></span>
        {child.studentId === selectedChild.studentId && <Check size={18} aria-hidden="true" />}
      </button>)}
    </div>}
  </div>;
}
