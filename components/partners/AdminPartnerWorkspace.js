"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

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

function label(value) {
  return String(value || "").replaceAll("_", " ");
}

export default function AdminPartnerWorkspace({ onChanged }) {
  const [proposals, setProposals] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [newPartner, setNewPartner] = useState({
    organizationName: "",
    organizationType: "COMPANY",
    partnerRoles: ["ORGANIZER_PARTNER"],
    website: "",
    description: "",
    profileVisibility: "PRIVATE",
  });

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

  const updateProposal = async (proposalId, action) => {
    setMessage("");
    try {
      const res = await fetch(`/api/event-proposals/${proposalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update proposal");
      setMessage("Proposal updated.");
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

  const createPartner = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const res = await fetch("/api/external-organizers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPartner),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create partner");

      setNewPartner({
        organizationName: "",
        organizationType: "COMPANY",
        partnerRoles: ["ORGANIZER_PARTNER"],
        website: "",
        description: "",
        profileVisibility: "PRIVATE",
      });
      setMessage("Partner created.");
      await refreshAll();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const toggleNewPartnerRole = (role) => {
    setNewPartner((prev) => {
      const roles = prev.partnerRoles.includes(role)
        ? prev.partnerRoles.filter((item) => item !== role)
        : [...prev.partnerRoles, role];
      return {
        ...prev,
        partnerRoles: roles.length ? roles : ["ORGANIZER_PARTNER"],
      };
    });
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
            proposals.map((proposal) => (
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
                    {proposal.organizer && (
                      <p className="text-xs text-emerald-300">
                        Partner profile: {proposal.organizer.organizationName}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {proposal.status === "NEW" && (
                      <button
                        type="button"
                        onClick={() => updateProposal(proposal._id, "mark_reviewing")}
                        className="rounded-lg bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 text-sm"
                      >
                        Review
                      </button>
                    )}
                    {!["APPROVED", "CONVERTED_TO_EVENT"].includes(
                      proposal.status
                    ) && (
                      <button
                        type="button"
                        onClick={() => updateProposal(proposal._id, "approve")}
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 text-sm"
                      >
                        Approve Partner
                      </button>
                    )}
                    {proposal.status !== "REJECTED" && (
                      <button
                        type="button"
                        onClick={() => updateProposal(proposal._id, "reject")}
                        className="rounded-lg bg-red-600 hover:bg-red-500 text-white px-3 py-2 text-sm"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_1.4fr] gap-6">
        <form
          onSubmit={createPartner}
          className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4"
        >
          <h2 className="text-xl font-semibold text-white">
            Create Partner Manually
          </h2>
          <input
            required
            value={newPartner.organizationName}
            onChange={(e) =>
              setNewPartner({ ...newPartner, organizationName: e.target.value })
            }
            placeholder="Organization name"
            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white"
          />
          <div className="grid md:grid-cols-2 gap-3">
            <select
              value={newPartner.organizationType}
              onChange={(e) =>
                setNewPartner({ ...newPartner, organizationType: e.target.value })
              }
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
            <select
              value={newPartner.profileVisibility}
              onChange={(e) =>
                setNewPartner({
                  ...newPartner,
                  profileVisibility: e.target.value,
                })
              }
              className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-white"
            >
              <option value="PRIVATE">Private profile</option>
              <option value="PUBLIC">Public profile</option>
            </select>
          </div>
          <input
            value={newPartner.website}
            onChange={(e) =>
              setNewPartner({ ...newPartner, website: e.target.value })
            }
            placeholder="Website"
            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white"
          />
          <textarea
            value={newPartner.description}
            onChange={(e) =>
              setNewPartner({ ...newPartner, description: e.target.value })
            }
            placeholder="Short public description"
            rows={4}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white"
          />
          <div className="grid sm:grid-cols-2 gap-2">
            {ROLE_OPTIONS.map((role) => (
              <label
                key={role}
                className="flex items-center gap-2 rounded-xl bg-slate-950/70 border border-slate-800 p-2 text-xs text-slate-300"
              >
                <input
                  type="checkbox"
                  checked={newPartner.partnerRoles.includes(role)}
                  onChange={() => toggleNewPartnerRole(role)}
                />
                {label(role)}
              </label>
            ))}
          </div>
          <button
            type="submit"
            className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-3 font-bold text-white"
          >
            Create Partner
          </button>
        </form>

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
    </div>
  );
}
