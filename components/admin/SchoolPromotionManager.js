"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBullhorn,
  FaPause,
  FaPlay,
  FaSearch,
  FaStar,
  FaSyncAlt,
} from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import PageHeader from "@/components/ui/PageHeader";

const STATUS_STYLES = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  DRAFT: "bg-slate-100 text-[#52657d]",
  PAUSED: "bg-[#eaf2ff] text-[#0a2f66]",
  OFF: "bg-slate-100 text-[#52657d]",
};

const PLACEMENTS = [
  ["HOME_SPOTLIGHT", "Homepage"],
  ["SCHOOLS_SPOTLIGHT", "Schools Page"],
];

function parseSchoolLocation(location = "") {
  const parts = String(location || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const postalIndex = parts.findIndex((part) => /^postal code/i.test(part));
  const cleanParts = postalIndex >= 0 ? parts.slice(0, postalIndex) : parts;

  return {
    province: cleanParts.at(-1) || "",
    district: cleanParts.at(-2) || "",
  };
}

function getSchoolProvince(school) {
  return school.province || parseSchoolLocation(school.location).province;
}

function getSchoolDistrict(school) {
  return school.district || parseSchoolLocation(school.location).district;
}

function getSpotlightState(spotlight) {
  if (!spotlight) return "OFF";
  return spotlight.status;
}

function buildPromotionIndex(promotions, placement) {
  const map = new Map();
  promotions
    .filter((promotion) => promotion.placement === placement)
    .forEach((promotion) => {
      const schoolId = promotion.school?.id;
      if (!schoolId) return;
      const current = map.get(schoolId);
      if (
        !current ||
        new Date(promotion.updatedAt || promotion.createdAt || 0) >
          new Date(current.updatedAt || current.createdAt || 0)
      ) {
        map.set(schoolId, promotion);
      }
    });
  return map;
}

export default function SchoolPromotionManager() {
  const [promotions, setPromotions] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [schoolProvince, setSchoolProvince] = useState("All Provinces");
  const [schoolDistrict, setSchoolDistrict] = useState("All Districts");
  const [placement, setPlacement] = useState("HOME_SPOTLIGHT");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/school-promotions", {
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to load school spotlights");
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

  const promotionBySchool = useMemo(
    () => buildPromotionIndex(promotions, placement),
    [placement, promotions]
  );

  const provinceOptions = useMemo(
    () => [
      "All Provinces",
      ...new Set(schools.map(getSchoolProvince).filter(Boolean)),
    ],
    [schools]
  );

  const districtOptions = useMemo(() => {
    const scopedSchools =
      schoolProvince === "All Provinces"
        ? schools
        : schools.filter((school) => getSchoolProvince(school) === schoolProvince);
    return [
      "All Districts",
      ...new Set(scopedSchools.map(getSchoolDistrict).filter(Boolean)),
    ];
  }, [schoolProvince, schools]);

  const visibleSchools = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return schools.filter((school) => {
      const promotion = promotionBySchool.get(school.id);
      const spotlightState = getSpotlightState(promotion);
      const searchable = [
        school.name,
        school.principalName,
        school.email,
        school.status,
        school.location,
        getSchoolProvince(school),
        getSchoolDistrict(school),
        spotlightState,
        promotion?.priority,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (needle && !searchable.includes(needle)) return false;
      if (
        schoolProvince !== "All Provinces" &&
        getSchoolProvince(school) !== schoolProvince
      ) {
        return false;
      }
      if (
        schoolDistrict !== "All Districts" &&
        getSchoolDistrict(school) !== schoolDistrict
      ) {
        return false;
      }
      return true;
    });
  }, [promotionBySchool, query, schoolDistrict, schoolProvince, schools]);

  const saveSpotlight = async (school, promotion, updates) => {
    try {
      setBusyId(`${school.id}-${updates.status || updates.priority || "save"}`);
      setError("");
      setSuccess("");

      const nextPayload = {
        school: school.id,
        placement,
        priority: updates.priority || promotion?.priority || "STANDARD",
        status: updates.status || promotion?.status || "ACTIVE",
        destinationUrl: promotion?.destinationUrl || "",
        notes: promotion?.notes || "",
      };

      const url = promotion?.id
        ? `/api/admin/school-promotions/${promotion.id}`
        : "/api/admin/school-promotions";
      const method = promotion?.id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextPayload),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to update school spotlight");
      }

      setSuccess(payload.message || "School spotlight updated");
      await loadData();
    } catch (saveError) {
      setError(saveError.message || "Failed to update school spotlight");
    } finally {
      setBusyId("");
    }
  };

  const clearFilters = () => {
    setQuery("");
    setSchoolProvince("All Provinces");
    setSchoolDistrict("All Districts");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FaBullhorn}
        eyebrow="School recognition"
        title="School Spotlight"
        description="Feature schools in public spotlight areas. This is free while the platform is in pilot."
      />

      {error && (
        <AlertBanner type="error" title="Spotlight action failed" message={error} />
      )}
      {success && (
        <AlertBanner type="success" title="Spotlight updated" message={success} />
      )}

      <section className="rounded-xl border border-[#e6eaf7] bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          {PLACEMENTS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPlacement(key)}
              className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-black transition ${
                placement === key
                  ? "bg-[#1f4e79] text-white"
                  : "border border-[#e6eaf7] text-[#24314d] hover:bg-[#f8f9fd]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="block min-w-0 lg:flex-1">
            <span className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase text-[#52657d]">
              <FaSearch className="text-[#1f4e79]" />
              Search school
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search school, principal, email, status, or location..."
              className="min-h-11 w-full rounded-lg border border-[#d2dcf2] bg-[#f8f9fd] px-4 text-sm font-semibold text-[#24314d] outline-none transition placeholder:text-[#75869b] focus:border-[#1f4e79] focus:bg-white focus:ring-4 focus:ring-[#1f4e79]/10"
            />
          </label>
          <label className="block min-w-0 lg:w-72">
            <span className="mb-1.5 block text-[10px] font-black uppercase text-[#52657d]">
              Province
            </span>
            <select
              value={schoolProvince}
              onChange={(event) => {
                setSchoolProvince(event.target.value);
                setSchoolDistrict("All Districts");
              }}
              className="min-h-11 w-full rounded-lg border border-[#d2dcf2] bg-white px-3 text-sm font-bold text-[#24314d] outline-none transition focus:border-[#1f4e79] focus:ring-4 focus:ring-[#1f4e79]/10"
            >
              {provinceOptions.map((province) => (
                <option key={province}>{province}</option>
              ))}
            </select>
          </label>
          <label className="block min-w-0 lg:w-72">
            <span className="mb-1.5 block text-[10px] font-black uppercase text-[#52657d]">
              District
            </span>
            <select
              value={schoolDistrict}
              onChange={(event) => setSchoolDistrict(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-[#d2dcf2] bg-white px-3 text-sm font-bold text-[#24314d] outline-none transition focus:border-[#1f4e79] focus:ring-4 focus:ring-[#1f4e79]/10"
            >
              {districtOptions.map((district) => (
                <option key={district}>{district}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#e6eaf7] px-4 text-sm font-black text-[#0a2f66] transition hover:bg-[#f8f9fd]"
          >
            <FaSyncAlt />
            Clear
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#e6eaf7] bg-white shadow-sm">
        {loading ? (
          <LoadingState
            title="Loading schools"
            message="Preparing school spotlight controls."
          />
        ) : visibleSchools.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={FaBullhorn}
              title="No schools found"
              description="Adjust the search or location filters to see schools."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm text-[#001233]">
              <thead className="bg-[#f8f9fd] text-xs uppercase text-[#43516a]">
                <tr>
                  <th className="p-4">School Name</th>
                  <th className="p-4">Principal</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Spotlight</th>
                  <th className="p-4">Rotation</th>
                  <th className="p-4">Views / Clicks</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleSchools.map((school) => {
                  const promotion = promotionBySchool.get(school.id);
                  const state = getSpotlightState(promotion);
                  const priority = promotion?.priority || "STANDARD";
                  const isActive = state === "ACTIVE";
                  const isBusy = busyId.startsWith(school.id);

                  return (
                    <tr
                      key={school.id}
                      className="border-t border-[#e6eaf7] transition hover:bg-[#fbfcff]"
                    >
                      <td className="p-4 font-black text-[#001233]">
                        <div>{school.name}</div>
                        <div className="mt-1 max-w-xs truncate text-xs font-semibold text-[#52657d]">
                          {school.location || "Location not listed"}
                        </div>
                      </td>
                      <td className="p-4 font-semibold">
                        {school.principalName || "-"}
                      </td>
                      <td className="p-4 font-semibold">{school.email || "-"}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                            STATUS_STYLES[state] || STATUS_STYLES.OFF
                          }`}
                        >
                          {state}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            saveSpotlight(school, promotion, {
                              priority:
                                priority === "PREMIUM" ? "STANDARD" : "PREMIUM",
                              status: promotion?.status || "ACTIVE",
                            })
                          }
                          className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-black transition disabled:cursor-wait disabled:opacity-60 ${
                            priority === "PREMIUM"
                              ? "bg-[#1f4e79] text-white shadow-sm hover:bg-[#173f63]"
                              : "border border-[#d2dcf2] bg-[#f8f9fd] text-[#1f4e79] shadow-sm hover:border-[#1f4e79]/35 hover:bg-[#efe9ff]"
                          }`}
                        >
                          <FaStar />
                          {priority === "PREMIUM" ? "High rotation" : "Normal rotation"}
                        </button>
                      </td>
                      <td className="p-4 text-xs font-bold text-[#52657d]">
                        {promotion ? (
                          <>
                            {promotion.impressionCount || 0} views /{" "}
                            {promotion.clickCount || 0} clicks
                          </>
                        ) : (
                          "No spotlight yet"
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          {isActive ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                saveSpotlight(school, promotion, {
                                  status: "PAUSED",
                                  priority: "STANDARD",
                                })
                              }
                              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#efe9ff] px-4 text-sm font-black text-[#1f4e79] transition hover:bg-[#e6ddff] disabled:cursor-wait disabled:opacity-60"
                            >
                              <FaPause />
                              Pause
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                saveSpotlight(school, promotion, {
                                  status: "ACTIVE",
                                })
                              }
                              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#1f4e79] px-4 text-sm font-black text-white transition hover:bg-[#173f63] disabled:cursor-wait disabled:opacity-60"
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
  );
}
