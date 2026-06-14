"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FaEye,
  FaPause,
  FaPlay,
  FaSearch,
  FaStar,
  FaSyncAlt,
} from "react-icons/fa";
import { normalizeImageUrl } from "@/lib/imageUrls";

function label(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
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

function proposalStatusLabel(status) {
  if (status === "REJECTED") return "Declined";
  if (status === "UNDER_REVIEW") return "Under review";
  if (status === "APPROVED") return "Approved partner";
  if (status === "CONVERTED_TO_EVENT") return "Event published";
  return label(status);
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
      proposal.status === "CONVERTED_TO_EVENT",
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
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "APPROVED") {
    return "border-cyan-200 bg-cyan-50 text-cyan-800";
  }
  if (status === "UNDER_REVIEW") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }
  if (["DECLINED", "REJECTED"].includes(status)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === "ARCHIVED") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }
  return "border-[#cfc4ff] bg-[#f4f1ff] text-[#4326e8]";
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
  if (action === "restore" || action === "reopen") return "Proposal restored.";
  if (action === "archive") return "Proposal archived.";
  if (action === "update") return "Proposal updated successfully.";
  return "Proposal updated.";
}

function PartnerLogoPreview({ logoUrl, name, className = "h-16 w-16" }) {
  const image = normalizeImageUrl(logoUrl);

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#d7ddea] bg-white text-lg font-black text-[#4326e8] shadow-sm ${className}`.trim()}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : (
        (name || "P").charAt(0).toUpperCase()
      )}
    </span>
  );
}

