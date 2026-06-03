"use client";

import { useState } from "react";
import { buildGradeLabels, normalizeGradeValue } from "@/lib/schoolGrades";

const ROLE_OPTIONS = [
  ["ORGANIZER_PARTNER", "Event Organizer"],
  ["SPONSOR", "Sponsor"],
  ["VENUE_PARTNER", "Venue Partner"],
  ["MENTOR_PARTNER", "Mentor / Trainer"],
];

const ORGANIZATION_TYPES = ["ACADEMY", "COMPANY", "NGO", "INDIVIDUAL", "OTHER"];
const EVENT_MODES = ["UNDECIDED", "ONSITE", "ONLINE", "HYBRID"];
const GRADE_OPTIONS = buildGradeLabels();

function label(value) {
  return String(value || "").replaceAll("_", " ");
}

function getTodayInputValue() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().split("T")[0];
}

const initialForm = {
  organizationName: "",
  organizationType: "ACADEMY",
  website: "",
  location: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  eventTitle: "",
  eventDescription: "",
  proposedRoles: ["ORGANIZER_PARTNER"],
  targetGrades: [],
  preferredDate: "",
  eventMode: "UNDECIDED",
  venue: "",
  prizeDetails: "",
};

function Field({ label: title, children, className = "" }) {
  return (
    <label className={`block min-w-0 ${className}`.trim()}>
      <span className="mb-1.5 block text-xs font-black uppercase text-[#52657d]">
        {title}
      </span>
      {children}
    </label>
  );
}

const fieldClass =
  "min-h-11 w-full rounded-lg border border-[#d7ddea] bg-white px-3 text-sm font-semibold text-[#17120a] outline-none transition placeholder:text-[#8a9ab1] focus:border-[#4326e8] focus:ring-4 focus:ring-[#4326e8]/10";

