"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import CredentialsModal from "@/components/CredentialsModal";
import StudentClassContent from "@/components/StudentClassContent";
import { FaUser, FaGraduationCap, FaKey } from "react-icons/fa";

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
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