export default function AdminPartnerWorkspace({ onChanged }) {
  const [proposals, setProposals] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingProposal, setEditingProposal] = useState(null);
  const [publishingProposal, setPublishingProposal] = useState(null);
  const [proposalFilter, setProposalFilter] = useState("ACTIVE");
  const [partnerSearch, setPartnerSearch] = useState("");
  const [partnerStatusFilter, setPartnerStatusFilter] = useState("ALL");
  const [activePartnerTab, setActivePartnerTab] = useState("proposals");

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
  const activeProposalCount = proposalFilterCounts.ACTIVE || 0;

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

  const filteredPartners = useMemo(() => {
    const needle = partnerSearch.trim().toLowerCase();
    return partners.filter((partner) => {
      const spotlightStatus = partner.spotlightStatus || "OFF";
      const searchable = [
        partner.organizationName,
        partner.contactName,
        partner.contactEmail,
        partner.location,
        partner.verificationStatus,
        partner.profileVisibility,
        partner.trustLevel,
        spotlightStatus,
        partner.spotlightPriority,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (needle && !searchable.includes(needle)) return false;
      if (partnerStatusFilter !== "ALL" && spotlightStatus !== partnerStatusFilter) {
        return false;
      }
      return true;
    });
  }, [partnerSearch, partnerStatusFilter, partners]);

  const clearPartnerFilters = () => {
    setPartnerSearch("");
    setPartnerStatusFilter("ALL");
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
      <div className="rounded-2xl border border-[#e1e7f2] bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActivePartnerTab("proposals")}
            className={`inline-flex min-h-12 items-center gap-2 rounded-xl px-5 text-sm font-black transition ${
              activePartnerTab === "proposals"
                ? "bg-[#4326e8] text-white"
                : "text-[#24314d] hover:bg-[#f8f9fd] hover:text-[#4326e8]"
            }`}
          >
            Partner Proposals
            {activeProposalCount > 0 && (
              <span
                className={`inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
                  activePartnerTab === "proposals"
                    ? "bg-white text-[#4326e8]"
                    : "bg-red-500 text-white"
                }`}
              >
                {activeProposalCount > 99 ? "99+" : activeProposalCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActivePartnerTab("spotlight")}
            className={`inline-flex min-h-12 items-center rounded-xl px-5 text-sm font-black transition ${
              activePartnerTab === "spotlight"
                ? "bg-[#4326e8] text-white"
                : "text-[#24314d] hover:bg-[#f8f9fd] hover:text-[#4326e8]"
            }`}
          >
            Partner Spotlight
          </button>
        </div>
      </div>

      {message && (
        <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {message}
        </p>
      )}

      {activePartnerTab === "proposals" && (
      <div className="rounded-2xl border border-[#e1e7f2] bg-white p-6 shadow-[0_14px_34px_rgba(10,47,102,0.08)]">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#001233]">
              Partner Proposals
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#52657d]">
              Review organizer requests, approve partner profiles, and publish
              events only when they are ready.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {PROPOSAL_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setProposalFilter(filter.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                proposalFilter === filter.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-950/20"
                  : "border border-[#d2dcf2] bg-white text-[#4326e8] hover:bg-[#f8f9fd]"
              }`}
            >
              {filter.label} ({proposalFilterCounts[filter.id] || 0})
            </button>
          ))}
        </div>

        <div className="grid gap-4 mt-6">
          {filteredProposals.length === 0 ? (
            <p className="rounded-xl border border-[#e6eaf7] bg-[#f8f9fd] p-6 text-center text-sm font-semibold text-[#52657d]">
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
              const phoneMatchedPartner = partners.find(
                (partner) =>
                  normalizePhone(partner.contactPhone) &&
                  normalizePhone(partner.contactPhone) ===
                    normalizePhone(proposal.contactPhone)
              );
              const resolvedPartner =
                proposal.organizer || emailMatchedPartner || phoneMatchedPartner;
              const isDeclined = ["DECLINED", "REJECTED"].includes(
                proposal.status
              );
              const isPublished = proposal.status === "CONVERTED_TO_EVENT";
              const isArchived = proposal.status === "ARCHIVED";
              const canEditProposal = !isPublished && !isDeclined && !isArchived;
              const canApprovePartner =
                ["NEW", "UNDER_REVIEW"].includes(proposal.status) ||
                (proposal.status === "APPROVED" && !proposal.organizer);
              const canPublishProposal =
                proposal.status === "APPROVED" && !proposal.linkedEvent;
              const canDeclineProposal =
                ["NEW", "UNDER_REVIEW", "APPROVED"].includes(proposal.status) &&
                !proposal.linkedEvent;
              const canRestoreProposal = isDeclined || isArchived;
              const canArchiveProposal = !isArchived;
              const canViewEvent = isPublished && Boolean(proposal.linkedEvent);
              const proposalLogoUrl = proposal.logoUrl || resolvedPartner?.logoUrl || "";

              return (
                <article
                  key={proposal._id}
                  className="rounded-xl border border-[#e1e7f2] bg-white p-5 shadow-sm transition hover:border-[#cfc4ff] hover:shadow-md"
                >
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="min-w-0 space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-black text-[#001233]">
                          {proposal.eventTitle}
                        </h3>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${proposalStatusClass(
                            proposal.status
                          )}`}
                        >
                          {proposalStatusLabel(proposal.status)}
                        </span>
                        {emailMatchedPartner && !proposal.organizer && (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                            Email match
                          </span>
                        )}
                        {phoneMatchedPartner && !proposal.organizer && (
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-[#0a2f66]">
                            Phone match
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <PartnerLogoPreview
                            logoUrl={proposalLogoUrl}
                            name={proposal.organizationName}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-base font-black text-[#17120a]">
                              {proposal.organizationName}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[#52657d]">
                              {(proposal.proposedRoles || []).map(label).join(", ")}
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="max-w-4xl text-sm leading-6 text-[#344f77]">
                        {proposal.eventDescription}
                      </p>
                      <div className="grid gap-3 rounded-xl border border-[#e6eaf7] bg-[#f8f9fd] p-4 text-xs font-bold text-[#52657d] md:grid-cols-3">
                        <div>
                          <span className="block text-[10px] uppercase text-[#75869b]">Contact</span>
                          {proposal.contactName}
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-[#75869b]">Email</span>
                          {proposal.contactEmail}
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-[#75869b]">Phone</span>
                          {proposal.contactPhone || "Not provided"}
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-[#75869b]">Mode</span>
                          {label(proposal.eventMode)}
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-[#75869b]">Date</span>
                          {formatDate(proposal.preferredDate)}
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-[#75869b]">Grades</span>
                          {proposal.targetGrades?.length
                            ? proposal.targetGrades.join(", ")
                            : "All / not specified"}
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-[#75869b]">Expected Students</span>
                          {proposal.expectedStudents || "N/A"}
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-[#75869b]">Linked Event</span>
                          {proposal.linkedEvent?.title || "Not yet"}
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-[#75869b]">Last Reviewed</span>
                          {formatDate(proposal.reviewedAt)}
                        </div>
                      </div>
                      {resolvedPartner && (
                        <p className="text-xs font-bold text-emerald-700">
                          Partner profile: {resolvedPartner.organizationName}
                          {resolvedPartner.slug ? (
                            <Link
                              href={`/partners/${resolvedPartner.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 underline hover:text-emerald-600"
                            >
                              View portfolio
                            </Link>
                          ) : null}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 xl:items-stretch">
                      {canEditProposal && (
                        <button
                          type="button"
                          onClick={() => setEditingProposal(proposal)}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#4326e8] px-4 text-sm font-black text-white transition hover:bg-[#3217d3]"
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
                          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#d2dcf2] bg-white px-4 text-sm font-black text-[#0a2f66] transition hover:bg-[#f8f9fd]"
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
                          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700"
                        >
                          Approve Partner
                        </button>
                      )}
                      {canPublishProposal && (
                        <button
                          type="button"
                          onClick={() => setPublishingProposal(proposal)}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#0a2f66] px-4 text-sm font-black text-white transition hover:bg-[#123f82]"
                        >
                          Publish Event
                        </button>
                      )}
                      {canViewEvent && (
                        <Link
                          href={`/admin/events/${proposal.linkedEvent._id}/manage`}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#d2dcf2] bg-white px-4 text-sm font-black text-[#0a2f66] transition hover:bg-[#f8f9fd]"
                        >
                          View Event
                        </Link>
                      )}
                      {canDeclineProposal && (
                        <button
                          type="button"
                          onClick={() => updateProposal(proposal, "decline")}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-rose-600 px-4 text-sm font-black text-white transition hover:bg-rose-700"
                        >
                          Decline
                        </button>
                      )}
                      {canRestoreProposal && (
                        <button
                          type="button"
                          onClick={() => updateProposal(proposal, "restore")}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#4326e8] px-4 text-sm font-black text-white transition hover:bg-[#3217d3]"
                        >
                          Restore
                        </button>
                      )}
                      {canArchiveProposal && (
                        <button
                          type="button"
                          onClick={() => updateProposal(proposal, "archive")}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#d2dcf2] bg-white px-4 text-sm font-black text-[#52657d] transition hover:bg-[#f8f9fd]"
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
      )}

      {activePartnerTab === "spotlight" && (
      <div className="space-y-4">
        <div className="rounded-xl border border-[#e6eaf7] bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-black text-[#001233]">
              Partner Spotlight
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#52657d]">
              Control homepage partner spotlight visibility for every partner.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <label className="block min-w-0 lg:flex-1">
              <span className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase text-[#52657d]">
                <FaSearch className="text-[#4326e8]" />
                Search partner
              </span>
              <input
                value={partnerSearch}
                onChange={(event) => setPartnerSearch(event.target.value)}
                placeholder="Search partner, contact, email, status, or location..."
                className="min-h-11 w-full rounded-lg border border-[#d2dcf2] bg-[#f8f9fd] px-4 text-sm font-semibold text-[#24314d] outline-none transition placeholder:text-[#75869b] focus:border-[#4326e8] focus:bg-white focus:ring-4 focus:ring-[#4326e8]/10"
              />
            </label>
            <label className="block min-w-0 lg:w-64">
              <span className="mb-1.5 block text-[10px] font-black uppercase text-[#52657d]">
                Spotlight
              </span>
              <select
                value={partnerStatusFilter}
                onChange={(event) => setPartnerStatusFilter(event.target.value)}
                className="min-h-11 w-full rounded-lg border border-[#d2dcf2] bg-white px-3 text-sm font-bold text-[#24314d] outline-none transition focus:border-[#4326e8] focus:ring-4 focus:ring-[#4326e8]/10"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="OFF">Off</option>
              </select>
            </label>
            <button
              type="button"
              onClick={clearPartnerFilters}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#e6eaf7] px-4 text-sm font-black text-[#0a2f66] transition hover:bg-[#f8f9fd]"
            >
              <FaSyncAlt />
              Clear
            </button>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border border-[#e6eaf7] bg-white shadow-sm">
          {partners.length === 0 ? (
            <div className="p-8 text-center text-sm font-semibold text-[#52657d]">
              No partners created yet.
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="p-8 text-center text-sm font-semibold text-[#52657d]">
              No partners match these filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left text-sm text-[#001233]">
                <thead className="bg-[#f8f9fd] text-xs uppercase text-[#43516a]">
                  <tr>
                    <th className="p-4">Partner</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Spotlight</th>
                    <th className="p-4">Rotation</th>
                    <th className="p-4">Views</th>
                    <th className="p-4">Portfolio</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPartners.map((partner) => {
                    const spotlightStatus = partner.spotlightStatus || "OFF";
                    const spotlightReady = canUsePartnerSpotlight(partner);
                    const priority = partner.spotlightPriority || "STANDARD";
                    const isActive = spotlightStatus === "ACTIVE";
                    const statusClass =
                      spotlightStatus === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700"
                        : spotlightStatus === "PAUSED"
                        ? "bg-[#eaf2ff] text-[#0a2f66]"
                        : "bg-slate-100 text-[#52657d]";

                    return (
                      <tr
                        key={partner._id}
                        className="border-t border-[#e6eaf7] transition hover:bg-[#fbfcff]"
                      >
                        <td className="p-4 font-black text-[#001233]">
                          <div>{partner.organizationName}</div>
                          <div className="mt-1 max-w-xs truncate text-xs font-semibold text-[#52657d]">
                            {partner.location || "Location not listed"}
                          </div>
                          {!spotlightReady && (
                            <div className="mt-1 text-xs font-bold text-amber-700">
                              Verify partner before activating spotlight.
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-semibold">
                          {partner.contactName || "-"}
                        </td>
                        <td className="p-4 font-semibold">
                          {partner.contactEmail || "-"}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusClass}`}
                          >
                            {spotlightStatus}
                          </span>
                        </td>
                        <td className="p-4">
                          <button
                            type="button"
                            disabled={!spotlightReady}
                            onClick={() =>
                              updatePartner(partner._id, {
                                spotlightPriority:
                                  priority === "FEATURED" ? "STANDARD" : "FEATURED",
                                spotlightStatus:
                                  spotlightStatus === "OFF" ? "ACTIVE" : spotlightStatus,
                              })
                            }
                            className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              priority === "FEATURED"
                                ? "bg-[#4326e8] text-white shadow-sm hover:bg-[#3217d3]"
                                : "border border-[#d2dcf2] bg-[#f8f9fd] text-[#4326e8] shadow-sm hover:border-[#4326e8]/35 hover:bg-[#efe9ff]"
                            }`}
                          >
                            <FaStar />
                            {priority === "FEATURED" ? "Featured" : "Standard"}
                          </button>
                        </td>
                        <td className="p-4 text-xs font-bold text-[#52657d]">
                          {partner.spotlightImpressionCount || 0} views
                        </td>
                        <td className="p-4">
                          {partner.profileVisibility === "PUBLIC" ? (
                            <Link
                              href={`/partners/${partner.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d2dcf2] px-4 text-sm font-black text-[#0a2f66] transition hover:bg-[#f8f9fd]"
                            >
                              <FaEye />
                              View
                            </Link>
                          ) : (
                            <span className="text-xs font-bold text-[#52657d]">
                              Private
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end">
                            {isActive ? (
                              <button
                                type="button"
                                disabled={!spotlightReady}
                                onClick={() =>
                                  updatePartner(partner._id, {
                                    spotlightStatus: "PAUSED",
                                    spotlightPriority: "STANDARD",
                                  })
                                }
                                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#efe9ff] px-4 text-sm font-black text-[#4326e8] transition hover:bg-[#e6ddff] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <FaPause />
                                Pause
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={!spotlightReady}
                                onClick={() =>
                                  updatePartner(partner._id, {
                                    spotlightStatus: "ACTIVE",
                                  })
                                }
                                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#4326e8] px-4 text-sm font-black text-white transition hover:bg-[#3217d3] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <FaPlay />
                                Activate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      )}

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
                    <label className="text-xs font-semibold text-slate-400">
                      Partner Logo Link
                    </label>
                    <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
                      <PartnerLogoPreview
                        logoUrl={editingProposal.logoUrl}
                        name={editingProposal.organizationName}
                        className="h-16 w-16"
                      />
                      <div>
                        <input
                          type="url"
                          name="logoUrl"
                          defaultValue={editingProposal.logoUrl || ""}
                          placeholder="https://... or public Google Drive image link"
                          className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white"
                          required
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Required before approval. Use a direct image URL or public Google Drive image link.
                        </p>
                      </div>
                    </div>
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
