"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { FiSave, FiAlertCircle, FiCheckCircle } from "react-icons/fi";

export default function SchoolSettings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [config, setConfig] = useState({
    schoolName: "",
    schoolCode: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    principalName: "",
    totalStudents: 0,
    totalTeachers: 0,
    totalClassrooms: 0,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (session?.user?.role !== "SCHOOL_ADMIN") {
      router.push("/");
      return;
    }

    fetchSchoolConfig();
  }, [session, status]);

  const fetchSchoolConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/school/config");
      if (res.ok) {
        const data = await res.json();
        // Merge API response with default config to ensure all fields exist
        const apiConfig = data.data || {};
        setConfig({
          schoolName: apiConfig.schoolName || "",
          schoolCode: apiConfig.schoolCode || "",
          email: apiConfig.email || "",
          phone: apiConfig.phone || "",
          address: apiConfig.address || "",
          city: apiConfig.city || "",
          state: apiConfig.state || "",
          pincode: apiConfig.pincode || "",
          principalName: apiConfig.principalName || "",
          totalStudents: apiConfig.totalStudents || 0,
          totalTeachers: apiConfig.totalTeachers || 0,
          totalClassrooms: apiConfig.totalClassrooms || 0,
        });
      }
    } catch (err) {
      console.error("Failed to fetch school config:", err);
      setMessage({ type: "error", text: "Failed to load settings" });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: name.includes("total") ? parseInt(value) || 0 : value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/school/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Settings saved successfully!" });
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } else {
        const err = await res.json();
        setMessage({
          type: "error",
          text: err.message || "Failed to save settings",
        });
      }
    } catch (err) {
      console.error("Error saving config:", err);
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-400">Loading settings...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">School Settings</h1>
          <p className="text-gray-400">
            Manage your school information and configuration
          </p>
        </div>

        {message.text && (
          <div
            className={`p-4 rounded-lg flex items-center gap-2 ${
              message.type === "success"
                ? "bg-green-500/20 text-green-300 border border-green-500/30"
                : "bg-red-500/20 text-red-300 border border-red-500/30"
            }`}
          >
            {message.type === "success" ? (
              <FiCheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* School Information */}
          <div className="lg:col-span-2 bg-gray-900/50 rounded-lg border border-gray-700/50 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              School Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  School Name
                </label>
                <input
                  type="text"
                  name="schoolName"
                  value={config.schoolName}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="Enter school name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  School Code
                </label>
                <input
                  type="text"
                  name="schoolCode"
                  value={config.schoolCode}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="Enter school code"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Principal Name
                </label>
                <input
                  type="text"
                  name="principalName"
                  value={config.principalName}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="Enter principal name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={config.email}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="Enter email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={config.phone}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="Enter phone number"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={config.address}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="Enter address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={config.city}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="Enter city"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={config.state}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="Enter state"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Pin Code
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={config.pincode}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="Enter pin code"
                />
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-gray-900/50 rounded-lg border border-gray-700/50 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Statistics
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Total Students
                </label>
                <input
                  type="number"
                  name="totalStudents"
                  value={config.totalStudents}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="0"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Total Teachers
                </label>
                <input
                  type="number"
                  name="totalTeachers"
                  value={config.totalTeachers}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="0"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Total Classrooms
                </label>
                <input
                  type="number"
                  name="totalClassrooms"
                  value={config.totalClassrooms}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="0"
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
          >
            <FiSave className="w-5 h-5" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
