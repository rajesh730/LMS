"use client";

import { useCallback, useEffect, useState } from "react";
import { FaIdCard, FaRedo, FaBan, FaUnlock } from "react-icons/fa";
import ParentCardDialog from "./ParentCardDialog";

/**
 * Parent Access management for one guardian (§4, §58, §59).
 *
 * Shows the three states §59 insists on keeping separate, because conflating
 * them is how a school ends up revoking the wrong thing:
 *
 *   - **Access**       — can this guardian sign in at all?
 *   - **Relationship** — is this guardian still linked to THIS child?
 *   - **Reachability** — which channels can actually deliver to them?
 *
 * "Revoke this child" and "Revoke all access" are deliberately separate
 * actions with different wording, because §44 turns on the distinction: a
 * father who loses access to Child A must keep Child B.
 */

const ACCESS_STATES = {
  NOT_CREATED: { emoji: "⚪", label: "No card yet", tone: "bg-slate-100 text-slate-700" },
  PENDING_ACTIVATION: { emoji: "🟡", label: "Card issued", tone: "bg-amber-100 text-amber-900" },
  ACTIVATED: { emoji: "🟢", label: "Activated", tone: "bg-emerald-100 text-emerald-800" },
  LOCKED: { emoji: "🔒", label: "Locked", tone: "bg-red-100 text-red-800" },
  REVOKED: { emoji: "⛔", label: "Revoked", tone: "bg-slate-200 text-slate-700" },
};

export default function ParentAccessPanel({
  linkId,
  guardianName,
  studentName,
  onChanged,
}) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [busy, setBusy] = useState("");
  const [card, setCard] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/school/guardians/access?linkId=${encodeURIComponent(linkId)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not load access");
      setState({ loading: false, data: json.data, error: "" });
    } catch (err) {
      setState({ loading: false, data: null, error: err.message });
    }
  }, [linkId]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Issue a card and SHOW it.
   *
   * `INITIAL` is idempotent — it allocates a Parent ID only if the guardian has
   * none — so "Show card" is safe to press at any time. `REISSUE` rotates the
   * ID and is the one action here that can lock a guardian out, which is why it
   * is confirmed first and worded as "the old card stops working".
   */
  const issue = async (purpose) => {
    if (
      purpose === "REISSUE" &&
      !window.confirm(
        `Give ${guardianName} a new Parent ID?\n\n` +
          "Their current card will stop working immediately and they will be " +
          "signed out. Only do this if the card was lost or shared with the " +
          "wrong person."
      )
    ) {
      return;
    }

    setBusy(purpose);
    try {
      const res = await fetch("/api/school/guardians/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId, purpose }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not create access");

      setCard(json.data);
    } catch (err) {
      setState((prev) => ({ ...prev, error: err.message }));
    } finally {
      setBusy("");
    }
  };

  const act = async (action, extra = {}) => {
    setBusy(action);
    try {
      const res = await fetch("/api/school/guardians/access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId, action, ...extra }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not update access");
      await load();
      onChanged?.();
    } catch (err) {
      setState((prev) => ({ ...prev, error: err.message }));
    } finally {
      setBusy("");
    }
  };

  if (state.loading) {
    return <div className="h-32 animate-pulse rounded-xl bg-slate-100" />;
  }

  if (!state.data) {
    return (
      <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
        {state.error}
      </p>
    );
  }

  const data = state.data;
  const accessState = ACCESS_STATES[data.accessState] || ACCESS_STATES.NOT_CREATED;
  const hasCard = data.accessState !== "NOT_CREATED";

  return (
    <section className="rounded-xl border border-[var(--brand-border)] bg-slate-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-[var(--brand-muted)]">
          Parent Access
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${accessState.tone}`}
        >
          {accessState.emoji} {accessState.label}
        </span>
        {data.parentIdentifier ? (
          <code className="rounded bg-white px-2 py-0.5 font-mono text-[11px] text-[var(--brand-ink)]">
            {data.parentIdentifier}
          </code>
        ) : null}
      </div>

      {/* Reachability — never says "unreachable" just because there is no
          email or phone (§36). */}
      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
        <Chip
          on={data.accessState === "ACTIVATED"}
          onLabel="🟢 Pravyo"
          offLabel="⚪ Not in app yet"
        />
        <Chip
          on={Boolean(data.contact.email)}
          onLabel="🔵 Email"
          offLabel="⚪ No email"
        />
        <Chip
          on={Boolean(data.contact.phone)}
          onLabel="🟡 Phone"
          offLabel="⚪ No phone"
        />
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-600">
          ⚪ SMS not configured
        </span>
      </div>

      {data.accessState === "PENDING_ACTIVATION" ? (
        <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
          Card issued. Waiting for the guardian to sign in for the first time.
        </p>
      ) : null}

      {state.error ? (
        <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">
          {state.error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {!hasCard ? (
          <Action
            icon={FaIdCard}
            label="Create access card"
            busy={busy === "INITIAL"}
            onClick={() => issue("INITIAL")}
            primary
          />
        ) : (
          <>
            {/* Safe and repeatable — the card can be shown as often as the
                office needs it. */}
            <Action
              icon={FaIdCard}
              label="Show card"
              hint="Print, share, or scan from the screen"
              busy={busy === "INITIAL"}
              onClick={() => issue("INITIAL")}
              primary
            />
            <Action
              icon={FaRedo}
              label="New card"
              hint="Lost card — the old one stops working"
              danger
              busy={busy === "REISSUE"}
              onClick={() => issue("REISSUE")}
            />
          </>
        )}

        {data.accessState === "REVOKED" ? (
          <Action
            icon={FaUnlock}
            label="Restore access"
            busy={busy === "RESTORE_ACCESS"}
            onClick={() => act("RESTORE_ACCESS")}
          />
        ) : hasCard ? (
          <Action
            icon={FaBan}
            label="Revoke all access"
            hint="Signs them out of every child"
            danger
            busy={busy === "REVOKE_ACCESS"}
            onClick={() => act("REVOKE_ACCESS")}
          />
        ) : null}
      </div>

      {card ? (
        <ParentCardDialog
          parentIdentifier={card.parentIdentifier}
          linkId={linkId}
          rotated={Boolean(card.rotated)}
          schoolName={card.schoolName || "Your school"}
          studentName={studentName || "your child"}
          guardianName={guardianName}
          onClose={async () => {
            setCard(null);
            await load();
            onChanged?.();
          }}
        />
      ) : null}

      <ContactEditor
        email={data.contact.email}
        phone={data.contact.phone}
        onSave={(contact) => act("SET_CONTACT", contact)}
        busy={busy === "SET_CONTACT"}
      />
    </section>
  );
}

function Chip({ on, onLabel, offLabel }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 ${
        on ? "bg-white text-[var(--brand-ink)]" : "bg-slate-200 text-slate-600"
      }`}
    >
      {on ? onLabel : offLabel}
    </span>
  );
}

