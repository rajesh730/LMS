"use client";

import { useEffect, useState } from "react";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiGlobe,
  FiLayers,
  FiLock,
  FiRotateCcw,
  FiSave,
  FiSettings,
  FiShield,
  FiUserPlus,
  FiUserX,
} from "react-icons/fi";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AppDate from "@/components/common/AppDate";

const defaultConfig = {
  general: {
    platformName: "Pravyo",
    supportEmail: "",
    supportPhone: "",
    defaultTimezone: "Asia/Kathmandu",
    defaultCountry: "Nepal",
    statusPageUrl: "",
    maintenanceMessage: "",
  },
  governance: {
    schoolOnboardingMode: "APPROVAL_REQUIRED",
    eventPublishingMode: "SUPER_ADMIN_REVIEW",
    defaultPublicResults: true,
    allowSchoolShowcases: true,
  },
  defaults: {
    pendingSchoolRestrictions: true,
    allowFeedbackForm: true,
  },
};

function getRiskWarnings(nextConfig, currentConfig) {
  const warnings = [];

  if (
    currentConfig.governance.schoolOnboardingMode !== "AUTO_APPROVE" &&
    nextConfig.governance.schoolOnboardingMode === "AUTO_APPROVE"
  ) {
    warnings.push(
      "School onboarding will switch to auto-approve for future school registrations."
    );
  }

  if (
    currentConfig.governance.eventPublishingMode !== "OWNER_DIRECT" &&
    nextConfig.governance.eventPublishingMode === "OWNER_DIRECT"
  ) {
    warnings.push(
      "Platform event publishing will allow direct owner publishing without super admin review."
    );
  }

  if (
    currentConfig.governance.allowSchoolShowcases &&
    !nextConfig.governance.allowSchoolShowcases
  ) {
    warnings.push(
      "Schools will no longer be able to publish showcase pages going forward."
    );
  }

  if (
    currentConfig.governance.defaultPublicResults &&
    !nextConfig.governance.defaultPublicResults
  ) {
    warnings.push(
      "New platform events will no longer default to public results."
    );
  }

  return warnings;
}

function normalizeDefaults(defaults = {}) {
  const nextDefaults = { ...defaultConfig.defaults, ...defaults };
  if (
    typeof nextDefaults.allowFeedbackForm !== "boolean" &&
    typeof defaults.allowSupportTickets === "boolean"
  ) {
    nextDefaults.allowFeedbackForm = defaults.allowSupportTickets;
  }
  delete nextDefaults.allowSupportTickets;
  return nextDefaults;
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

function ToggleField({ checked, onChange, label, description }) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500"
      />
      <span>
        <span className="block text-sm font-medium text-white">{label}</span>
        <span className="mt-1 block text-sm text-slate-400">{description}</span>
      </span>
    </label>
  );
}

