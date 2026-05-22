"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

function label(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function dateInputValue(value) {
  if (!value) return "";
  return String(value).split("T")[0];
}

function canUsePartnerSpotlight(partner) {
  return partner.verificationStatus === "VERIFIED";
}

function spotlightLabel(status) {
  if (status === "ACTIVE") return "Active";
  if (status === "PAUSED") return "Paused";
  return "Off";
}

function proposalStatusLabel(status) {
  if (status === "REJECTED") return "Declined";
  if (status === "UNDER_REVIEW") return "Under review";
  if (status === "CONVERTED_TO_EVENT") return "Event published";
  return label(status);
}

function partnerStatusSummary(partner) {
  const verification =
    partner.verificationStatus === "VERIFIED"
      ? "Approved"
      : label(partner.verificationStatus || "Pending");
  const visibility =
    partner.profileVisibility === "PUBLIC"
      ? "Public portfolio"
      : "Private portfolio";
  const trust =
    partner.trustLevel === "FEATURED_PARTNER"
      ? "Featured partner"
      : partner.trustLevel === "APPROVED_PARTNER"
      ? "Standard partner"
      : "Request only";

  return `${verification} - ${visibility} - ${trust}`;
}

const PROPOSAL_FILTERS = [
  {
    id: "ACTIVE",
    label: "Active Work",
    matches: (proposal) =>
      ["NEW", "UNDER_REVIEW", "APPROVED"].includes(proposal.status),
  },
  {
    id: "PUBLISHED",
    label: "Published",
    matches: (proposal) =>
      proposal.status !== "ARCHIVED" &&
      (proposal.status === "CONVERTED_TO_EVENT" || Boolean(proposal.linkedEvent)),
  },
  {
    id: "DECLINED",
    label: "Declined",
    matches: (proposal) =>
      ["DECLINED", "REJECTED"].includes(proposal.status) &&
      proposal.status !== "ARCHIVED",
  },
  {
    id: "ARCHIVED",
    label: "Archived",
    matches: (proposal) => proposal.status === "ARCHIVED",
  },
  {
    id: "ALL",
    label: "All",
    matches: () => true,
  },
];

const ORGANIZATION_TYPES = ["COMPANY", "ACADEMY", "NGO", "INDIVIDUAL", "OTHER"];

const PROPOSAL_ROLE_OPTIONS = [
  "ORGANIZER_PARTNER",
  "CHALLENGE_PARTNER",
  "SPONSOR",
  "VENUE_PARTNER",
  "MENTOR_PARTNER",
  "MEDIA_PARTNER",
  "PRESENTED_BY",
  "OTHER",
];

const EVENT_MODES = ["UNDECIDED", "ONLINE", "ONSITE", "HYBRID"];

function proposalStatusClass(status) {
  if (status === "CONVERTED_TO_EVENT") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  }
  if (status === "APPROVED") {
    return "border-cyan-500/25 bg-cyan-500/10 text-cyan-300";
  }
  if (status === "UNDER_REVIEW") {
    return "border-blue-500/25 bg-blue-500/10 text-blue-300";
  }
  if (["DECLINED", "REJECTED"].includes(status)) {
    return "border-rose-500/25 bg-rose-500/10 text-rose-300";
  }
  if (status === "ARCHIVED") {
    return "border-slate-700 bg-slate-900 text-slate-400";
  }
  return "border-amber-500/25 bg-amber-500/10 text-amber-300";
}

function proposalActionMessage(action) {
  if (action === "mark_reviewing") return "Proposal moved to review.";
  if (action === "approve_partner" || action === "approve") {
    return "Partner approved. You can publish the event when ready.";
  }
  if (action === "publish_event") {
    return "Platform event published from this proposal.";
  }
  if (action === "decline" || action === "reject") return "Proposal declined.";
  if (action === "reopen") return "Proposal reopened for review.";
  if (action === "archive") return "Proposal archived.";
  if (action === "update") return "Proposal updated successfully.";
  return "Proposal updated.";
}

