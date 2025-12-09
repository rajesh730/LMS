"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    schoolName: "",
    email: "",
    password: "",
    principalName: "",
    principalPhone: "",
    schoolLocation: "",
    schoolPhone: "",
    website: "",
    establishedYear: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isStrongPassword = (pwd) => {
    // At least 8 chars, one letter, one number
    return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(pwd || "");
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!isStrongPassword(formData.password)) {
      setError(
        "Password must be at least 8 characters and include a letter and a number."
      );
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Registration successful! Please wait for admin approval.");
        router.push("/login");
      } else {
        setError(data.message || "Registration failed");
      }
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-2xl border border-slate-700">
        <h2 className="text-3xl font-bold text-white mb-2 text-center">
          Register School
        </h2>
        <p className="text-slate-400 text-center mb-8">
          Join our platform to manage your school efficiently
        </p>

        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* School Info */}
            <div className="space-y-4">
              <h3 className="text-emerald-400 font-semibold border-b border-slate-700 pb-2">
                School Details
              </h3>
              <div>
                <label className="block text-slate-300 mb-1 text-sm">
                  School Name *
                </label>
                <input
                  name="schoolName"
                  type="text"
                  value={formData.schoolName}
                  onChange={handleChange}
                  className="w-full bg-slate-700 text-white rounded p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 text-sm">
                  Location *
                </label>
                <input
                  name="schoolLocation"
                  type="text"
                  value={formData.schoolLocation}
                  onChange={handleChange}
                  className="w-full bg-slate-700 text-white rounded p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 text-sm">
                  School Phone
                </label>
                <input
                  name="schoolPhone"
                  type="text"
                  value={formData.schoolPhone}
                  onChange={handleChange}
                  className="w-full bg-slate-700 text-white rounded p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 text-sm">
                  Website
                </label>
                <input
                  name="website"
                  type="text"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full bg-slate-700 text-white rounded p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="https://"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 text-sm">
                  Established Year
                </label>
                <input
                  name="establishedYear"
                  type="number"
                  value={formData.establishedYear}
                  onChange={handleChange}
                  className="w-full bg-slate-700 text-white rounded p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Admin/Principal Info */}
            <div className="space-y-4">
              <h3 className="text-emerald-400 font-semibold border-b border-slate-700 pb-2">
                Principal & Login
              </h3>
              <div>
                <label className="block text-slate-300 mb-1 text-sm">
                  Principal Name *
                </label>
                <input
                  name="principalName"
                  type="text"
                  value={formData.principalName}
                  onChange={handleChange}
                  className="w-full bg-slate-700 text-white rounded p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 text-sm">
                  Principal Phone
                </label>
                <input
                  name="principalPhone"
                  type="text"
                  value={formData.principalPhone}
                  onChange={handleChange}
                  className="w-full bg-slate-700 text-white rounded p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 text-sm">
                  Email (Login ID) *
                </label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-slate-700 text-white rounded p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 text-sm">
                  Password *
                </label>
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-slate-700 text-white rounded p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isStrongPassword(formData.password)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? "Registering..." : "Register School"}
          </button>
        </form>

        <p className="text-slate-400 mt-6 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-400 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
