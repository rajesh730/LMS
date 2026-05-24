"use client";

import { useState } from "react";
import { buildGradeLabels, normalizeGradeValue } from "@/lib/schoolGrades";

const ROLE_OPTIONS = [
  "ORGANIZER_PARTNER",
  "SPONSOR",
  "VENUE_PARTNER",
  "MENTOR_PARTNER",
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

export default function EventProposalForm() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
        "Request received. Our platform team will review it before schools see anything."
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-[26px] border border-[#d7cdbb] bg-white p-5 shadow-sm sm:p-6">
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#0a2f66]">
          Step 1
        </p>
        <h2 className="mb-5 text-xl font-black text-slate-950 sm:text-2xl">
          Organizer Details
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <input
            required
            value={form.organizationName}
            onChange={(e) => update("organizationName", e.target.value)}
            placeholder="Organization name"
            className="rounded-xl border border-[#d7cdbb] bg-white p-3 text-slate-950"
          />
          <select
            value={form.organizationType}
            onChange={(e) => update("organizationType", e.target.value)}
            className="rounded-xl border border-[#d7cdbb] bg-white p-3 text-slate-950"
          >
            {ORGANIZATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {label(type)}
              </option>
            ))}
          </select>
          <input
            required
            value={form.contactName}
            onChange={(e) => update("contactName", e.target.value)}
            placeholder="Contact person"
            className="rounded-xl border border-[#d7cdbb] bg-white p-3 text-slate-950"
          />
          <input
            required
            type="email"
            value={form.contactEmail}
            onChange={(e) => update("contactEmail", e.target.value)}
            placeholder="Contact email"
            className="rounded-xl border border-[#d7cdbb] bg-white p-3 text-slate-950"
          />
          <input
            value={form.contactPhone}
            onChange={(e) => update("contactPhone", e.target.value)}
            placeholder="Phone number"
            className="rounded-xl border border-[#d7cdbb] bg-white p-3 text-slate-950"
          />
          <input
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="Location"
            className="rounded-xl border border-[#d7cdbb] bg-white p-3 text-slate-950"
          />
          <input
            value={form.website}
            onChange={(e) => update("website", e.target.value)}
            placeholder="Website or public profile link"
            className="rounded-xl border border-[#d7cdbb] bg-white p-3 text-slate-950 md:col-span-2"
          />
        </div>
      </section>

      <section className="rounded-[26px] border border-[#d7cdbb] bg-white p-5 shadow-sm sm:p-6">
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#0a2f66]">
          Step 2
        </p>
        <h2 className="mb-5 text-xl font-black text-slate-950 sm:text-2xl">Event Proposal</h2>

        <div className="space-y-4">
          <input
            required
            value={form.eventTitle}
            onChange={(e) => update("eventTitle", e.target.value)}
            placeholder="Event title"
            className="w-full rounded-xl border border-[#d7cdbb] bg-white p-3 text-slate-950"
          />
          <textarea
            required
            value={form.eventDescription}
            onChange={(e) => update("eventDescription", e.target.value)}
            placeholder="Describe the event purpose, format, student audience, and what schools should expect"
            rows={5}
            className="w-full rounded-xl border border-[#d7cdbb] bg-white p-3 text-slate-950"
          />
          <div className="grid gap-4 md:grid-cols-3">
            <input
              type="date"
              min={getTodayInputValue()}
              value={form.preferredDate}
              onChange={(e) => update("preferredDate", e.target.value)}
              className="rounded-xl border border-[#d7cdbb] bg-white p-3 text-slate-950"
            />
            <select
              value={form.eventMode}
              onChange={(e) => update("eventMode", e.target.value)}
              className="rounded-xl border border-[#d7cdbb] bg-white p-3 text-slate-950"
            >
              {EVENT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {label(mode)}
                </option>
              ))}
            </select>
            <input
              value={form.venue}
              onChange={(e) => update("venue", e.target.value)}
              placeholder="Venue, if known"
              className="rounded-xl border border-[#d7cdbb] bg-white p-3 text-slate-950"
            />
          </div>
        </div>
      </section>

      <section className="rounded-[26px] border border-[#d7cdbb] bg-white p-5 shadow-sm sm:p-6">
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#0a2f66]">
          Step 3
        </p>
        <h2 className="mb-5 text-xl font-black text-slate-950 sm:text-2xl">
          Audience and Support
        </h2>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Organizer role
            </label>
            <select
              value={form.proposedRoles[0] || "ORGANIZER_PARTNER"}
              onChange={(e) => update("proposedRoles", [e.target.value])}
              className="w-full rounded-xl border border-[#d7cdbb] bg-white p-3 text-slate-950"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {label(role)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Prize or support details
            </label>
            <input
            value={form.prizeDetails}
            onChange={(e) => update("prizeDetails", e.target.value)}
              placeholder="Awards, certificates, resources, or other support offered"
              className="w-full rounded-xl border border-[#d7cdbb] bg-white p-3 text-slate-950"
            />
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-sm font-bold text-slate-700">Target grades</p>
          <p className="mb-3 text-xs text-slate-500">
            Leave empty if the event is open to all school grades.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {GRADE_OPTIONS.map((grade) => (
              <label
                key={grade}
                className="flex items-center gap-2 rounded-xl border border-[#d7cdbb] bg-[#f8fbff] p-3 text-sm font-semibold text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={form.targetGrades.includes(grade)}
                  onChange={() => toggleGrade(grade)}
                  className="rounded border-[#bfd7f7] bg-white"
                />
                {grade}
              </label>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="rounded-full bg-[#0a2f66] px-8 py-4 font-bold text-white hover:bg-[#123f82] disabled:opacity-60"
        >
          {status === "submitting" ? "Submitting..." : "Request Review"}
        </button>
        {message && (
          <p
            className={`text-sm ${
              status === "success" ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
