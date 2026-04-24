"use client";

import { useState } from "react";
import { useParentMode } from "@/context/ParentModeContext";
import { FaUserShield, FaUserGraduate, FaLock } from "react-icons/fa";
import Modal from "./Modal"; // Assuming you have a generic Modal component

export default function ParentModeToggle({ studentId }) {
  const { isParentMode, toggleParentMode } = useParentMode();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleToggle = () => {
    if (isParentMode) {
      // Switching back to Student Mode is easy (or maybe require PIN too? usually not)
      toggleParentMode(false);
    } else {
      // Switching to Parent Mode requires PIN
      setIsModalOpen(true);
      setPin("");
      setError("");
    }
  };

  const verifyPin = async () => {
    if (pin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }

    setLoading(true);
    try {
      // Call API to verify PIN
      const res = await fetch("/api/student/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (data.success) {
        toggleParentMode(true);
        setIsModalOpen(false);
      } else {
        setError(data.error || "Incorrect PIN");
      }
    } catch (err) {
      setError("Failed to verify PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleToggle}
        className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
          isParentMode
            ? "bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/30"
            : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
        }`}
      >
        {isParentMode ? (
          <>
            <FaUserShield /> Parent Mode Active
          </>
        ) : (
          <>
            <FaUserGraduate /> Student Mode
          </>
        )}
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <FaLock className="text-purple-400 text-xl" />
              </div>
              <h3 className="text-xl font-bold text-white">Parent Access</h3>
              <p className="text-slate-400 text-sm mt-1">
                Enter your 4-digit PIN to access parental controls.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-center gap-2">
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className="w-32 text-center text-2xl tracking-[0.5em] bg-slate-950 border border-slate-800 rounded-lg py-2 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder="••••"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={verifyPin}
                  disabled={loading || pin.length !== 4}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Verifying..." : "Access"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