export default function SuperAdminSettingsManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [config, setConfig] = useState(defaultConfig);
  const [savedConfig, setSavedConfig] = useState(defaultConfig);
  const [isDirty, setIsDirty] = useState(false);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [adminsSaving, setAdminsSaving] = useState(false);
  const [adminMessage, setAdminMessage] = useState({ type: "", text: "" });
  const [adminUsers, setAdminUsers] = useState([]);
  const [currentAdminId, setCurrentAdminId] = useState("");
  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    password: "",
    currentPassword: "",
  });
  const [adminActionPassword, setAdminActionPassword] = useState("");
  const [pendingRiskSave, setPendingRiskSave] = useState(null);
  const [pendingAdminAction, setPendingAdminAction] = useState(null);
  const activeAdminCount = adminUsers.filter(
    (admin) => admin.status !== "UNSUBSCRIBED"
  ).length;

  const fetchAdminUsers = async () => {
    try {
      setAdminsLoading(true);
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load admin users");
      }
      setAdminUsers(data.data?.admins || []);
      setCurrentAdminId(String(data.data?.currentAdminId || ""));
    } catch (error) {
      console.error("Failed to load admin users:", error);
      setAdminMessage({ type: "error", text: error.message });
    } finally {
      setAdminsLoading(false);
    }
  };

  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/settings", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to load platform settings");
        }

        const payload = data.data || {};
        const normalizedDefaults = normalizeDefaults(payload.defaults);
        setConfig({
          general: { ...defaultConfig.general, ...(payload.general || {}) },
          governance: {
            ...defaultConfig.governance,
            ...(payload.governance || {}),
          },
          defaults: normalizedDefaults,
        });
        setSavedConfig({
          general: { ...defaultConfig.general, ...(payload.general || {}) },
          governance: {
            ...defaultConfig.governance,
            ...(payload.governance || {}),
          },
          defaults: normalizedDefaults,
        });
        setIsDirty(false);
      } catch (error) {
        console.error("Failed to load platform settings:", error);
        setMessage({ type: "error", text: error.message });
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
    fetchAdminUsers();
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

  const discardChanges = async () => {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to reload platform settings");
      }

      const payload = data.data || {};
      const normalizedDefaults = normalizeDefaults(payload.defaults);
      setConfig({
        general: { ...defaultConfig.general, ...(payload.general || {}) },
        governance: {
          ...defaultConfig.governance,
          ...(payload.governance || {}),
        },
        defaults: normalizedDefaults,
      });
      setSavedConfig({
        general: { ...defaultConfig.general, ...(payload.general || {}) },
        governance: {
          ...defaultConfig.governance,
          ...(payload.governance || {}),
        },
        defaults: normalizedDefaults,
      });
      setIsDirty(false);
    } catch (error) {
      console.error("Failed to discard changes:", error);
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const updateSection = (section, field, value) => {
    setIsDirty(true);
    setConfig((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  };

  const updateAdminForm = (field, value) => {
      setAdminForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async (skipRiskConfirm = false) => {
    try {
      setSaving(true);
      setMessage({ type: "", text: "" });
      const bypassRiskConfirm = skipRiskConfirm === true;

      const platformName = String(config.general.platformName || "").trim();
      const supportEmail = String(config.general.supportEmail || "").trim();
      const statusPageUrl = String(config.general.statusPageUrl || "").trim();
      const supportPhone = String(config.general.supportPhone || "").trim();

      if (!platformName) {
        setMessage({
          type: "error",
          text: "Platform name is required.",
        });
        setSaving(false);
        return;
      }

      if (supportEmail && !isValidEmail(supportEmail)) {
        setMessage({
          type: "error",
          text: "Contact email must be a valid email address.",
        });
        setSaving(false);
        return;
      }

      if (statusPageUrl && !isValidUrl(statusPageUrl)) {
        setMessage({
          type: "error",
          text: "Status page URL must start with http:// or https://",
        });
        setSaving(false);
        return;
      }

      const sanitizedConfig = {
        ...config,
        general: {
          ...config.general,
          platformName,
          supportEmail,
          supportPhone,
          statusPageUrl,
        },
      };

      const riskWarnings = getRiskWarnings(sanitizedConfig, savedConfig);
      if (riskWarnings.length > 0 && !bypassRiskConfirm) {
        setPendingRiskSave({ warnings: riskWarnings });
        setSaving(false);
        return;
      }

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitizedConfig),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save platform settings");
      }

      const changedSections = [];
      if (
        JSON.stringify(savedConfig.general) !==
        JSON.stringify(sanitizedConfig.general)
      ) {
        changedSections.push("General");
      }
      if (
        JSON.stringify(savedConfig.governance) !==
        JSON.stringify(sanitizedConfig.governance)
      ) {
        changedSections.push("Approval & Publishing");
      }
      if (
        JSON.stringify(savedConfig.defaults) !==
        JSON.stringify(sanitizedConfig.defaults)
      ) {
        changedSections.push("Contact");
      }

      setMessage({
        type: "success",
        text:
          changedSections.length > 0
            ? `${changedSections.join(", ")} settings saved successfully.`
            : "Platform settings saved successfully.",
      });
      setConfig(sanitizedConfig);
      setSavedConfig(sanitizedConfig);
      setIsDirty(false);
    } catch (error) {
      console.error("Failed to save platform settings:", error);
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAdmin = async () => {
    try {
      setAdminsSaving(true);
      setAdminMessage({ type: "", text: "" });

      const name = String(adminForm.name || "").trim();
      const email = String(adminForm.email || "").trim().toLowerCase();
      const password = String(adminForm.password || "");
      const currentPassword = String(adminForm.currentPassword || "");

      if (!name || !email || !password || !currentPassword) {
        setAdminMessage({
          type: "error",
          text: "Admin name, email, new admin password, and your current password are required.",
        });
        return;
      }

      if (!isValidEmail(email)) {
        setAdminMessage({
          type: "error",
          text: "Admin email must be a valid email address.",
        });
        return;
      }

      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
        setAdminMessage({
          type: "error",
          text: "Admin password must be at least 8 characters and include a letter and a number.",
        });
        return;
      }

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, currentPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAdminMessage({
          type: "error",
          text:
            data.message ||
            "Failed to create super admin. Confirm your own current password and try again.",
        });
        return;
      }

      setAdminMessage({
        type: "success",
        text: `${name} was added as a super admin.`,
      });
      setAdminForm({ name: "", email: "", password: "", currentPassword: "" });
      await fetchAdminUsers();
    } catch (error) {
      console.error("Failed to create super admin:", error);
      setAdminMessage({
        type: "error",
        text: "Failed to create super admin. Please try again.",
      });
    } finally {
      setAdminsSaving(false);
    }
  };

  const handleAdminStatusChange = async (admin, action, skipConfirm = false) => {
    try {
      setAdminMessage({ type: "", text: "" });

      const currentPassword = String(adminActionPassword || "");
      if (!currentPassword) {
        setAdminMessage({
          type: "error",
          text: "Enter your current password before changing another admin account.",
        });
        return;
      }

      const label = action === "deactivate" ? "deactivate" : "reactivate";
      if (skipConfirm !== true) {
        setPendingAdminAction({ admin, action, label });
        return;
      }

      setAdminsSaving(true);
      const res = await fetch(`/api/admin/users/${admin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, currentPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAdminMessage({
          type: "error",
          text:
            data.message ||
            "Failed to update admin access. Confirm your own current password and try again.",
        });
        return;
      }

      setAdminMessage({
        type: "success",
        text:
          action === "deactivate"
            ? `${admin.name || admin.email} was deactivated.`
            : `${admin.name || admin.email} was reactivated.`,
      });
      await fetchAdminUsers();
    } catch (error) {
      console.error("Failed to update admin status:", error);
      setAdminMessage({
        type: "error",
        text: "Failed to update admin access. Please try again.",
      });
    } finally {
      setAdminsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-slate-300">
        Loading platform settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
              <FiSettings className="text-blue-400" />
              Platform Settings
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              This surface should only hold platform-wide defaults, governance,
              and operational policy. School-specific branding and contact data
              belongs in school settings.
            </p>
          </div>
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
            Global defaults apply across the platform unless a lower school
            scope explicitly overrides them.
          </div>
        </div>
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
          You have unsaved changes. They are only stored after you click `Save
          platform settings`. Leaving or refreshing the page now will discard
          your edits.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold text-white">
              <FiShield className="text-violet-300" />
              Admin Access
            </h2>
            <p className="mb-4 text-sm text-slate-400">
              Use separate named super-admin accounts for real people. Avoid
              shared logins so ownership, recovery, and future audit trails stay
              clear.
            </p>

            {adminMessage.text && (
              <div
                className={`mb-4 flex items-center gap-3 rounded-2xl border p-4 text-sm ${
                  adminMessage.type === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-red-500/30 bg-red-500/10 text-red-200"
                }`}
              >
                {adminMessage.type === "success" ? (
                  <FiCheckCircle />
                ) : (
                  <FiAlertCircle />
                )}
                <span>{adminMessage.text}</span>
              </div>
            )}

            <div className="mb-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  Super Admins
                </p>
                <p className="mt-3 text-3xl font-bold text-white">
                  {adminUsers.length}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Separate named accounts with full platform control.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  Active
                </p>
                <p className="mt-3 text-3xl font-bold text-white">
                  {activeAdminCount}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Accounts that can currently access platform administration.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  Governance Note
                </p>
                <p className="mt-3 text-sm text-slate-300">
                  Keep at least two active super admins so the platform is not
                  blocked if one person loses access.
                </p>
                {activeAdminCount < 2 && (
                  <p className="mt-2 text-sm text-amber-300">
                    Warning: only one super admin is configured right now.
                  </p>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800">
              <div className="grid grid-cols-[1.1fr_1.3fr_0.8fr_0.8fr_1fr] gap-4 border-b border-slate-800 bg-slate-900/80 px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                <span>Admin</span>
                <span>Email</span>
                <span>Status</span>
                <span>Origin</span>
                <span>Action</span>
              </div>
              {adminsLoading ? (
                <div className="px-4 py-6 text-sm text-slate-400">
                  Loading admin access...
                </div>
              ) : adminUsers.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-400">
                  No super admins found.
                </div>
              ) : (
                adminUsers.map((admin) => (
                  <div
                    key={admin.id}
                    className="grid grid-cols-[1.1fr_1.3fr_0.8fr_0.8fr_1fr] gap-4 border-t border-slate-800 px-4 py-4 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-white">{admin.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Added <AppDate value={admin.createdAt} />
                      </p>
                    </div>
                    <div className="text-slate-300">{admin.email}</div>
                    <div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                          admin.status === "UNSUBSCRIBED"
                            ? "border-slate-600 bg-slate-800/80 text-slate-300"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                        }`}
                      >
                        {admin.status}
                      </span>
                    </div>
                    <div className="text-slate-300">
                      {admin.isDefaultAdmin ? "Bootstrap" : "Managed"}
                    </div>
                    <div>
                      {admin.id === currentAdminId ? (
                        <div className="space-y-2">
                          <button
                            type="button"
                            disabled
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 opacity-80"
                            title="You cannot deactivate the super admin account you are currently using."
                          >
                            <FiUserX />
                            Current account
                          </button>
                          <p className="text-xs text-slate-500">
                            You cannot deactivate the account you are signed in
                            with.
                          </p>
                        </div>
                      ) : admin.status === "UNSUBSCRIBED" ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleAdminStatusChange(admin, "reactivate")
                          }
                          disabled={adminsSaving}
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <FiCheckCircle />
                          Reactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleAdminStatusChange(admin, "deactivate")
                          }
                          disabled={adminsSaving}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <FiUserX />
                          Deactivate
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Confirm with your current password
                </label>
                <input
                  type="password"
                  value={adminActionPassword}
                  onChange={(event) => setAdminActionPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                  placeholder="Required for add, deactivate, or reactivate"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Sensitive admin access changes require your current password.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  Safety Rules
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  <p>You cannot deactivate yourself from this screen.</p>
                  <p>The last active super admin cannot be deactivated.</p>
                  <p>Use deactivation instead of deleting privileged accounts.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto] xl:items-end">
              <div className="flex flex-col">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Admin name
                </label>
                <input
                  value={adminForm.name}
                  onChange={(event) =>
                    updateAdminForm("name", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                  placeholder="Full name"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Admin email
                </label>
                <input
                  type="email"
                  value={adminForm.email}
                  onChange={(event) =>
                    updateAdminForm("email", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                  placeholder="admin@yourdomain.com"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Temporary password
                </label>
                <input
                  type="password"
                  value={adminForm.password}
                  onChange={(event) =>
                    updateAdminForm("password", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                  placeholder="At least 8 chars with letter + number"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Your current password
                </label>
                <input
                  type="password"
                  value={adminForm.currentPassword}
                  onChange={(event) =>
                    updateAdminForm("currentPassword", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                  placeholder="Confirms this creation"
                />
              </div>
              <div className="flex flex-col xl:justify-end">
                <span className="mb-2 hidden text-sm font-medium text-transparent xl:block">
                  Action
                </span>
                <button
                  type="button"
                  onClick={handleCreateAdmin}
                  disabled={adminsSaving}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                >
                  <FiUserPlus />
                  {adminsSaving ? "Creating..." : "Add admin"}
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Create one named login per person. Do not share a common admin
              password across the organization.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold text-white">
              <FiGlobe className="text-cyan-300" />
              General
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Platform name
                </label>
                <input
                  value={config.general.platformName}
                  onChange={(event) =>
                    updateSection("general", "platformName", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Contact email
                </label>
                <input
                  type="email"
                  value={config.general.supportEmail}
                  onChange={(event) =>
                    updateSection("general", "supportEmail", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Contact phone
                </label>
                <input
                  value={config.general.supportPhone}
                  onChange={(event) =>
                    updateSection("general", "supportPhone", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Default timezone
                </label>
                <input
                  value={config.general.defaultTimezone}
                  onChange={(event) =>
                    updateSection(
                      "general",
                      "defaultTimezone",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Default country
                </label>
                <input
                  value={config.general.defaultCountry}
                  onChange={(event) =>
                    updateSection(
                      "general",
                      "defaultCountry",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Status page URL
                </label>
                <input
                  value={config.general.statusPageUrl}
                  onChange={(event) =>
                    updateSection("general", "statusPageUrl", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Maintenance notice
                </label>
                <textarea
                  rows={4}
                  value={config.general.maintenanceMessage}
                  onChange={(event) =>
                    updateSection(
                      "general",
                      "maintenanceMessage",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                  placeholder="Optional message shown when you need to communicate platform-wide maintenance."
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold text-white">
              <FiLock className="text-amber-300" />
              Approval & Publishing
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  School onboarding
                </label>
                <select
                  value={config.governance.schoolOnboardingMode}
                  onChange={(event) =>
                    updateSection(
                      "governance",
                      "schoolOnboardingMode",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                >
                  <option value="APPROVAL_REQUIRED">Approval required</option>
                  <option value="AUTO_APPROVE">Auto approve</option>
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Controls how newly registered schools are admitted to the
                  platform. This affects new registrations going forward.
                </p>
                <p className="mt-1 text-xs text-blue-300">
                  Scope: new schools only. Existing approved schools are not
                  changed automatically.
                </p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Platform event publishing
                </label>
                <select
                  value={config.governance.eventPublishingMode}
                  onChange={(event) =>
                    updateSection(
                      "governance",
                      "eventPublishingMode",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                >
                  <option value="SUPER_ADMIN_REVIEW">Super admin review</option>
                  <option value="OWNER_DIRECT">Owner can publish directly</option>
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Controls whether platform events need super admin review before
                  they can be published.
                </p>
                <p className="mt-1 text-xs text-blue-300">
                  Scope: affects future platform event publishing decisions, not
                  already published events.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold text-white">
              <FiGlobe className="text-emerald-300" />
              Public Visibility
            </h2>
            <div className="grid gap-4">
              <ToggleField
                checked={config.governance.defaultPublicResults}
                onChange={(value) =>
                  updateSection("governance", "defaultPublicResults", value)
                }
                label="Enable public results by default"
                description="Used as the starting value for newly created platform events. Existing events keep their own result visibility settings."
              />
              <p className="text-xs text-blue-300">
                Scope: applies to newly created platform events only.
              </p>
              <ToggleField
                checked={config.governance.allowSchoolShowcases}
                onChange={(value) =>
                  updateSection("governance", "allowSchoolShowcases", value)
                }
                label="Allow school showcase publishing"
                description="Lets schools publish public showcase pages. Turning this off affects future school showcase visibility and editing."
              />
              <p className="text-xs text-blue-300">
                Scope: affects school showcase publishing and visibility policy
                going forward.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold text-white">
              <FiLayers className="text-emerald-300" />
              Access and feedback
            </h2>
            <div className="space-y-4">
              <ToggleField
                checked={config.defaults.pendingSchoolRestrictions}
                onChange={(value) =>
                  updateSection("defaults", "pendingSchoolRestrictions", value)
                }
                label="Restrict pending school accounts"
                description="Pending schools should only access a minimal account surface until approved. This reduces accidental access before review."
              />
              <p className="text-xs text-blue-300">
                Scope: affects school accounts that are still pending approval.
              </p>
              <ToggleField
                checked={config.defaults.allowFeedbackForm}
                onChange={(value) =>
                  updateSection("defaults", "allowFeedbackForm", value)
                }
                label="Enable feedback form"
                description="Allows students and schools to send feedback to the super admin inbox."
              />
              <p className="text-xs text-blue-300">
                Scope: affects feedback submission availability for school and
                student workspaces.
              </p>
            </div>
          </div>

        </section>
      </div>

      <div className="flex justify-end">
        {isDirty && (
          <button
            type="button"
            onClick={discardChanges}
            className="mr-3 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            <FiRotateCcw />
            Discard changes
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          <FiSave />
          {saving ? "Saving..." : "Save platform settings"}
        </button>
      </div>

      <ConfirmDialog
        open={Boolean(pendingRiskSave)}
        title="Confirm platform policy changes"
        message={
          pendingRiskSave?.warnings?.length
            ? pendingRiskSave.warnings.join(" ")
            : ""
        }
        confirmLabel="Save changes"
        tone="warning"
        busy={saving}
        onClose={() => setPendingRiskSave(null)}
        onConfirm={() => {
          setPendingRiskSave(null);
          handleSave(true);
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingAdminAction)}
        title={
          pendingAdminAction
            ? `${pendingAdminAction.label === "deactivate" ? "Deactivate" : "Reactivate"} admin?`
            : "Update admin?"
        }
        message={
          pendingAdminAction
            ? `${pendingAdminAction.admin.name || pendingAdminAction.admin.email} access will be updated.`
            : ""
        }
        confirmLabel={
          pendingAdminAction?.label === "deactivate"
            ? "Deactivate admin"
            : "Reactivate admin"
        }
        tone={pendingAdminAction?.label === "deactivate" ? "danger" : "info"}
        busy={adminsSaving}
        onClose={() => setPendingAdminAction(null)}
        onConfirm={() => {
          if (pendingAdminAction) {
            const { admin, action } = pendingAdminAction;
            setPendingAdminAction(null);
            handleAdminStatusChange(admin, action, true);
          }
        }}
      />
    </div>
  );
}
