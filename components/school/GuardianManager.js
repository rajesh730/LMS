"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FaPlus,
  FaCheckCircle,
  FaBan,
  FaEye,
  FaCopy,
  FaPaperPlane,
} from "react-icons/fa";
import ParentAccessPanel from "./ParentAccessPanel";
import AssistedAccessDialog from "./AssistedAccessDialog";
import MessageGuardianDialog from "./MessageGuardianDialog";

/**
 * Manage one student's guardians (§19, §20, §27).
 *
 * Two things this UI has to make unmissable to a school administrator:
 *
 *  1. **An invitation code is shown ONCE.** It is stored hashed, so it cannot be
 *     retrieved later. The panel says so plainly and offers a copy button.
 *
 *  2. **Guardians of the same child can have different rights.** The permission
 *     checkboxes are visible on every row, not hidden behind an "advanced"
 *     disclosure, because the separated-family case (§20) is common and getting
 *     it wrong means a non-custodial parent can consent on the child's behalf.
 */

const ACCESS_LEVELS = [
  {
    value: "FULL",
    label: "Full access",
    hint: "Portfolio, notices, consent, registration, messaging.",
  },
  {
    value: "VIEW_AND_NOTICES",
    label: "View and notices",
    hint: "Sees everything and receives notices, but cannot consent or register.",
  },
  {
    value: "VIEW_ONLY",
    label: "View only",
    hint: "Portfolio only. No notices, no messaging.",
  },
];

const RELATIONSHIPS = [
  "MOTHER",
  "FATHER",
  "GRANDPARENT",
  "LEGAL_GUARDIAN",
  "UNCLE",
  "AUNT",
  "SIBLING",
  "OTHER",
];

const PERMISSION_LABELS = {
  canViewPortfolio: "View portfolio",
  canReceiveNotices: "Receive notices",
  canRegisterEvents: "Register for events",
  canGiveConsent: "Give permission",
  canMessageSchool: "Message the school",
};

