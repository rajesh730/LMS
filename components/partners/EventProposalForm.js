"use client";

import { useState } from "react";

const ROLE_OPTIONS = [
  "ORGANIZER_PARTNER",
  "CHALLENGE_PARTNER",
  "SPONSOR",
  "VENUE_PARTNER",
  "MENTOR_PARTNER",
  "MEDIA_PARTNER",
  "PRESENTED_BY",
  "OTHER",
];

const GRADE_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

function label(value) {
  return String(value || "").replaceAll("_", " ");
}

export default function EventProposalForm() {
  const [form, setForm] = useState({
    organizationName: "",
    organizationType: "COMPANY",
    website: "",
    location: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    eventTitle: "",
    eventDescription: "",
    proposedRoles: ["ORGANIZER_PARTNER"],
    targetGrades: [],
    expectedSchools: "",
    expectedStudents: "",
    preferredDate: "",
    eventMode: "UNDECIDED",
    venue: "",
    prizeDetails: "",
    dataAccessNeeds: "",
    safetyNotes: "",
  });
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayValue = (field, value) => {
    setForm((prev) => {
      const values = prev[field] || [];
      const next = values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];
      return { ...prev, [field]: next };
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
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to submit proposal");
      }

      setStatus("success");
      setMessage(
        "Proposal submitted. Our platform team will review it before schools see anything."
      );
      setForm((prev) => ({
        ...prev,
        eventTitle: "",
        eventDescription: "",
        prizeDetails: "",
        dataAccessNeeds: "",
        safetyNotes: "",
      }));
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-2xl font-bold text-white mb-5">Organization</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <input
            required
            value={form.organizationName}
            onChange={(e) => update("organizationName", e.target.value)}
            placeholder="Organization name"
            className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-white"
          />
          <select
            value={form.organizationType}
            onChange={(e) => update("organizationType", e.target.value)}
            className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-white"
          >
            {["COMPANY", "ACADEMY", "NGO", "CLUB", "INDIVIDUAL", "OTHER"].map(
              (type) => (
                <option key={type} value={type}>
                  {label(type)}
                </option>
              )
            )}
          </select>
          <input
            value={form.website}
            onChange={(e) => update("website", e.target.value)}
            placeholder="Website or social link"
            className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-white"
          />
          <input
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="Location"
            className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-white"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-2xl font-bold text-white mb-5">Contact Person</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <input
            required
            value={form.contactName}
            onChange={(e) => update("contactName", e.target.value)}
            placeholder="Full name"
            className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-white"
          />
          <input
            required
            type="email"
            value={form.contactEmail}
            onChange={(e) => update("contactEmail", e.target.value)}
            placeholder="Email"
            className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-white"
          />
          <input
            value={form.contactPhone}
            onChange={(e) => update("contactPhone", e.target.value)}
            placeholder="Phone"
            className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-white"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-2xl font-bold text-white mb-5">Event Idea</h2>
        <div className="space-y-4">
          <input
            required
            value={form.eventTitle}
            onChange={(e) => update("eventTitle", e.target.value)}
            placeholder="Event title"
            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white"
          />
          <textarea
            required
            value={form.eventDescription}
            onChange={(e) => update("eventDescription", e.target.value)}
            placeholder="Describe the event, competition, or student opportunity"
            rows={5}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white"
          />
          <div className="grid md:grid-cols-3 gap-4">
            <input
              type="date"
              value={form.preferredDate}
              onChange={(e) => update("preferredDate", e.target.value)}
              className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-white"
            />
            <select
              value={form.eventMode}
              onChange={(e) => update("eventMode", e.target.value)}
              className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-white"
            >
              {["UNDECIDED", "ONLINE", "ONSITE", "HYBRID"].map((mode) => (
                <option key={mode} value={mode}>
                  {label(mode)}
                </option>
              ))}
            </select>
            <input
              value={form.venue}
              onChange={(e) => update("venue", e.target.value)}
              placeholder="Venue, if any"
              className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-white"
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-2xl font-bold text-white mb-5">Audience and Role</h2>
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-slate-400 mb-3">Your role</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {ROLE_OPTIONS.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={form.proposedRoles.includes(role)}
                    onChange={() => toggleArrayValue("proposedRoles", role)}
                    className="rounded border-slate-600 bg-slate-800"
                  />
                  {label(role)}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-3">Target grades</p>
            <div className="grid grid-cols-5 gap-2">
              {GRADE_OPTIONS.map((grade) => (
                <label
                  key={grade}
                  className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={form.targetGrades.includes(grade)}
                    onChange={() => toggleArrayValue("targetGrades", grade)}
                    className="rounded border-slate-600 bg-slate-800"
                  />
                  {grade}
                </label>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <input
                type="number"
                min="1"
                value={form.expectedSchools}
                onChange={(e) => update("expectedSchools", e.target.value)}
                placeholder="Expected schools"
                className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-white"
              />
              <input
                type="number"
                min="1"
                value={form.expectedStudents}
                onChange={(e) => update("expectedStudents", e.target.value)}
                placeholder="Expected students"
                className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-white"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-2xl font-bold text-white mb-5">Safety and Details</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <textarea
            value={form.prizeDetails}
            onChange={(e) => update("prizeDetails", e.target.value)}
            placeholder="Prizes, certificates, sponsorship support"
            rows={4}
            className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-white"
          />
          <textarea
            value={form.dataAccessNeeds}
            onChange={(e) => update("dataAccessNeeds", e.target.value)}
            placeholder="What student/school data would you need?"
            rows={4}
            className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-white"
          />
          <textarea
            value={form.safetyNotes}
            onChange={(e) => update("safetyNotes", e.target.value)}
            placeholder="Any safety, consent, travel, or judging notes"
            rows={4}
            className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-white"
          />
        </div>
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 px-8 py-4 font-bold text-white"
        >
          {status === "submitting" ? "Submitting..." : "Submit Proposal"}
        </button>
        {message && (
          <p
            className={`text-sm ${
              status === "success" ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
