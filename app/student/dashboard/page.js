"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import CredentialsModal from "@/components/CredentialsModal";
import StudentClassContent from "@/components/StudentClassContent";
import StudentResultsView from "@/components/StudentResultsView";
import { FaUser, FaGraduationCap, FaKey, FaBook, FaChartLine } from "react-icons/fa";

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("learning"); // 'learning' | 'results'
  const [credentialsModal, setCredentialsModal] = useState({
    isOpen: false,
    credentials: null,
  });
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-slate-400">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (session?.user?.role !== "STUDENT") {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-400">Unauthorized access</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 flex items-center gap-3">
          <FaGraduationCap className="text-blue-400" /> Student Dashboard
        </h1>

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-800 pb-1">
          <button
            onClick={() => setActiveTab("learning")}
            className={`px-4 py-2 text-sm font-medium transition relative ${
              activeTab === "learning"
                ? "text-blue-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <FaBook /> My Learning
            </span>
            {activeTab === "learning" && (
              <span className="absolute bottom-[-5px] left-0 w-full h-0.5 bg-blue-500 rounded-t-full"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={`px-4 py-2 text-sm font-medium transition relative ${
              activeTab === "results"
                ? "text-blue-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <FaChartLine /> Exam Results
            </span>
            {activeTab === "results" && (
              <span className="absolute bottom-[-5px] left-0 w-full h-0.5 bg-blue-500 rounded-t-full"></span>
            )}
          </button>
        </div>

        {activeTab === "learning" && (
          <>
            {/* Profile Card with Credentials */}
            <div className="mb-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-1">
                    <FaUser className="text-blue-400" />{" "}
                    {session?.user?.name || "Student"}
                  </h2>
                  <p className="text-slate-400">{session?.user?.email}</p>
                </div>
                <button
                  onClick={() =>
                    setCredentialsModal({
                      isOpen: true,
                      credentials: {
                        email: session?.user?.email,
                        password: "••••••••",
                      },
                    })
                  }
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-medium transition flex items-center gap-2"
                >
                  <FaKey className="text-lg" /> View Login Credentials
                </button>
              </div>
              <p className="text-slate-400 text-sm">
                Role: <span className="text-blue-400 font-semibold">Student</span>
              </p>
            </div>

            {/* Class Content */}
            <div className="mb-12">
              <StudentClassContent />
            </div>
          </>
        )}

        {activeTab === "results" && <StudentResultsView />}
      </div>

      <CredentialsModal
        isOpen={credentialsModal.isOpen}
        credentials={credentialsModal.credentials}
        onClose={() =>
          setCredentialsModal({ isOpen: false, credentials: null })
        }
      />
    </DashboardLayout>
  );
}