export default function GuardianManager({
  student,
  // Parent details captured at student registration but never turned into a
  // guardian account. Passed in by the roster so the panel can offer a
  // one-click conversion instead of making staff retype what is already there.
  registrationParent = null,
  // Set when the roster's row-level "add guardian" button was used, so the
  // form opens straight away instead of making staff find it a second time.
  openAddForm = false,
  onAddFormOpened,
  onChanged,
}) {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [inviting, setInviting] = useState(false);
  const [issuedCode, setIssuedCode] = useState(null);
  const [assisting, setAssisting] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const [messagingGuardian, setMessagingGuardian] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/school/guardians?studentId=${encodeURIComponent(student.id)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not load guardians");
      setState({ loading: false, error: "", data: json.data });
    } catch (err) {
      setState({ loading: false, error: err.message, data: null });
    }
  }, [student.id]);

  // `load` defers its first setState past an await, so calling it here does not
  // trigger the cascading-render that a synchronous setState in an effect would.
  useEffect(() => {
    load();
  }, [load]);

  // Honour the roster's request to open the add form, then clear the flag so
  // collapsing and reopening the row does not reopen the form unexpectedly.
  useEffect(() => {
    if (!openAddForm) return;
    setInviting(true);
    onAddFormOpened?.();
  }, [openAddForm, onAddFormOpened]);

  // Keep the roster's coverage column in step with anything done in here.
  const refresh = useCallback(async () => {
    await load();
    onChanged?.();
  }, [load, onChanged]);

  const updateGuardian = async (payload) => {
    await fetch("/api/school/guardians", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await refresh();
  };

  if (state.loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />;
  }

  if (state.error) {
    return (
      <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
        {state.error}
      </div>
    );
  }

  const { guardians, pendingInvitations } = state.data;

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--brand-ink)]">
            {student.name}
          </h2>
          <p className="text-sm text-[var(--brand-muted)]">{student.grade}</p>
        </div>
        <button
          type="button"
          onClick={() => setInviting((value) => !value)}
          className="flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-bold text-white"
        >
          <FaPlus aria-hidden="true" className="h-3.5 w-3.5" />
          {guardians.length === 0 ? "Add guardian" : "Add another guardian"}
        </button>
      </header>

      {issuedCode ? (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4">
          <p className="text-sm font-bold text-emerald-900">
            Invitation code — copy it now
          </p>
          <p className="mt-1 text-xs text-emerald-800">
            This code is stored securely and cannot be shown again. Send it to
            the guardian; if it is lost, issue a new invitation.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 rounded-xl bg-white px-4 py-3 font-mono text-xl tracking-[0.25em] text-[var(--brand-ink)]">
              {issuedCode}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(issuedCode)}
              aria-label="Copy code"
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white"
            >
              <FaCopy aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Registration captured a parent but nobody was ever connected. Offer
          the conversion inline rather than making staff retype it. */}
      {registrationParent && guardians.length === 0 ? (
        <section className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-orange-900">
            From the student record
          </p>
          <p className="mt-1 text-base font-bold text-[var(--brand-ink)]">
            {registrationParent.name}
          </p>
          <p className="text-sm text-orange-900">
            {[
              relationshipLabel(registrationParent.relationshipType),
              registrationParent.phone,
              registrationParent.email,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-orange-900">
            These details were entered when {student.name.split(" ")[0]} was
            registered, but no guardian account exists yet, so this family
            cannot use the Parent App.
          </p>
          <button
            type="button"
            onClick={() => {
              setPrefill(registrationParent);
              setInviting(true);
            }}
            className="mt-3 min-h-[44px] w-full rounded-xl bg-orange-600 text-sm font-bold text-white"
          >
            Add {registrationParent.name} as guardian
          </button>
        </section>
      ) : null}

      {inviting ? (
        <InviteForm
          studentId={student.id}
          prefill={prefill}
          isFirstGuardian={guardians.length === 0}
          onCancel={() => {
            setInviting(false);
            setPrefill(null);
          }}
          onCreated={() => {
            setInviting(false);
            refresh();
          }}
          onCardIssued={(card, parentIdentifier) => {
            setInviting(false);
            // The PIN exists only in that response — open the print page
            // immediately rather than storing it anywhere.
            window.open(
              `/school/guardians/card?activation=${encodeURIComponent(card.activationId)}` +
                `&pin=${encodeURIComponent(card.activationPin)}` +
                `&token=${encodeURIComponent(card.activationToken)}`,
              "_blank",
              "noopener"
            );
            refresh();
          }}
          onLegacyCode={(code) => {
            setIssuedCode(code);
            setInviting(false);
            refresh();
          }}
        />
      ) : null}

      {messagingGuardian ? (
        <MessageGuardianDialog
          linkId={messagingGuardian.linkId}
          guardianName={messagingGuardian.guardianName}
          studentName={student.name}
          canReply={messagingGuardian.canReply}
          onClose={() => setMessagingGuardian(null)}
        />
      ) : null}

      {assisting ? (
        <AssistedAccessDialog
          studentId={student.id}
          studentName={student.name}
          linkId={assisting.linkId}
          guardianName={assisting.guardianName}
          onClose={() => setAssisting(null)}
        />
      ) : null}

      {pendingInvitations.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-amber-900">
            Waiting to be accepted
          </h3>
          <ul className="mt-2 space-y-2">
            {pendingInvitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-[var(--brand-ink)]">
                  {invitation.guardianName || invitation.email || invitation.phone}
                  <span className="ml-2 text-xs text-[var(--brand-muted)]">
                    {relationshipLabel(invitation.relationshipType)}
                  </span>
                </span>
                <span className="font-mono text-xs text-[var(--brand-muted)]">
                  …{invitation.codeHint}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {guardians.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--brand-border)] px-6 py-10 text-center">
          <p className="font-semibold text-[var(--brand-ink)]">
            No guardians connected yet
          </p>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            Invite a parent so they can follow {student.name}&apos;s journey.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {guardians.map((guardian) => (
            <li
              key={guardian.id}
              className={[
                "rounded-2xl border p-4",
                guardian.status === "REVOKED"
                  ? "border-[var(--brand-border)] bg-slate-50 opacity-70"
                  : "border-[var(--brand-border)] bg-white",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-[var(--brand-ink)]">
                    {guardian.name}
                    {guardian.isPrimaryGuardian ? (
                      <span className="ml-2 rounded-full bg-[var(--brand-primary-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-primary)]">
                        Primary
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-[var(--brand-muted)]">
                    {relationshipLabel(guardian.relationshipType)}
                    {guardian.email ? ` · ${guardian.email}` : ""}
                    {guardian.phone ? ` · ${guardian.phone}` : ""}
                  </p>
                </div>

                <span
                  className={[
                    "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                    guardian.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-700",
                  ].join(" ")}
                >
                  {guardian.status === "ACTIVE" ? (
                    <FaCheckCircle aria-hidden="true" className="h-3 w-3" />
                  ) : (
                    <FaBan aria-hidden="true" className="h-3 w-3" />
                  )}
                  {guardian.status}
                </span>
              </div>

              {/* Per-guardian permissions, always visible (§20). */}
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    disabled={guardian.status !== "ACTIVE"}
                    onClick={() =>
                      updateGuardian({
                        linkId: guardian.id,
                        [key]: !guardian.permissions[key],
                      })
                    }
                    aria-pressed={guardian.permissions[key]}
                    className={[
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
                      guardian.permissions[key]
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-[var(--brand-border)] bg-white text-[var(--brand-muted)]",
                    ].join(" ")}
                  >
                    {guardian.permissions[key] ? "✓ " : "○ "}
                    {label}
                  </button>
                ))}
              </div>

              {/* Parent Access: card, PIN, reachability (§4, §58). */}
              {guardian.status === "ACTIVE" ? (
                <div className="mt-3">
                  <ParentAccessPanel
                    linkId={guardian.id}
                    guardianName={guardian.name}
                    studentName={student.name}
                    onChanged={refresh}
                  />
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap justify-end gap-2">
                {/* Message THIS guardian only. Messaging the student would
                    reach every guardian, which is exactly wrong when the
                    school needs a private word with one of them (§19). */}
                {guardian.status === "ACTIVE" ? (
                  <button
                    type="button"
                    onClick={() =>
                      setMessagingGuardian({
                        linkId: guardian.id,
                        guardianName: guardian.name,
                        canReply: guardian.permissions.canMessageSchool,
                      })
                    }
                    className="flex min-h-[40px] items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[var(--brand-primary)] hover:bg-slate-100"
                  >
                    <FaPaperPlane aria-hidden="true" className="h-3.5 w-3.5" />
                    Message
                  </button>
                ) : null}

                {guardian.status === "ACTIVE" ? (
                  <button
                    type="button"
                    onClick={() =>
                      setAssisting({
                        linkId: guardian.id,
                        guardianName: guardian.name,
                      })
                    }
                    className="flex min-h-[40px] items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[var(--brand-primary)] hover:bg-slate-100"
                  >
                    <FaEye aria-hidden="true" className="h-3.5 w-3.5" />
                    Assisted view
                  </button>
                ) : null}

                {guardian.status === "ACTIVE" ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateGuardian({ linkId: guardian.id, action: "REVOKE" })
                    }
                    // Removes THIS child only. The guardian keeps any other
                    // children they are linked to (§44).
                    title="Removes this child only"
                    className="min-h-[40px] rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Remove from {student.name.split(" ")[0]}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      updateGuardian({ linkId: guardian.id, action: "REACTIVATE" })
                    }
                    className="min-h-[40px] rounded-lg px-3 text-sm font-semibold text-[var(--brand-primary)] hover:bg-slate-100"
                  >
                    Restore access
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Add a guardian.
 *
 * Three modes, and the DEFAULT is the one that works for everyone:
 *
 *  - **NEW** — create the guardian and print a Parent Access Card. Phone and
 *    email are optional and clearly labelled as such (§3, §50): a guardian with
 *    neither is completely normal and the form must not imply otherwise.
 *  - **EXISTING** — connect a guardian who already holds a Parent ID to this
 *    child too, instead of creating a duplicate account (§17).
 *  - **CODE** — the legacy invitation-code flow, kept available but no longer
 *    the default (§57).
 */
function InviteForm({
  studentId,
  prefill,
  isFirstGuardian = true,
  onCancel,
  onCreated,
  onCardIssued,
  onLegacyCode,
}) {
  const [mode, setMode] = useState("NEW");
  const [form, setForm] = useState({
    // Seeded from the student record when converting registration details,
    // so staff confirm rather than retype.
    guardianName: prefill?.name || "",
    email: prefill?.email || "",
    phone: prefill?.phone || "",
    relationshipType: RELATIONSHIPS.includes(prefill?.relationshipType)
      ? prefill.relationshipType
      : "MOTHER",
    // A second guardian defaults to view + notices, not full rights, and never
    // to primary — those are decisions the school makes deliberately (§20).
    accessLevel: prefill || isFirstGuardian ? "FULL" : "VIEW_AND_NOTICES",
    isPrimaryGuardian: Boolean(prefill) || isFirstGuardian,
    isHousehold: false,
    householdName: "",
    existingParentIdentifier: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const update = (key) => (event) =>
    setForm((prev) => ({
      ...prev,
      [key]:
        event.target.type === "checkbox"
          ? event.target.checked
          : event.target.value,
    }));

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        studentId,
        ...form,
        mode: mode === "CODE" ? "INVITATION" : "DIRECT",
      };
      if (mode !== "EXISTING") delete payload.existingParentIdentifier;

      const res = await fetch("/api/school/guardians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not add guardian");

      if (mode === "CODE") {
        onLegacyCode(json.data.code);
      } else if (json.data.card) {
        onCardIssued(json.data.card, json.data.parentIdentifier);
      } else {
        // An already-activated guardian gaining a second child keeps their
        // existing Parent ID and PIN — no new card is printed.
        onCreated();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-[var(--brand-border)] bg-white p-4"
    >
      <div className="flex flex-wrap gap-2">
        {[
          { key: "NEW", label: "New guardian" },
          { key: "EXISTING", label: "Existing Parent ID" },
          { key: "CODE", label: "Use invitation code" },
        ].map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setMode(option.key)}
            aria-pressed={mode === option.key}
            className={[
              "min-h-[36px] rounded-lg px-3 text-xs font-semibold transition-colors",
              mode === option.key
                ? "bg-[var(--brand-primary)] text-white"
                : "bg-slate-100 text-[var(--brand-muted)]",
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode === "EXISTING" ? (
        <div>
          <Field
            label="Parent ID"
            value={form.existingParentIdentifier}
            onChange={update("existingParentIdentifier")}
            placeholder="PRV-P-XXXXXX"
            required
          />
          <p className="mt-1 text-xs text-[var(--brand-muted)]">
            Ask the guardian to read the Parent ID from their card. They keep
            their existing PIN — no new card is needed.
          </p>
        </div>
      ) : null}

      {mode === "CODE" ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Legacy flow: the guardian must register themselves and type an
          8-character code. Prefer &quot;New guardian&quot;, which prints a card
          and needs no email or phone.
        </p>
      ) : null}

      <div className={mode === "EXISTING" ? "hidden" : "grid gap-3 sm:grid-cols-2"}>
        <Field
          label="Guardian name"
          value={form.guardianName}
          onChange={update("guardianName")}
          required={mode !== "EXISTING"}
        />
        <div>
          <label className="block text-sm font-semibold text-[var(--brand-ink)]">
            Relationship
          </label>
          <select
            value={form.relationshipType}
            onChange={update("relationshipType")}
            className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[var(--brand-border)] px-3 text-sm"
          >
            {RELATIONSHIPS.map((value) => (
              <option key={value} value={value}>
                {relationshipLabel(value)}
              </option>
            ))}
          </select>
        </div>
        <Field
          label="Email (optional)"
          type="email"
          value={form.email}
          onChange={update("email")}
        />
        <Field
          label="Phone (optional)"
          type="tel"
          value={form.phone}
          onChange={update("phone")}
        />
      </div>

      {mode === "NEW" ? (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">
          A phone number and email are <strong>not required</strong>. The
          guardian signs in with the Parent ID and PIN on their printed card.
        </p>
      ) : null}

      <fieldset>
        <legend className="text-sm font-semibold text-[var(--brand-ink)]">
          What may this guardian do?
        </legend>
        <div className="mt-2 space-y-2">
          {ACCESS_LEVELS.map((level) => (
            <label
              key={level.value}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--brand-border)] p-3"
            >
              <input
                type="radio"
                name="accessLevel"
                value={level.value}
                checked={form.accessLevel === level.value}
                onChange={update("accessLevel")}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-semibold text-[var(--brand-ink)]">
                  {level.label}
                </span>
                <span className="block text-xs text-[var(--brand-muted)]">
                  {level.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm text-[var(--brand-ink)]">
        <input
          type="checkbox"
          checked={form.isPrimaryGuardian}
          onChange={update("isPrimaryGuardian")}
        />
        Primary guardian
      </label>

      {/* Household mode (§20). Consent is withheld by default because a shared
          account cannot evidence WHICH guardian decided. */}
      {mode === "NEW" ? (
        <div className="rounded-xl border border-[var(--brand-border)] p-3">
          <label className="flex items-center gap-2 text-sm text-[var(--brand-ink)]">
            <input
              type="checkbox"
              checked={form.isHousehold}
              onChange={update("isHousehold")}
            />
            This is a shared family account
          </label>
          {form.isHousehold ? (
            <>
              <input
                type="text"
                placeholder="Family name, e.g. Sharma Family"
                value={form.householdName}
                onChange={update("householdName")}
                className="mt-2 min-h-[40px] w-full rounded-lg border border-[var(--brand-border)] px-3 text-sm"
              />
              <p className="mt-2 text-xs text-[var(--brand-muted)]">
                Actions will be recorded as the family, not as one person.
                Permission decisions stay switched off unless you enable them
                above.
              </p>
            </>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[44px] rounded-xl px-4 text-sm font-semibold text-[var(--brand-muted)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="min-h-[44px] rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-bold text-white disabled:opacity-60"
        >
          {submitting
            ? "Working…"
            : mode === "CODE"
              ? "Create invitation code"
              : mode === "EXISTING"
                ? "Connect guardian"
                : "Add guardian & print card"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[var(--brand-ink)]">
        {label}
      </label>
      <input
        {...props}
        className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[var(--brand-border)] px-3 text-sm focus:border-[var(--brand-primary)] focus:outline-none"
      />
    </div>
  );
}

function relationshipLabel(value) {
  return String(value || "Guardian")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
