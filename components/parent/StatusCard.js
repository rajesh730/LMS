"use client";

import Link from "next/link";
import { ArrowRight, CircleAlert, Clock3, CircleCheck, Info } from "lucide-react";
import { getStatus } from "@/lib/parentStatus";
import { useParentApp } from "./ParentAppContext";
import ListenButton from "./ListenButton";
import styles from "./ParentDesign.module.css";

const STATUS_ICONS = { ACTION_REQUIRED: CircleAlert, NEEDS_ATTENTION: Clock3, COMPLETE: CircleCheck, INFO: Info };

export default function StatusCard({
  status = "INFO", emoji, icon: ContentIcon, eyebrow, title, body, meta, href, cta,
  onAction, listenText = "", live = false, children,
}) {
  const { t, simpleMode } = useParentApp();
  const descriptor = getStatus(status);
  const Icon = STATUS_ICONS[descriptor.key] || Info;
  const actionClass = [styles.action, simpleMode ? styles.fullAction : ""].join(" ");
  const actionContent = <>{cta}<ArrowRight aria-hidden="true" /></>;
  return <article className={styles.card} data-status={descriptor.key}>
    <div className={styles.statusRow}>
      <span className={styles.statusLabel}><Icon aria-hidden="true" />{eyebrow || t(descriptor.labelKey)}</span>
      {live && <span className={styles.live}>{t("status.live")}</span>}
    </div>
    <div className={styles.cardContent}>
      {(ContentIcon || emoji) && <span className={styles.cardIcon} aria-hidden="true">{ContentIcon ? <ContentIcon size={20} /> : emoji}</span>}
      <div className={styles.cardCopy}>
        <h3>{title}</h3>
        {body && !simpleMode && <p className={styles.body}>{body}</p>}
        {meta && <p className={styles.meta}>{meta}</p>}
        {children}
      </div>
    </div>
    {(cta || listenText) && <div className={styles.actions}>
      {cta && (href ? <Link href={href} className={actionClass}>{actionContent}</Link> :
        <button type="button" onClick={onAction} className={actionClass}>{actionContent}</button>)}
      {listenText && <ListenButton text={listenText} fullWidth={simpleMode} />}
    </div>}
  </article>;
}
