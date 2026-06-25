"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FaExchangeAlt, FaSchool, FaSpinner } from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";
import SchoolLogoMark from "@/components/public/SchoolLogoMark";

function uniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

const STATUS_COPY = {
  PENDING_RELEASE: "Waiting for your current school to approve release.",
  RELEASED: "Release approved. Choose the school you are joining.",
  PENDING_ADMISSION: "Waiting for the selected school to approve admission.",
  COMPLETED: "Transfer completed.",
  REJECTED: "Transfer rejected.",
  CANCELLED: "Transfer cancelled.",
};

export default function StudentTransferRequestPanel() {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [data, setData] = useState(null);
  const [reason, setReason] = useState("");
  const [submittingSchoolId, setSubmittingSchoolId] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [feedback, setFeedback] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/transfer", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load transfer status");
      setData(json.data);
    } catch (error) {
      setFeedback({
        type: "error",
        title: "Transfer unavailable",
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const transfer = data?.transfer;
  const schools = useMemo(() => data?.schools || [], [data?.schools]);
  const statusText = STATUS_COPY[transfer?.status] || "No active transfer request.";

  const canRequest = !transfer;
  const canSelectSchool = transfer?.status === "RELEASED";
  const canCancel = ["PENDING_RELEASE", "RELEASED", "PENDING_ADMISSION", "PENDING"].includes(
    transfer?.status
  );

  const provinces = useMemo(
    () => uniqueSorted(schools.map((school) => school.province)),
    [schools]
  );

  const districts = useMemo(
    () =>
      uniqueSorted(
        schools
          .filter((school) => !provinceFilter || school.province === provinceFilter)
          .map((school) => school.district)
      ),
    [schools, provinceFilter]
  );

  const filteredSchools = useMemo(() => {
    const query = nameQuery.trim().toLowerCase();
    return schools.filter((school) => {
      if (provinceFilter && school.province !== provinceFilter) return false;
      if (districtFilter && school.district !== districtFilter) return false;
      if (query && !school.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [schools, provinceFilter, districtFilter, nameQuery]);

  const requestTransfer = async () => {
    try {
      setWorking(true);
      setFeedback(null);
      const res = await fetch("/api/student/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to request transfer");
      setData(json.data);
      setReason("");
      setFeedback({
        type: "success",
        title: "Transfer requested",
        message: json.message,
      });
    } catch (error) {
      setFeedback({ type: "error", title: "Request failed", message: error.message });
    } finally {
      setWorking(false);
    }
  };

  const selectDestination = async (schoolId) => {
    if (!schoolId) return;
    try {
      setWorking(true);
      setSubmittingSchoolId(schoolId);
      setFeedback(null);
      const res = await fetch("/api/student/transfer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "select_school", toSchool: schoolId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to select school");
      setData(json.data);
      setFeedback({
        type: "success",
        title: "Admission requested",
        message: json.message,
      });
    } catch (error) {
      setFeedback({ type: "error", title: "Selection failed", message: error.message });
    } finally {
      setWorking(false);
      setSubmittingSchoolId("");
    }
  };

  const cancelTransfer = async () => {
    try {
      setWorking(true);
      setFeedback(null);
      const res = await fetch("/api/student/transfer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to cancel transfer");
      setData(json.data);
      setFeedback({ type: "success", title: "Transfer cancelled", message: json.message });
    } catch (error) {
      setFeedback({ type: "error", title: "Cancel failed", message: error.message });
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[#e1e7f2] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]">
            <FaExchangeAlt />
          </span>
          <div>
            <h2 className="text-lg font-black text-[#17120a]">Take Transfer</h2>
            <p className="mt-1 text-sm leading-6 text-[#52657d]">
              Request release from your current school, then choose your next
              registered school after the transfer code is issued.
            </p>
          </div>
        </div>
        {loading && <FaSpinner className="animate-spin text-[#52657d]" />}
      </div>

      {feedback && (
        <div className="mt-4">
          <AlertBanner type={feedback.type} title={feedback.title} message={feedback.message} />
        </div>
      )}

      {!loading && (
        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <div className="rounded-xl border border-[#e1e7f2] bg-[#f8fbff] p-4">
              <p className="text-xs font-black uppercase text-[#52657d]">
                Current Status
              </p>
              <p className="mt-2 text-base font-black text-[#17120a]">
                {transfer ? transfer.status.replaceAll("_", " ") : "No request"}
              </p>
              <p className="mt-1 text-sm leading-6 text-[#52657d]">{statusText}</p>

              {transfer?.transferCode && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-black uppercase text-emerald-800">
                    Transfer Code
                  </p>
                  <p className="mt-1 text-2xl font-black tracking-wide text-emerald-900">
                    {transfer.transferCode}
                  </p>
                </div>
              )}

              {transfer?.toSchool && (
                <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#27344a]">
                  <FaSchool className="text-[#52657d]" />
                  Selected school: {transfer.toSchool.name}
                </p>
              )}
            </div>

            {canRequest && (
              <div className="rounded-xl border border-[#e1e7f2] bg-white p-4 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-black text-[#27344a]">
                    Reason
                  </span>
                  <textarea
                    value={reason}
                    maxLength={500}
                    onChange={(e) => setReason(e.target.value)}
                    className="min-h-24 w-full rounded-xl border border-[#dbe5f4] bg-white px-3 py-2 text-sm outline-none"
                    placeholder="Optional reason for transfer"
                  />
                </label>
                <button
                  type="button"
                  disabled={working}
                  onClick={requestTransfer}
                  className="inline-flex w-full min-h-10 items-center justify-center rounded-xl bg-purple-700 px-4 text-sm font-black text-white hover:bg-purple-800 disabled:opacity-50"
                >
                  Request Transfer
                </button>
              </div>
            )}

            {canSelectSchool && (
              <div className="rounded-xl border border-[#e1e7f2] bg-white p-4 space-y-3">
                <p className="text-xs font-black uppercase text-[#52657d]">
                  Choose the school you are joining
                </p>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-black text-[#27344a]">
                      Province
                    </span>
                    <select
                      value={provinceFilter}
                      onChange={(e) => {
                        setProvinceFilter(e.target.value);
                        setDistrictFilter("");
                      }}
                      className="h-11 w-full rounded-xl border border-[#dbe5f4] bg-white px-3 text-sm font-bold text-[#17120a]"
                    >
                      <option value="">All provinces</option>
                      {provinces.map((province) => (
                        <option key={province} value={province}>
                          {province}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-black text-[#27344a]">
                      District
                    </span>
                    <select
                      value={districtFilter}
                      onChange={(e) => setDistrictFilter(e.target.value)}
                      className="h-11 w-full rounded-xl border border-[#dbe5f4] bg-white px-3 text-sm font-bold text-[#17120a]"
                    >
                      <option value="">All districts</option>
                      {districts.map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1 block text-xs font-black text-[#27344a]">
                    Search by school name
                  </span>
                  <input
                    value={nameQuery}
                    onChange={(e) => setNameQuery(e.target.value)}
                    placeholder="Type a school name"
                    className="h-11 w-full rounded-xl border border-[#dbe5f4] bg-white px-3 text-sm font-semibold text-[#17120a] outline-none"
                  />
                </label>

                <div>
                  <span className="mb-2 block text-xs font-black text-[#27344a]">
                    School you are joining
                  </span>
                  {filteredSchools.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[#dbe5f4] bg-[#f8fbff] px-3 py-6 text-center text-sm font-semibold text-[#75869b]">
                      No schools match your filters.
                    </p>
                  ) : (
                    <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
                      {filteredSchools.map((school) => {
                        const location = [school.district, school.province]
                          .filter(Boolean)
                          .join(", ") || school.location;
                        const isSubmitting = submittingSchoolId === school.id;
                        return (
                          <li
                            key={school.id}
                            className="flex items-center gap-3 rounded-xl border border-[#e1e7f2] bg-white p-3"
                          >
                            <SchoolLogoMark
                              imageUrl={school.logoUrl}
                              name={school.name}
                              className="h-11 w-11"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black text-[#17120a]">
                                {school.name}
                              </p>
                              {location && (
                                <p className="truncate text-xs font-semibold text-[#52657d]">
                                  {location}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              disabled={working}
                              onClick={() => selectDestination(school.id)}
                              className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg bg-purple-700 px-3 text-xs font-black text-white hover:bg-purple-800 disabled:opacity-50"
                            >
                              {isSubmitting && (
                                <FaSpinner className="animate-spin" />
                              )}
                              Request Admission
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {!canRequest && !canSelectSchool && (
              <div className="rounded-xl border border-[#e1e7f2] bg-white p-4">
                <p className="text-sm leading-6 text-[#52657d]">
                  Your transfer request is being processed. Check this section for
                  updates.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#e1e7f2] bg-white p-4">
            {canCancel ? (
              <button
                type="button"
                disabled={working}
                onClick={cancelTransfer}
                className="inline-flex w-full min-h-10 items-center justify-center rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                Cancel Request
              </button>
            ) : (
              <p className="text-sm leading-6 text-[#52657d]">
                No active request to cancel.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