export default function EventProposalForm() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [lookup, setLookup] = useState({ email: "", phone: "" });
  const [lookupStatus, setLookupStatus] = useState("");
  const [lookupMessage, setLookupMessage] = useState("");

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateLookup = (field, value) => {
    setLookup((prev) => ({ ...prev, [field]: value }));
  };

  const toggleRole = (role) => {
    setForm((prev) => {
      const roles = prev.proposedRoles.includes(role)
        ? prev.proposedRoles.filter((item) => item !== role)
        : [...prev.proposedRoles, role];

      return {
        ...prev,
        proposedRoles: roles.length ? roles : ["ORGANIZER_PARTNER"],
      };
    });
  };

  const toggleGrade = (grade) => {
    const normalizedGrade = normalizeGradeValue(grade);

    setForm((prev) => {
      const grades = prev.targetGrades.includes(normalizedGrade)
        ? prev.targetGrades.filter((item) => item !== normalizedGrade)
        : [...prev.targetGrades, normalizedGrade];

      return { ...prev, targetGrades: grades };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");

    try {
      const res = await fetch("/api/event-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          expectedSchools: "",
          expectedStudents: "",
          dataAccessNeeds: "",
          safetyNotes: "",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to submit proposal");
      }

      setStatus("success");
      setMessage(
        "Application received. The Pratyo team will review it before anything is shown to schools."
      );
      setForm((prev) => ({
        ...initialForm,
        organizationName: prev.organizationName,
        organizationType: prev.organizationType,
        website: prev.website,
        location: prev.location,
        contactName: prev.contactName,
        contactEmail: prev.contactEmail,
        contactPhone: prev.contactPhone,
      }));
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  };

  const handlePartnerLookup = async () => {
    setLookupStatus("searching");
    setLookupMessage("");

    try {
      const params = new URLSearchParams();
      if (lookup.email.trim()) params.set("email", lookup.email.trim());
      if (lookup.phone.trim()) params.set("phone", lookup.phone.trim());

      if (!params.toString()) {
        throw new Error("Enter an email or phone number to search.");
      }

      const res = await fetch(`/api/event-proposals/partner-lookup?${params}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to search partner records");
      }

      if (!data.partner) {
        setLookupStatus("empty");
        setLookupMessage(
          "No existing partner found. Continue with a new application."
        );
        return;
      }

      const partnerRoles = (data.partner.partnerRoles || []).filter((role) =>
        ROLE_OPTIONS.some(([option]) => option === role)
      );

      setForm((prev) => ({
        ...prev,
        organizationName: data.partner.organizationName || prev.organizationName,
        organizationType: data.partner.organizationType || prev.organizationType,
        website: data.partner.website || prev.website,
        location: data.partner.location || prev.location,
        contactName: data.partner.contactName || prev.contactName,
        contactEmail: data.partner.contactEmail || lookup.email || prev.contactEmail,
        contactPhone: data.partner.contactPhone || lookup.phone || prev.contactPhone,
        proposedRoles: partnerRoles.length ? partnerRoles : prev.proposedRoles,
      }));
      setLookupStatus("found");
      setLookupMessage(
        `${data.partner.organizationName} found. Organization details have been filled in.`
      );
    } catch (error) {
      setLookupStatus("error");
      setLookupMessage(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
        <div className="mb-5">
          <p className="text-[11px] font-black uppercase text-[#4326e8]">
            Returning Partner
          </p>
          <h2 className="mt-1 text-xl font-black text-[#17120a]">
            Search first if you have organized before.
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#52657d]">
            Use the email or phone number your organization used previously.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <Field label="Email">
            <input
              type="email"
              value={lookup.email}
              onChange={(e) => updateLookup("email", e.target.value)}
              placeholder="name@example.com"
              className={fieldClass}
            />
          </Field>
          <Field label="Phone">
            <input
              value={lookup.phone}
              onChange={(e) => updateLookup("phone", e.target.value)}
              placeholder="Previous contact phone"
              className={fieldClass}
            />
          </Field>
          <button
            type="button"
            onClick={handlePartnerLookup}
            disabled={lookupStatus === "searching"}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#4326e8] px-5 text-sm font-black text-white transition hover:bg-[#3217d3] disabled:opacity-60"
          >
            {lookupStatus === "searching" ? "Searching..." : "Search"}
          </button>
        </div>

        {lookupMessage && (
          <p
            className={`mt-3 text-sm font-semibold ${
              lookupStatus === "found"
                ? "text-emerald-700"
                : lookupStatus === "error"
                ? "text-red-700"
                : "text-[#52657d]"
            }`}
          >
            {lookupMessage}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
        <div className="mb-5">
          <p className="text-[11px] font-black uppercase text-[#4326e8]">
            Organization Information
          </p>
          <h2 className="mt-1 text-xl font-black text-[#17120a]">
            Tell us who will work with schools.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Organization Name">
            <input
              required
              value={form.organizationName}
              onChange={(e) => update("organizationName", e.target.value)}
              placeholder="e.g. Aastha Kala Kendra"
              className={fieldClass}
            />
          </Field>
          <Field label="Organization Type">
            <select
              value={form.organizationType}
              onChange={(e) => update("organizationType", e.target.value)}
              className={fieldClass}
            >
              {ORGANIZATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {label(type)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Contact Person">
            <input
              required
              value={form.contactName}
              onChange={(e) => update("contactName", e.target.value)}
              placeholder="Full name"
              className={fieldClass}
            />
          </Field>
          <Field label="Email">
            <input
              required
              type="email"
              value={form.contactEmail}
              onChange={(e) => update("contactEmail", e.target.value)}
              placeholder="name@example.com"
              className={fieldClass}
            />
          </Field>
          <Field label="Phone">
            <input
              value={form.contactPhone}
              onChange={(e) => update("contactPhone", e.target.value)}
              placeholder="Optional"
              className={fieldClass}
            />
          </Field>
          <Field label="Location">
            <input
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="City, district"
              className={fieldClass}
            />
          </Field>
          <Field label="Website or Public Profile" className="md:col-span-2">
            <input
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              placeholder="https://..."
              className={fieldClass}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
        <div className="mb-5">
          <p className="text-[11px] font-black uppercase text-[#4326e8]">
            Partnership Interest
          </p>
          <h2 className="mt-1 text-xl font-black text-[#17120a]">
            Choose the role that fits your contribution.
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {ROLE_OPTIONS.map(([role, text]) => (
            <label
              key={role}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-4 text-sm font-black transition ${
                form.proposedRoles.includes(role)
                  ? "border-[#4326e8] bg-[#f4f1ff] text-[#4326e8]"
                  : "border-[#e6eaf7] bg-white text-[#24314d] hover:bg-[#f8f9fd]"
              }`}
            >
              <input
                type="checkbox"
                checked={form.proposedRoles.includes(role)}
                onChange={() => toggleRole(role)}
                className="h-4 w-4 rounded border-[#c9d3e5]"
              />
              {text}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
        <div className="mb-5">
          <p className="text-[11px] font-black uppercase text-[#4326e8]">
            School-Facing Opportunity
          </p>
          <h2 className="mt-1 text-xl font-black text-[#17120a]">
            Share the event or program idea.
          </h2>
        </div>

        <div className="space-y-4">
          <Field label="Opportunity Title">
            <input
              required
              value={form.eventTitle}
              onChange={(e) => update("eventTitle", e.target.value)}
              placeholder="Essay Challenge 2026"
              className={fieldClass}
            />
          </Field>
          <Field label="Description">
            <textarea
              required
              value={form.eventDescription}
              onChange={(e) => update("eventDescription", e.target.value)}
              placeholder="Purpose, format, student audience, and what schools should expect."
              rows={5}
              className={`${fieldClass} min-h-32 py-3`}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Preferred Date">
              <input
                type="date"
                min={getTodayInputValue()}
                value={form.preferredDate}
                onChange={(e) => update("preferredDate", e.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Mode">
              <select
                value={form.eventMode}
                onChange={(e) => update("eventMode", e.target.value)}
                className={fieldClass}
              >
                {EVENT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {label(mode)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Venue">
              <input
                value={form.venue}
                onChange={(e) => update("venue", e.target.value)}
                placeholder="If known"
                className={fieldClass}
              />
            </Field>
          </div>
          <Field label="Prize or Support">
            <input
              value={form.prizeDetails}
              onChange={(e) => update("prizeDetails", e.target.value)}
              placeholder="Awards, certificates, resources, mentorship, sponsorship..."
              className={fieldClass}
            />
          </Field>
        </div>

        <div className="mt-5">
          <p className="text-xs font-black uppercase text-[#52657d]">
            Target Grades
          </p>
          <p className="mt-1 text-xs text-[#52657d]">
            Leave empty if the opportunity is open to all school grades.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {GRADE_OPTIONS.map((grade) => (
              <label
                key={grade}
                className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-bold transition ${
                  form.targetGrades.includes(grade)
                    ? "border-[#4326e8] bg-[#f4f1ff] text-[#4326e8]"
                    : "border-[#e6eaf7] bg-[#f8f9fd] text-[#24314d]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.targetGrades.includes(grade)}
                  onChange={() => toggleGrade(grade)}
                  className="h-4 w-4 rounded border-[#c9d3e5]"
                />
                {grade}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-[#17120a]">Before You Submit</h2>
        <p className="mt-2 text-sm leading-6 text-[#52657d]">
          Pratyo reviews public partner requests before schools see them.
          Student data is never shared automatically with outside partners.
        </p>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={status === "submitting"}
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#4326e8] px-6 text-sm font-black text-white transition hover:bg-[#3217d3] disabled:opacity-60"
          >
            {status === "submitting" ? "Submitting..." : "Submit Application"}
          </button>
          {message && (
            <p
              className={`text-sm font-semibold ${
                status === "success" ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </section>
    </form>
  );
}
