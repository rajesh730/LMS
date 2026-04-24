"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import CredentialsModal from "@/components/CredentialsModal";
import DashboardLayout from "@/components/DashboardLayout";
import EventHub from "@/components/events/EventHub";
import SubmissionReviewManager from "@/components/SubmissionReviewManager";
import {
  FaUser,
  FaChalkboardTeacher,
  FaExclamationTriangle,
  FaCalendarAlt,
} from "react-icons/fa";

export default function TeacherDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [credentialsModal, setCredentialsModal] = useState({
    isOpen: false,
    credentials: null,
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") return <div className="p-8 text-white">Loading...</div>;

  return (
    <DashboardLayout>
      {/* Profile & Credentials Card */}
      <div className="mb-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-1">
              <FaUser className="text-blue-400" />{" "}
              {session?.user?.name || "Mentor"}
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
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-medium transition"
          >
            View Login Credentials
          </button>
        </div>
        <p className="text-slate-400 text-sm">
          Role: <span className="text-blue-400 font-semibold">Mentor / Coordinator</span>
        </p>
      </div>

      <div className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <FaChalkboardTeacher className="text-emerald-400" /> Mentor Workspace
        </h2>
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 mb-8">
          <div className="flex items-start gap-4">
            <div className="bg-yellow-500/10 p-4 rounded-2xl">
              <FaExclamationTriangle className="text-2xl text-yellow-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Transition In Progress
              </h3>
              <p className="text-slate-400">
                This dashboard is shifting away from attendance, marks, and academic administration. The mentor workspace will focus on guiding talent, organizing activity content, and supporting school events.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <SubmissionReviewManager
            title="Mentor Review Queue"
            description="Shortlist student entries, leave coaching notes, and help the school prepare final event results."
            compact
          />

          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <h3 className="text-xl font-semibold text-white mb-2">
              Event Results Follow School Decisions
            </h3>
            <p className="text-slate-400">
              Mentors can review submissions and support participants here. Final placements and public winner publishing are now handled from the school admin results workspace.
            </p>
          </div>

          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
              <FaCalendarAlt className="text-blue-400" />
              Talent Events and Coordination
            </h3>
            <p className="text-slate-400">
              Use this workspace to follow upcoming talent events, help students prepare entries, and coordinate participation with your school team.
            </p>
          </div>

          <EventHub />
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
