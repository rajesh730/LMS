"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import {
  FiAlertCircle,
  FiBookOpen,
  FiCheckCircle,
  FiLock,
  FiMail,
  FiPlus,
  FiRotateCcw,
  FiSave,
  FiSettings,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";
import SettingsAuditPanel from "@/components/settings/SettingsAuditPanel";

const defaultConfig = {
  schoolName: "",
  schoolCode: "",
  email: "",
  phone: "",
  principalPhone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  principalName: "",
  website: "",
  establishedYear: "",
  totalStudents: 0,
  totalTeachers: 0,
  totalGrades: 0,
  teacherRoles: [],
  grades: [],
};

function StatCard({ label, value, description }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  );
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function isValidUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function getSanitizedConfig(config) {
  return {
    ...config,
    schoolName: String(config.schoolName || "").trim(),
    schoolCode: String(config.schoolCode || "").trim(),
    email: String(config.email || "").trim(),
    phone: String(config.phone || "").trim(),
    principalPhone: String(config.principalPhone || "").trim(),
    address: String(config.address || "").trim(),
    city: String(config.city || "").trim(),
    state: String(config.state || "").trim(),
    pincode: String(config.pincode || "").trim(),
    principalName: String(config.principalName || "").trim(),
    website: String(config.website || "").trim(),
    establishedYear: String(config.establishedYear || "").trim(),
    teacherRoles: (config.teacherRoles || [])
      .map((item) => String(item || "").trim())
      .filter(Boolean),
  };
}

