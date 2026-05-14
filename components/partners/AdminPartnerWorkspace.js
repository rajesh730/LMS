"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

function label(value) {
  return String(value || "").replaceAll("_", " ");
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminPartnerWorkspace({ onChanged }) {
  const [proposals, setProposals] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingProposal, setEditingProposal] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [proposalRes, partnerRes] = await Promise.all([
        fetch("/api/event-proposals", { cache: "no-store" }),
        fetch("/api/external-organizers", { cache: "no-store" }),
      ]);

      if (proposalRes.ok) {
        const proposalData = await proposalRes.json();
        setProposals(proposalData.data || []);
      }

      if (partnerRes.ok) {
        const partnerData = await partnerRes.json();
        setPartners(partnerData.data || []);
      }
    } catch (error) {
      console.error("Failed to load partners", error);
      setMessage("Failed to load partner workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshAll = async () => {
    await loadData();
    onChanged?.();
  };

  const updateProposal = async (proposal, action, extraPayload = {}) => {
    setMessage("");
    try {
      const payload = { action, ...extraPayload };
      if (action === "approve" && !proposal.preferredDate && !extraPayload.eventDate) {
        const eventDate = window.prompt(
          "Enter the event date to publish this as a platform event (YYYY-MM-DD):"
        );
        if (!eventDate) return;
        payload.eventDate = eventDate;
      }

      const res = await fetch(`/api/event-proposals/${proposal._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update proposal");
      setMessage(
        action === "approve"
          ? "Proposal approved and published as a platform event."
          : action === "update" 
          ? "Proposal updated successfully."
          : "Proposal updated."
      );
      setEditingProposal(null);
      await refreshAll();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const updatePartner = async (partnerId, patch) => {
    setMessage("");
    try {
      const res = await fetch(`/api/external-organizers/${partnerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update partner");
      setMessage("Partner updated.");
      await refreshAll();
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-slate-300">
        Loading partner workspace...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Partner Proposals
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Outside organizers submit here first. Approve them before creating partner-branded platform events.
            </p>
          </div>
          <Link
            href="/organize-event"
            className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 px-4 py-2 text-sm"
          >
            View public proposal form
          </Link>
        </div>

        {message && <p className="text-sm text-emerald-300 mt-4">{message}</p>}

        <div className="grid gap-4 mt-6">
          {proposals.length === 0 ? (
            <p className="text-slate-500 italic">No partner proposals yet.</p>
          ) : (
            proposals.map((proposal) => {
              const emailMatchedPartner = partners.find(
                (partner) =>
                  normalizeEmail(partner.contactEmail) &&
                  normalizeEmail(partner.contactEmail) ===
                    normalizeEmail(proposal.contactEmail)
              );
              const resolvedPartner = proposal.organizer || emailMatchedPartner;
              const canPublishProposal =
                proposal.status !== "CONVERTED_TO_EVENT" && !proposal.linkedEvent;

              return (
                <article
                  key={proposal._id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-white">
                          {proposal.eventTitle}
                        </h3>
                        <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">
                          {proposal.status}
                        </span>
                        {emailMatchedPartner && !proposal.organizer && (
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                            Email match
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-300">
                        {proposal.organizationName} wants to join as{" "}
                        {(proposal.proposedRoles || []).map(label).join(", ")}.
                      </p>
                      <p className="text-sm text-slate-500 max-w-4xl">
                        {proposal.eventDescription}
                      </p>
                      <div className="grid md:grid-cols-3 gap-3 text-xs text-slate-400">
                        <div>Contact: {proposal.contactName}</div>
                        <div>Email: {proposal.contactEmail}</div>
                        <div>Mode: {label(proposal.eventMode)}</div>
                        <div>Date: {formatDate(proposal.preferredDate)}</div>
                        <div>
                          Grades:{" "}
                          {proposal.targetGrades?.length
                            ? proposal.targetGrades.join(", ")
                            : "All / not specified"}
                        </div>
                        <div>
                          Expected students: {proposal.expectedStudents || "N/A"}
                        </div>
                        <div>
                          Linked event: {proposal.linkedEvent?.title || "Not yet"}
                        </div>
                      </div>
                      {resolvedPartner && (
                        <p className="text-xs text-emerald-300">
                          Partner profile: {resolvedPartner.organizationName}
                          {resolvedPartner.slug ? (
                            <Link
                              href={`/partners/${resolvedPartner.slug}`}
                              className="ml-2 underline hover:text-emerald-200"
                            >
                              View portfolio
                            </Link>
                          ) : null}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {canPublishProposal && (
                        <button
                          type="button"
                          onClick={() => setEditingProposal(proposal)}
                          className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 text-sm"
                        >
                          Edit
                        </button>
                      )}
                      {proposal.status === "NEW" && (
                        <button
                          type="button"
                          onClick={() =>
                            updateProposal(proposal, "mark_reviewing")
                          }
                          className="rounded-lg bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 text-sm"
                        >
                          Review
                        </button>
                      )}
                      {canPublishProposal && (
                        <button
                          type="button"
                          onClick={() => updateProposal(proposal, "approve")}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 text-sm"
                        >
                          {proposal.status === "APPROVED"
                            ? "Publish Event"
                            : emailMatchedPartner
                            ? "Approve & Publish Event"
                            : "Approve & Publish"}
                        </button>
                      )}
                      {proposal.status !== "REJECTED" && (
                        <button
                          type="button"
                          onClick={() => updateProposal(proposal, "reject")}
                          className="rounded-lg bg-red-600 hover:bg-red-500 text-white px-3 py-2 text-sm"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      <div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Approved Partner Profiles
          </h2>
          <div className="grid gap-4">
            {partners.length === 0 ? (
              <p className="text-slate-500 italic">No partners created yet.</p>
            ) : (
              partners.map((partner) => (
                <article
                  key={partner._id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {partner.organizationName}
                      </h3>
                      <p className="text-sm text-slate-400 mt-1">
                        {(partner.partnerRoles || []).map(label).join(", ")}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        {partner.verificationStatus} - {partner.profileVisibility} -{" "}
                        {partner.trustLevel}
                      </p>
                      {partner.description && (
                        <p className="text-sm text-slate-400 mt-3 max-w-2xl">
                          {partner.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          updatePartner(partner._id, {
                            profileVisibility:
                              partner.profileVisibility === "PUBLIC"
                                ? "PRIVATE"
                                : "PUBLIC",
                          })
                        }
                        className="rounded-lg bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 text-sm"
                      >
                        {partner.profileVisibility === "PUBLIC"
                          ? "Make Private"
                          : "Make Public"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updatePartner(partner._id, {
                            trustLevel:
                              partner.trustLevel === "FEATURED_PARTNER"
                                ? "APPROVED_PARTNER"
                                : "FEATURED_PARTNER",
                          })
                        }
                        className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 text-sm"
                      >
                        {partner.trustLevel === "FEATURED_PARTNER"
                          ? "Unfeature"
                          : "Feature"}
                      </button>
                      {partner.profileVisibility === "PUBLIC" && (
                        <Link
                          href={`/partners/${partner.slug}`}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 text-sm"
                        >
                          View Portfolio
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>

      {editingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-full">
            <div className="flex justify-between items-center p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">Edit Event Proposal</h2>
              <button
                onClick={() => setEditingProposal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar">
              <form
                id="edit-proposal-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const updates = Object.fromEntries(formData.entries());
                  updateProposal(editingProposal, "update", updates);
                }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Event Title</label>
                    <input
                      name="eventTitle"
                      defaultValue={editingProposal.eventTitle}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Organization Name</label>
                    <input
                      name="organizationName"
                      defaultValue={editingProposal.organizationName}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Event Description</label>
                  <textarea
                    name="eventDescription"
                    defaultValue={editingProposal.eventDescription}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white min-h-[120px]"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Contact Name</label>
                    <input
                      name="contactName"
                      defaultValue={editingProposal.contactName}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Contact Email</label>
                    <input
                      type="email"
                      name="contactEmail"
                      defaultValue={editingProposal.contactEmail}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Contact Phone</label>
                    <input
                      name="contactPhone"
                      defaultValue={editingProposal.contactPhone}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Website</label>
                    <input
                      name="website"
                      defaultValue={editingProposal.website}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Event Mode</label>
                    <select
                      name="eventMode"
                      defaultValue={editingProposal.eventMode}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white"
                    >
                      <option value="ONLINE">Online</option>
                      <option value="ONSITE">Onsite</option>
                      <option value="HYBRID">Hybrid</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Preferred Date</label>
                    <input
                      type="date"
                      name="preferredDate"
                      defaultValue={editingProposal.preferredDate ? editingProposal.preferredDate.split('T')[0] : ""}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Expected Students</label>
                    <input
                      type="number"
                      name="expectedStudents"
                      defaultValue={editingProposal.expectedStudents}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white"
                    />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-900">
              <button
                type="button"
                onClick={() => setEditingProposal(null)}
                className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-proposal-form"
                className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 text-sm font-semibold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