export default function AdminPartnerWorkspace({ onChanged }) {
  const [proposals, setProposals] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingProposal, setEditingProposal] = useState(null);
  const [publishingProposal, setPublishingProposal] = useState(null);
  const [proposalFilter, setProposalFilter] = useState("ACTIVE");

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

      const res = await fetch(`/api/event-proposals/${proposal._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update proposal");
      setMessage(proposalActionMessage(action));
      setEditingProposal(null);
      setPublishingProposal(null);
      await refreshAll();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const selectedProposalFilter =
    PROPOSAL_FILTERS.find((filter) => filter.id === proposalFilter) ||
    PROPOSAL_FILTERS[0];
  const filteredProposals = proposals.filter(selectedProposalFilter.matches);
  const proposalFilterCounts = Object.fromEntries(
    PROPOSAL_FILTERS.map((filter) => [
      filter.id,
      proposals.filter(filter.matches).length,
    ])
  );

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

  const handleEditProposalSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const updates = Object.fromEntries(formData.entries());

    updates.proposedRoles = formData.getAll("proposedRoles").filter(Boolean);
    updates.targetGrades = String(updates.targetGrades || "")
      .split(",")
      .map((grade) => grade.trim())
      .filter(Boolean);
    updates.preferredDate = updates.preferredDate || null;
    updates.expectedStudents = updates.expectedStudents || null;
    updates.expectedSchools = updates.expectedSchools || null;

    updateProposal(editingProposal, "update", updates);
  };

  const handlePublishProposalSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    payload.registrationDeadline = payload.registrationDeadline || null;

    updateProposal(publishingProposal, "publish_event", payload);
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
              Review organizer requests, approve partner profiles, and publish
              events only when they are ready.
            </p>
          </div>
        </div>

        {message && <p className="text-sm text-emerald-300 mt-4">{message}</p>}

        <div className="mt-6 flex flex-wrap gap-2">
          {PROPOSAL_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setProposalFilter(filter.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                proposalFilter === filter.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-950/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {filter.label} ({proposalFilterCounts[filter.id] || 0})
            </button>
          ))}
        </div>

        <div className="grid gap-4 mt-6">
          {filteredProposals.length === 0 ? (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-slate-500">
              No partner proposals in this view.
            </p>
          ) : (
            filteredProposals.map((proposal) => {
              const emailMatchedPartner = partners.find(
                (partner) =>
                  normalizeEmail(partner.contactEmail) &&
                  normalizeEmail(partner.contactEmail) ===
                    normalizeEmail(proposal.contactEmail)
              );
              const resolvedPartner = proposal.organizer || emailMatchedPartner;
              const isDeclined = ["DECLINED", "REJECTED"].includes(
                proposal.status
              );
              const isPublished =
                proposal.status === "CONVERTED_TO_EVENT" ||
                Boolean(proposal.linkedEvent);
              const isArchived = proposal.status === "ARCHIVED";
              const canEditProposal = !isPublished && !isArchived;
              const canApprovePartner =
                ["NEW", "UNDER_REVIEW"].includes(proposal.status) ||
                (proposal.status === "APPROVED" && !proposal.organizer);
              const canPublishProposal =
                proposal.status === "APPROVED" && !proposal.linkedEvent;
              const canDeclineProposal =
                ["NEW", "UNDER_REVIEW", "APPROVED"].includes(proposal.status) &&
                !proposal.linkedEvent;
              const canReopenProposal =
                (isDeclined || isArchived) && !proposal.linkedEvent;
              const canArchiveProposal = !isArchived;

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
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${proposalStatusClass(
                            proposal.status
                          )}`}
                        >
                          {proposalStatusLabel(proposal.status)}
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
                        <div>
                          Last reviewed: {formatDate(proposal.reviewedAt)}
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
                      {canEditProposal && (
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
                      {canApprovePartner && (
                        <button
                          type="button"
                          onClick={() =>
                            updateProposal(proposal, "approve_partner")
                          }
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 text-sm"
                        >
                          Approve Partner
                        </button>
                      )}
                      {canPublishProposal && (
                        <button
                          type="button"
                          onClick={() => setPublishingProposal(proposal)}
                          className="rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-2 text-sm"
                        >
                          Publish Event
                        </button>
                      )}
                      {proposal.linkedEvent && (
                        <Link
                          href={`/admin/events/${proposal.linkedEvent._id}/manage`}
                          className="rounded-lg bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 text-sm"
                        >
                          View Event
                        </Link>
                      )}
                      {canDeclineProposal && (
                        <button
                          type="button"
                          onClick={() => updateProposal(proposal, "decline")}
                          className="rounded-lg bg-red-600 hover:bg-red-500 text-white px-3 py-2 text-sm"
                        >
                          Decline
                        </button>
                      )}
                      {canReopenProposal && (
                        <button
                          type="button"
                          onClick={() => updateProposal(proposal, "reopen")}
                          className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 text-sm"
                        >
                          Reopen
                        </button>
                      )}
                      {canArchiveProposal && (
                        <button
                          type="button"
                          onClick={() => updateProposal(proposal, "archive")}
                          className="rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 text-sm"
                        >
                          Archive
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
            Partner Profiles
          </h2>
          <div className="grid gap-4">
            {partners.length === 0 ? (
              <p className="text-slate-500 italic">No partners created yet.</p>
            ) : (
              partners.map((partner) => {
                const spotlightStatus = partner.spotlightStatus || "OFF";
                const spotlightReady = canUsePartnerSpotlight(partner);
                const nextSpotlightStatus =
                  spotlightStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";

                return (
                  <article
                    key={partner._id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-white">
                            {partner.organizationName}
                          </h3>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              spotlightStatus === "ACTIVE"
                                ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                                : spotlightStatus === "PAUSED"
                                ? "border border-amber-500/25 bg-amber-500/10 text-amber-300"
                                : "border border-slate-700 bg-slate-900 text-slate-400"
                            }`}
                          >
                            Homepage {spotlightLabel(spotlightStatus)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">
                          {(partner.partnerRoles || []).map(label).join(", ")}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          {partnerStatusSummary(partner)}
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
                          onClick={() => {
                            const nextVisibility =
                              partner.profileVisibility === "PUBLIC"
                                ? "PRIVATE"
                                : "PUBLIC";
                            updatePartner(partner._id, {
                              profileVisibility: nextVisibility,
                            });
                          }}
                          className="rounded-lg bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 text-sm"
                        >
                          {partner.profileVisibility === "PUBLIC"
                            ? "Hide Portfolio"
                            : "Show Portfolio"}
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
                            ? "Standard Partner"
                            : "Featured Partner"}
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

                    <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white">
                            Homepage Spotlight
                          </h4>
                          <p className="mt-1 text-xs leading-5 text-slate-400">
                            Show this approved partner in the homepage partner
                            panel. Public portfolio and active event connection
                            are separate optional settings.
                          </p>
                          {!spotlightReady && (
                            <p className="mt-2 text-xs text-amber-300">
                              Approve this partner before showing it on the
                              homepage.
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <select
                            value={partner.spotlightPriority || "STANDARD"}
                            disabled={!spotlightReady}
                            onChange={(event) =>
                              updatePartner(partner._id, {
                                spotlightPriority: event.target.value,
                              })
                            }
                            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="STANDARD">Normal visibility</option>
                            <option value="FEATURED">Priority visibility</option>
                          </select>
                          <button
                            type="button"
                            disabled={!spotlightReady}
                            onClick={() =>
                              updatePartner(partner._id, {
                                spotlightStatus: nextSpotlightStatus,
                              })
                            }
                            className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                          >
                            {spotlightStatus === "ACTIVE"
                              ? "Pause Homepage"
                              : spotlightStatus === "PAUSED"
                              ? "Resume Homepage"
                              : "Show on Homepage"}
                          </button>
                          {spotlightStatus !== "OFF" && (
                            <button
                              type="button"
                              onClick={() =>
                                updatePartner(partner._id, {
                                  spotlightStatus: "OFF",
                                })
                              }
                              className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
                            >
                              Remove from Homepage
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
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
                className="rounded-full px-3 py-1 text-[0px] text-slate-400 after:text-sm after:content-['x'] hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar">
              <form
                id="edit-proposal-form"
                onSubmit={handleEditProposalSubmit}
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Organization Type</label>
                    <select
                      name="organizationType"
                      defaultValue={editingProposal.organizationType || "COMPANY"}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white"
                    >
                      {ORGANIZATION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {label(type)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Partner Role</label>
                    <select
                      name="proposedRoles"
                      defaultValue={
                        editingProposal.proposedRoles?.[0] || "ORGANIZER_PARTNER"
                      }
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white"
                    >
                      {PROPOSAL_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {label(role)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Event Mode</label>
                    <select
                      name="eventMode"
                      defaultValue={editingProposal.eventMode || "UNDECIDED"}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white"
                    >
                      {EVENT_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {label(mode)}
                        </option>
                      ))}
                    </select>
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
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-400">Location</label>
                    <input
                      name="location"
                      defaultValue={editingProposal.location}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Preferred Date</label>
                    <input
                      type="date"
                      name="preferredDate"
                      defaultValue={dateInputValue(editingProposal.preferredDate)}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Expected Schools</label>
                    <input
                      type="number"
                      min="1"
                      name="expectedSchools"
                      defaultValue={editingProposal.expectedSchools || ""}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Expected Students</label>
                    <input
                      type="number"
                      min="1"
                      name="expectedStudents"
                      defaultValue={editingProposal.expectedStudents || ""}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Venue</label>
                    <input
                      name="venue"
                      defaultValue={editingProposal.venue || ""}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Target Grades</label>
                    <input
                      name="targetGrades"
                      defaultValue={(editingProposal.targetGrades || []).join(", ")}
                      placeholder="Grade 6, Grade 7, Grade 8"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Prize / Recognition Details</label>
                    <textarea
                      name="prizeDetails"
                      defaultValue={editingProposal.prizeDetails || ""}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white min-h-[96px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Safety / Operations Notes</label>
                    <textarea
                      name="safetyNotes"
                      defaultValue={editingProposal.safetyNotes || ""}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white min-h-[96px]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Data Access Needs</label>
                  <textarea
                    name="dataAccessNeeds"
                    defaultValue={editingProposal.dataAccessNeeds || ""}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white min-h-[80px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Internal Admin Notes</label>
                  <textarea
                    name="adminNotes"
                    defaultValue={editingProposal.adminNotes || ""}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white min-h-[90px]"
                  />
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

      {publishingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-6">
              <div>
                <h2 className="text-xl font-bold text-white">Publish Platform Event</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Confirm the final public event details before schools can see it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPublishingProposal(null)}
                className="rounded-full px-3 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                x
              </button>
            </div>

            <form
              id="publish-proposal-form"
              onSubmit={handlePublishProposalSubmit}
              className="space-y-5 p-6"
            >
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
                  Ready to publish
                </p>
                <h3 className="mt-2 text-lg font-bold text-white">
                  {publishingProposal.eventTitle}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {publishingProposal.organizationName} will be attached as the
                  event partner. You can still edit the proposal before
                  publishing if anything needs cleanup.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">
                    Event Date
                  </label>
                  <input
                    type="date"
                    name="eventDate"
                    defaultValue={dateInputValue(publishingProposal.preferredDate)}
                    required
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">
                    Registration Deadline
                  </label>
                  <input
                    type="date"
                    name="registrationDeadline"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">
                  Internal Publishing Note
                </label>
                <textarea
                  name="adminNotes"
                  defaultValue={publishingProposal.adminNotes || ""}
                  className="min-h-[90px] w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-white"
                />
              </div>
            </form>

            <div className="flex justify-end gap-3 border-t border-slate-800 bg-slate-900 p-6">
              <button
                type="button"
                onClick={() => setPublishingProposal(null)}
                className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="publish-proposal-form"
                className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
              >
                Publish Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