export default function SchoolSettingsManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" });
  const [config, setConfig] = useState(defaultConfig);
  const [savedConfig, setSavedConfig] = useState(defaultConfig);
  const [roleDraft, setRoleDraft] = useState("");
  const [history, setHistory] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchSchoolConfig();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const fetchSchoolConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/school/settings", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load settings");
      }

      const payload = data.data || {};
      const identity = payload.identity || {};
      const settingsConfig = payload.config || {};
      const stats = payload.stats || {};
      setConfig({
        schoolName: identity.schoolName || "",
        schoolCode: settingsConfig.schoolCode || "",
        email: identity.email || "",
        phone: identity.phone || "",
        principalPhone: identity.principalPhone || "",
        address: identity.address || "",
        city: settingsConfig.city || "",
        state: settingsConfig.state || "",
        pincode: settingsConfig.pincode || "",
        principalName: identity.principalName || "",
        website: identity.website || "",
        establishedYear: identity.establishedYear || "",
        totalStudents: stats.totalStudents || 0,
        totalTeachers: stats.totalTeachers || 0,
        totalGrades: stats.totalGrades || 0,
        teacherRoles: settingsConfig.teacherRoles || [],
        grades: settingsConfig.grades || [],
      });
      setSavedConfig({
        schoolName: identity.schoolName || "",
        schoolCode: settingsConfig.schoolCode || "",
        email: identity.email || "",
        phone: identity.phone || "",
        principalPhone: identity.principalPhone || "",
        address: identity.address || "",
        city: settingsConfig.city || "",
        state: settingsConfig.state || "",
        pincode: settingsConfig.pincode || "",
        principalName: identity.principalName || "",
        website: identity.website || "",
        establishedYear: identity.establishedYear || "",
        totalStudents: stats.totalStudents || 0,
        totalTeachers: stats.totalTeachers || 0,
        totalGrades: stats.totalGrades || 0,
        teacherRoles: settingsConfig.teacherRoles || [],
        grades: settingsConfig.grades || [],
      });
      setIsDirty(false);
    } catch (error) {
      console.error("Failed to fetch school config:", error);
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch("/api/school/settings/audit", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load settings history");
      }
      setHistory(data.data || []);
    } catch (error) {
      console.error("Failed to fetch school settings history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setIsDirty(true);
    setConfig((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const updatePasswordForm = (name, value) => {
    setPasswordMessage({ type: "", text: "" });
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const addTeacherRole = () => {
    const value = String(roleDraft || "").trim();
    if (!value) return;

    setConfig((prev) => {
      const nextRoles = prev.teacherRoles.includes(value)
        ? prev.teacherRoles
        : [...prev.teacherRoles, value];

      return {
        ...prev,
        teacherRoles: nextRoles,
      };
    });
    setIsDirty(true);
    setRoleDraft("");
  };

  const updateTeacherRole = (index, value) => {
    setConfig((prev) => {
      const nextRoles = [...prev.teacherRoles];
      nextRoles[index] = value;
      const cleanedRoles = nextRoles.map((item) => item.trim()).filter(Boolean);

      return {
        ...prev,
        teacherRoles: cleanedRoles,
      };
    });
    setIsDirty(true);
  };

  const removeTeacherRole = (index) => {
    setConfig((prev) => {
      const nextRoles = prev.teacherRoles.filter((_, current) => current !== index);
      return {
        ...prev,
        teacherRoles: nextRoles,
      };
    });
    setIsDirty(true);
  };

  const discardChanges = async () => {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });
      await fetchSchoolConfig();
    } catch (error) {
      console.error("Failed to discard school settings changes:", error);
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage({ type: "", text: "" });

      const sanitizedConfig = getSanitizedConfig(config);

      if (!sanitizedConfig.schoolName) {
        setMessage({ type: "error", text: "School name is required." });
        setSaving(false);
        return;
      }

      if (sanitizedConfig.email && !isValidEmail(sanitizedConfig.email)) {
        setMessage({
          type: "error",
          text: "Official email must be a valid email address.",
        });
        setSaving(false);
        return;
      }

      if (sanitizedConfig.website && !isValidUrl(sanitizedConfig.website)) {
        setMessage({
          type: "error",
          text: "Website must start with http:// or https://",
        });
        setSaving(false);
        return;
      }

      if (sanitizedConfig.establishedYear) {
        const year = Number(sanitizedConfig.establishedYear);
        const currentYear = new Date().getFullYear();
        if (!Number.isInteger(year) || year < 1800 || year > currentYear) {
          setMessage({
            type: "error",
            text: "Established year must be a valid year.",
          });
          setSaving(false);
          return;
        }
      }

      const payload = {
        identity: {
          schoolName: sanitizedConfig.schoolName,
          principalName: sanitizedConfig.principalName,
          principalPhone: sanitizedConfig.principalPhone,
          email: sanitizedConfig.email,
          phone: sanitizedConfig.phone,
          address: sanitizedConfig.address,
          website: sanitizedConfig.website,
          establishedYear: sanitizedConfig.establishedYear,
        },
        config: {
          schoolCode: sanitizedConfig.schoolCode,
          city: sanitizedConfig.city,
          state: sanitizedConfig.state,
          pincode: sanitizedConfig.pincode,
          teacherRoles: sanitizedConfig.teacherRoles,
        },
      };

      const res = await fetch("/api/school/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save settings");
      }

      const changedSections = [];
      if (
        JSON.stringify({
          schoolName: savedConfig.schoolName,
          principalName: savedConfig.principalName,
          principalPhone: savedConfig.principalPhone,
          email: savedConfig.email,
          website: savedConfig.website,
          establishedYear: savedConfig.establishedYear,
          schoolCode: savedConfig.schoolCode,
        }) !==
        JSON.stringify({
          schoolName: sanitizedConfig.schoolName,
          principalName: sanitizedConfig.principalName,
          principalPhone: sanitizedConfig.principalPhone,
          email: sanitizedConfig.email,
          website: sanitizedConfig.website,
          establishedYear: sanitizedConfig.establishedYear,
          schoolCode: sanitizedConfig.schoolCode,
        })
      ) {
        changedSections.push("School Profile");
      }
      if (
        JSON.stringify({
          phone: savedConfig.phone,
          address: savedConfig.address,
          city: savedConfig.city,
          state: savedConfig.state,
          pincode: savedConfig.pincode,
        }) !==
        JSON.stringify({
          phone: sanitizedConfig.phone,
          address: sanitizedConfig.address,
          city: sanitizedConfig.city,
          state: sanitizedConfig.state,
          pincode: sanitizedConfig.pincode,
        })
      ) {
        changedSections.push("Contact & Location");
      }
      if (
        JSON.stringify(savedConfig.teacherRoles || []) !==
        JSON.stringify(sanitizedConfig.teacherRoles || [])
      ) {
        changedSections.push("Staff Defaults");
      }

      setConfig(sanitizedConfig);
      setSavedConfig({
        ...savedConfig,
        ...sanitizedConfig,
      });
      setIsDirty(false);
      setMessage({
        type: "success",
        text:
          changedSections.length > 0
            ? `${changedSections.join(", ")} saved successfully.`
            : "School settings saved successfully.",
      });
      await fetchHistory();
    } catch (error) {
      console.error("Error saving school config:", error);
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      const currentPassword = String(passwordForm.currentPassword || "");
      const newPassword = String(passwordForm.newPassword || "");
      const confirmPassword = String(passwordForm.confirmPassword || "");

      if (!currentPassword || !newPassword || !confirmPassword) {
        setPasswordMessage({
          type: "error",
          text: "Current password, new password, and confirmation are required.",
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        setPasswordMessage({
          type: "error",
          text: "New password and confirmation do not match.",
        });
        return;
      }

      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newPassword)) {
        setPasswordMessage({
          type: "error",
          text: "New password must be at least 8 characters and include a letter and a number.",
        });
        return;
      }

      setPasswordSaving(true);
      setPasswordMessage({ type: "", text: "" });

      const res = await fetch("/api/school/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to change password");
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordMessage({
        type: "success",
        text: "Password updated. Signing you out to protect the account.",
      });

      setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, 900);
    } catch (error) {
      console.error("Failed to change school password:", error);
      setPasswordMessage({ type: "error", text: error.message });
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-slate-400">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
          <FiSettings className="text-blue-400" />
          School Settings
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          This page should own school identity, contact information, and local
          staff-role defaults. Platform governance and global policies belong in
          super admin settings.
        </p>
      </div>

      {message.text && (
        <div
          className={`flex items-center gap-3 rounded-2xl border p-4 text-sm ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}
        >
          {message.type === "success" ? <FiCheckCircle /> : <FiAlertCircle />}
          <span>{message.text}</span>
        </div>
      )}

      {isDirty && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          You have unsaved changes. Leaving or refreshing the page now will
          discard your school settings edits.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Students"
          value={config.totalStudents}
          description="Managed student records in this school workspace."
        />
        <StatCard
          label="Teachers"
          value={config.totalTeachers}
          description="Mentors and staff accounts connected to this school."
        />
        <StatCard
          label="Grades"
          value={config.totalGrades}
          description="Grade bands derived from the school registration profile."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold text-white">
              <FiBookOpen className="text-cyan-300" />
              School Profile
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  School name
                </label>
                <input
                  type="text"
                  name="schoolName"
                  value={config.schoolName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  School code
                </label>
                <input
                  type="text"
                  name="schoolCode"
                  value={config.schoolCode}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Optional internal code used by your school for reference.
                </p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Principal name
                </label>
                <input
                  type="text"
                  name="principalName"
                  value={config.principalName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Principal phone
                </label>
                <input
                  type="tel"
                  name="principalPhone"
                  value={config.principalPhone}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Used as the direct contact for school leadership when needed.
                </p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Official email
                </label>
                <input
                  type="email"
                  name="email"
                  value={config.email}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Website
                </label>
                <input
                  type="text"
                  name="website"
                  value={config.website}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Use a full URL such as `https://yourschool.edu`.
                </p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Established year
                </label>
                <input
                  type="number"
                  name="establishedYear"
                  value={config.establishedYear}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold text-white">
              <FiMail className="text-amber-300" />
              Contact & Location
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={config.phone}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Pin code
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={config.pincode}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={config.address}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={config.city}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={config.state}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold text-white">
              <FiUsers className="text-emerald-300" />
              Staff Defaults
            </h2>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Teacher role options
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Each school manages its own mentor and staff roles here.
                  </p>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  School Managed
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
                <div className="grid grid-cols-[1fr_140px_80px] border-b border-slate-800 bg-slate-900/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  <span>Role</span>
                  <span>Owner</span>
                  <span>Action</span>
                </div>
                {(config.teacherRoles || []).length === 0 ? (
                  <div className="px-4 py-5 text-sm text-slate-500">
                    No teacher roles are available yet.
                  </div>
                ) : (
                  config.teacherRoles.map((role, index) => (
                    <div
                      key={`${role}-${index}`}
                      className="grid grid-cols-[1fr_140px_80px] items-center gap-3 border-b border-slate-800/80 px-4 py-3 last:border-b-0"
                    >
                      <input
                        value={role}
                        onChange={(event) => updateTeacherRole(index, event.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                      />
                      <span className="text-sm text-slate-400">School</span>
                      <button
                        type="button"
                        onClick={() => removeTeacherRole(index)}
                        className="inline-flex items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-2 text-red-200 transition hover:bg-red-500/20"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    value={roleDraft}
                    onChange={(event) => setRoleDraft(event.target.value)}
                    placeholder="Add a teacher role"
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white"
                  />
                  <button
                    type="button"
                    onClick={addTeacherRole}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-500"
                  >
                    <FiPlus />
                    Add role
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                These roles are used when assigning mentor and staff roles inside
                your school workspace.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">
              Academic Snapshot
            </h2>
            {config.grades.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {config.grades.map((grade) => (
                  <span
                    key={grade}
                    className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-300"
                  >
                    {grade}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No grade structure is available yet from registration data.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold text-white">
              <FiLock className="text-cyan-300" />
              Change Password
            </h2>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Current password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      updatePasswordForm("currentPassword", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    New password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      updatePasswordForm("newPassword", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Confirm new password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      updatePasswordForm("confirmPassword", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                  />
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Use at least 8 characters with at least one letter and one
                number. After changing your password, the current session will
                be closed and you will sign in again with the new password.
              </p>

              {passwordMessage.text ? (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    passwordMessage.type === "success"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                      : "border-red-500/30 bg-red-500/10 text-red-200"
                  }`}
                >
                  {passwordMessage.text}
                </div>
              ) : null}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={passwordSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                >
                  <FiLock className="h-5 w-5" />
                  {passwordSaving ? "Updating..." : "Update password"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">
              Scope Rules
            </h2>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>Keep school-owned profile and contact data here.</li>
              <li>Use this page for local staff-role options and operating defaults.</li>
              <li>Do not put platform approval rules or public-result policy here.</li>
              <li>Read-only counts belong here only as a snapshot, not as editable settings.</li>
            </ul>
          </div>

          <SettingsAuditPanel
            title="Recent Changes"
            description="Recent school settings updates help you track overrides and profile changes."
            entries={history}
            loading={historyLoading}
          />
        </section>
      </div>

      <div className="flex justify-end">
        {isDirty && (
          <button
            type="button"
            onClick={discardChanges}
            className="mr-3 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            <FiRotateCcw className="h-5 w-5" />
            Discard changes
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          <FiSave className="h-5 w-5" />
          {saving ? "Saving..." : "Save school settings"}
        </button>
      </div>
    </div>
  );
}
