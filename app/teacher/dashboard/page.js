"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import CredentialsModal from "@/components/CredentialsModal";
import PasswordField from "@/components/PasswordField";
import TeacherAttendanceManager from "@/components/TeacherAttendanceManager";
import AttendanceReports from "@/components/AttendanceReports";
import MarksManager from "@/components/MarksManager";
import TeacherSubjectManager from "@/components/TeacherSubjectManager";
import {
  FaUser,
  FaEnvelope,
  FaCalendarCheck,
  FaChartBar,
  FaFileAlt,
} from "react-icons/fa";

export default function TeacherDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [credentialsModal, setCredentialsModal] = useState({
    isOpen: false,
    credentials: null,
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") fetchSubjects();
  }, [status, router]);

  const fetchSubjects = async () => {
    try {
      const res = await fetch("/api/teacher/subjects");
      if (res.ok) {
        const data = await res.json();
        setSubjects(data.subjects);
      }
    } catch (error) {
      console.error("Error fetching subjects", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-white">Loading...</div>;

  return (
    <DashboardLayout>
      {/* Profile & Credentials Card */}
      <div className="mb-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-1">
              <FaUser className="text-blue-400" />{" "}
              {session?.user?.name || "Teacher"}
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
          Role: <span className="text-blue-400 font-semibold">Teacher</span>
        </p>
      </div>

      {/* Attendance Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <FaCalendarCheck className="text-emerald-400" /> Attendance Management
        </h2>
        <TeacherAttendanceManager />
      </div>

      {/* Attendance Reports Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <FaChartBar className="text-purple-400" /> Attendance Analysis
        </h2>
        <AttendanceReports />
      </div>

      {/* Marks Management Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <FaFileAlt className="text-blue-400" /> Marks & Grades
        </h2>
        <MarksManager classrooms={[]} />
      </div>

      <TeacherSubjectManager />

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