function Action({ icon: Icon, label, hint, onClick, busy, primary, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={hint}
      className={[
        "flex min-h-[40px] items-center gap-2 rounded-lg px-3 text-xs font-bold transition-colors disabled:opacity-50",
        primary
          ? "bg-[var(--brand-primary)] text-white"
          : danger
            ? "border border-red-300 bg-white text-red-700"
            : "border border-[var(--brand-border)] bg-white text-[var(--brand-ink)]",
      ].join(" ")}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {busy ? "Working…" : label}
    </button>
  );
}

/**
 * Optional contact details. Framed as an addition, never as a missing field —
 * §50 is explicit that empty phone/email must not look like an error.
 */
function ContactEditor({ email, phone, onSave, busy }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: email || "", phone: phone || "" });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-[11px] font-semibold text-[var(--brand-primary)]"
      >
        {email || phone ? "Edit contact details" : "Add contact details (optional)"}
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg bg-white p-2.5">
      <p className="text-[11px] text-[var(--brand-muted)]">
        Optional. Pravyo access works without either of these.
      </p>
      <input
        type="email"
        placeholder="Email (optional)"
        value={form.email}
        onChange={(event) => setForm({ ...form, email: event.target.value })}
        className="min-h-[36px] w-full rounded-lg border border-[var(--brand-border)] px-2 text-xs"
      />
      <input
        type="tel"
        placeholder="Phone (optional)"
        value={form.phone}
        onChange={(event) => setForm({ ...form, phone: event.target.value })}
        className="min-h-[36px] w-full rounded-lg border border-[var(--brand-border)] px-2 text-xs"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            onSave(form);
            setOpen(false);
          }}
          className="min-h-[36px] flex-1 rounded-lg bg-[var(--brand-primary)] text-xs font-bold text-white disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-[36px] rounded-lg px-3 text-xs font-semibold text-[var(--brand-muted)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
