"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBullhorn,
  FaEdit,
  FaEye,
  FaPause,
  FaPlay,
  FaPlus,
  FaSave,
  FaTrash,
} from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import PageHeader from "@/components/ui/PageHeader";

const emptyForm = {
  id: "",
  school: "",
  title: "",
  tagline: "",
  placement: "HOME_SPOTLIGHT",
  priority: "STANDARD",
  paymentStatus: "PENDING",
  paidAmount: "",
  paymentReference: "",
  status: "DRAFT",
  startsAt: "",
  endsAt: "",
  destinationUrl: "",
  notes: "",
};

const STATUS_STYLES = {
  ACTIVE: "bg-emerald-500/15 text-emerald-200 border-emerald-500/25",
  DRAFT: "bg-slate-700/80 text-slate-200 border-slate-600",
  PAUSED: "bg-blue-500/15 text-blue-200 border-blue-500/25",
  ARCHIVED: "bg-rose-500/15 text-rose-200 border-rose-500/25",
};

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatPlacement(value) {
  return value === "HOME_SPOTLIGHT" ? "Homepage" : "Schools page";
}

function getCampaignState(campaign) {
  if (campaign.status !== "ACTIVE") return campaign.status;
  return "ACTIVE";
}

export default function SchoolPromotionManager() {
  const [promotions, setPromotions] = useState([]);
  const [schools, setSchools] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [archiveTarget, setArchiveTarget] = useState(null);

  const activePromotions = useMemo(
    () => promotions.filter((promotion) => promotion.status !== "ARCHIVED"),
    [promotions]
  );

  const archivedPromotions = useMemo(
    () => promotions.filter((promotion) => promotion.status === "ARCHIVED"),
    [promotions]
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/school-promotions", {
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          payload.message || "Failed to load school spotlights"
        );
      }

      setPromotions(Array.isArray(payload.promotions) ? payload.promotions : []);
      setSchools(Array.isArray(payload.schools) ? payload.schools : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load school spotlights");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setForm(emptyForm);
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const startEdit = (promotion) => {
    setError("");
    setSuccess("");
    setForm({
      id: promotion.id,
      school: promotion.school?.id || "",
      title: promotion.title || "",
      tagline: promotion.tagline || "",
      placement: promotion.placement || "HOME_SPOTLIGHT",
      priority: promotion.priority || "STANDARD",
      paymentStatus: promotion.paymentStatus || "PENDING",
      paidAmount: promotion.paidAmount || "",
      paymentReference: promotion.paymentReference || "",
      status: promotion.status === "ARCHIVED" ? "PAUSED" : promotion.status,
      startsAt: toDateInputValue(promotion.startsAt),
      endsAt: toDateInputValue(promotion.endsAt),
      destinationUrl: promotion.destinationUrl || "",
      notes: promotion.notes || "",
    });
  };

  const savePromotion = async (nextStatus = form.status) => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const url = form.id
        ? `/api/admin/school-promotions/${form.id}`
        : "/api/admin/school-promotions";
      const method = form.id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: nextStatus }),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to save school spotlight");
      }

      setSuccess(payload.message || "School spotlight saved");
      resetForm();
      await loadData();
    } catch (saveError) {
      setError(saveError.message || "Failed to save school spotlight");
    } finally {
      setSaving(false);
    }
  };

  const archivePromotion = async (promotionId) => {
    try {
      setBusyId(promotionId);
      setError("");
      setSuccess("");

      const res = await fetch(`/api/admin/school-promotions/${promotionId}`, {
        method: "DELETE",
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to archive spotlight");
      }

      setSuccess(payload.message || "School spotlight archived");
      setArchiveTarget(null);
      if (form.id === promotionId) resetForm();
      await loadData();
    } catch (archiveError) {
      setError(archiveError.message || "Failed to archive spotlight");
      setArchiveTarget(null);
    } finally {
      setBusyId("");
    }
  };

  const quickStatus = async (promotion, nextStatus) => {
    const startsAt = toDateInputValue(promotion.startsAt);
    const endsAt = toDateInputValue(promotion.endsAt);
    setForm({
      id: promotion.id,
      school: promotion.school?.id || "",
      title: promotion.title || "",
      tagline: promotion.tagline || "",
      placement: promotion.placement || "HOME_SPOTLIGHT",
      priority: promotion.priority || "STANDARD",
      paymentStatus: promotion.paymentStatus || "PENDING",
      paidAmount: promotion.paidAmount || "",
      paymentReference: promotion.paymentReference || "",
      status: nextStatus,
      startsAt,
      endsAt,
      destinationUrl: promotion.destinationUrl || "",
      notes: promotion.notes || "",
    });

    try {
      setBusyId(promotion.id);
      setError("");
      setSuccess("");

      const res = await fetch(`/api/admin/school-promotions/${promotion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school: promotion.school?.id,
          title: promotion.title,
          tagline: promotion.tagline,
          placement: promotion.placement,
          priority: promotion.priority,
          paymentStatus: promotion.paymentStatus,
          paidAmount: promotion.paidAmount,
          paymentReference: promotion.paymentReference,
          status: nextStatus,
          startsAt,
          endsAt,
          destinationUrl: promotion.destinationUrl,
          notes: promotion.notes,
        }),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to update spotlight status");
      }

      setSuccess(payload.message || "School spotlight status updated");
      resetForm();
      await loadData();
    } catch (statusError) {
      setError(statusError.message || "Failed to update spotlight status");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FaBullhorn}
        eyebrow="School recognition"
        title="School Spotlight"
        description="Choose which school profiles are highlighted on public pages. Active spotlights rotate separately from the regular school directory."
      />

      {error && (
        <AlertBanner type="error" title="Spotlight action failed" message={error} />
      )}
      {success && (
        <AlertBanner type="success" title="Spotlight updated" message={success} />
      )}

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-white">
                {form.id ? "Edit School Spotlight" : "Create School Spotlight"}
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Choose the school and decide where its spotlight appears.
              </p>
            </div>
            {form.id && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
              >
                <FaPlus /> New
              </button>
            )}
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-200">
                School
              </span>
              <select
                value={form.school}
                onChange={(event) => updateForm("school", event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              >
                <option value="">Select school</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                    {school.location ? ` - ${school.location}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">
                  Placement
                </span>
                <select
                  value={form.placement}
                  onChange={(event) =>
                    updateForm("placement", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                >
                  <option value="HOME_SPOTLIGHT">Homepage spotlight</option>
                  <option value="SCHOOLS_SPOTLIGHT">Schools page spotlight</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">
                  Priority
                </span>
                <select
                  value={form.priority}
                  onChange={(event) => updateForm("priority", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                >
                  <option value="STANDARD">Standard rotation</option>
                  <option value="PREMIUM">Featured rotation</option>
                </select>
              </label>
            </div>

            <input
              type="text"
              value={form.destinationUrl}
              onChange={(event) =>
                updateForm("destinationUrl", event.target.value)
              }
              placeholder="Optional destination URL. Empty opens the school profile."
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500"
            />

            <textarea
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
              placeholder="Internal note"
              className="min-h-[90px] w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500"
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => savePromotion("DRAFT")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-600 disabled:opacity-60"
              >
                <FaSave />
                Save draft
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => savePromotion("PAUSED")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500/15 px-5 py-3 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/25 disabled:opacity-60"
              >
                <FaPause />
                Save paused
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => savePromotion("ACTIVE")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
              >
                <FaPlay />
                Activate
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-white">
                  Active Spotlight Board
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Active school spotlights. Rotation is based on priority and least
                  recently shown.
                </p>
              </div>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-sm font-bold text-slate-200">
                {activePromotions.length}
              </span>
            </div>

            {loading ? (
              <LoadingState
                title="Loading school spotlights"
                message="Preparing school spotlight records."
              />
            ) : activePromotions.length === 0 ? (
              <EmptyState
                icon={FaBullhorn}
                title="No school spotlights yet"
                description="Choose a school and activate it when it should appear in the public spotlight area."
              />
            ) : (
              <div className="space-y-4">
                {activePromotions.map((promotion) => {
                  const currentState = getCampaignState(promotion);
                  return (
                    <article
                      key={promotion.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${
                                STATUS_STYLES[promotion.status] ||
                                STATUS_STYLES.DRAFT
                              }`}
                            >
                              {currentState}
                            </span>
                            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-bold text-slate-200">
                              {formatPlacement(promotion.placement)}
                            </span>
                            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-100">
                              {promotion.priority}
                            </span>
                          </div>
                          <h4 className="mt-3 text-lg font-black text-white">
                            {promotion.title ||
                              promotion.school?.name ||
                              "School Spotlight"}
                          </h4>
                          <p className="mt-1 text-sm text-slate-400">
                            {promotion.school?.name || "School"}{" "}
                            {promotion.school?.location
                              ? `- ${promotion.school.location}`
                              : ""}
                          </p>
                          <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                            <span>
                              Views: {promotion.impressionCount || 0} | Clicks:{" "}
                              {promotion.clickCount || 0}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(promotion)}
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
                          >
                            <FaEdit /> Edit
                          </button>
                          {promotion.status === "ACTIVE" ? (
                            <button
                              type="button"
                              disabled={busyId === promotion.id}
                              onClick={() => quickStatus(promotion, "PAUSED")}
                              className="inline-flex items-center gap-2 rounded-lg bg-blue-500/15 px-3 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/25 disabled:opacity-60"
                            >
                              <FaPause /> Pause
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === promotion.id}
                              onClick={() => quickStatus(promotion, "ACTIVE")}
                              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                            >
                              <FaPlay /> Activate
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyId === promotion.id}
                            onClick={() => setArchiveTarget(promotion)}
                            className="inline-flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                          >
                            <FaTrash /> Archive
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {archivedPromotions.length > 0 && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h3 className="text-lg font-bold text-white">
                Archived Campaigns ({archivedPromotions.length})
              </h3>
              <div className="mt-4 space-y-3">
                {archivedPromotions.slice(0, 5).map((promotion) => (
                  <div
                    key={promotion.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-200">
                        {promotion.title || promotion.school?.name || "Spotlight"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatPlacement(promotion.placement)} |{" "}
                        {promotion.school?.name || "School"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(promotion)}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
                    >
                      <FaEye /> Review
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive this spotlight campaign?"
        message={
          archiveTarget
            ? `"${archiveTarget.title || archiveTarget.school?.name}" will stop appearing in public spotlight areas. Historical views and clicks stay saved.`
            : ""
        }
        confirmLabel="Archive campaign"
        tone="danger"
        busy={Boolean(archiveTarget && busyId === archiveTarget.id)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (archiveTarget?.id) archivePromotion(archiveTarget.id);
        }}
      />
    </div>
  );
}
