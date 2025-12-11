"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import Sidebar from "@/components/Sidebar";
import EventFeed from "./EventFeed";
import CSVUploader from "@/components/CSVUploader";
import AttendanceManager from "@/components/AttendanceManager";
import CredentialsModal from "@/components/CredentialsModal";
import PasswordField from "@/components/PasswordField";
import {
  FaUserGraduate,
  FaChalkboardTeacher,
  FaLayerGroup,
  FaEdit,
  FaTrash,
  FaPlus,
  FaCalendarCheck,
  FaSignOutAlt,
  FaKey,
  FaDownload,
} from "react-icons/fa";
import StudentManager from "@/components/dashboard/StudentManager";
import EventHub from "@/components/events/EventHub";
import DashboardOverview from "@/components/DashboardOverview";
import TeacherAttendanceReport from "@/components/TeacherAttendanceReport";

export default function SchoolDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [attendanceSubTab, setAttendanceSubTab] = useState("students"); // 'students' or 'teachers'
  const [teachers, setTeachers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms State
  const [teacherForm, setTeacherForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    roles: ["SUBJECT_TEACHER"],
    assignments: [],
    password: "",
  });
  const [classroomForm, setClassroomForm] = useState({
    name: "",
    capacity: 30,
  });
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [editingClassroom, setEditingClassroom] = useState(null);

  // Credentials Modal State
  const [credentialsModal, setCredentialsModal] = useState({
    isOpen: false,
    credentials: null,
  });

  const [schoolConfig, setSchoolConfig] = useState({ teacherRoles: [] });
  const [academicsTab, setAcademicsTab] = useState("roles"); // 'roles' or 'subjects'
  const [newSubject, setNewSubject] = useState({ name: "", code: "" });
  const [selectedClassroom, setSelectedClassroom] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") fetchData();
  }, [status, router]);

  const fetchData = async () => {
    try {

      const teachersRes = await fetch("/api/teachers", { cache: "no-store" });
      const classroomsRes = await fetch("/api/classrooms", {
        cache: "no-store",
      });
      const configRes = await fetch("/api/school/config", {
        cache: "no-store",
      });

      if (teachersRes.ok) {
        setTeachers((await teachersRes.json()).teachers);
      } else {
        // For unauthorized or other errors, just clear teachers and avoid noisy console
        setTeachers([]);
      }

      if (classroomsRes.ok) {
        const cData = await classroomsRes.json();
        setClassrooms(cData.classrooms);
      } else {
        const err = await classroomsRes.json();
        console.error("Classrooms Fetch Error:", err);
        alert(`Failed to fetch classrooms: ${err.error || err.message}`);
      }

      if (configRes.ok) {
        const configData = await configRes.json();
        // Handle both { data: config } and { config: config } formats
        setSchoolConfig(
          configData.data ||
            configData.config || { teacherRoles: [], subjects: [] }
        );
      } else {
        setSchoolConfig({ teacherRoles: [], subjects: [] });
      }
    } catch (error) {
      console.error("Error fetching data", error);
      setSchoolConfig({ teacherRoles: [], subjects: [] });
    } finally {
      setLoading(false);
    }
  };

  // Student CRUD

  // Teacher CRUD
  const createTeacher = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teacherForm),
      });
      if (res.ok) {
        const data = await res.json();
        setTeachers([data.teacher, ...teachers]);
        // Show credentials modal
        if (data.credentials) {
          setCredentialsModal({ isOpen: true, credentials: data.credentials });
        }
        setTeacherForm({
          name: "",
          email: "",
          phone: "",
          subject: "",
          roles: ["SUBJECT_TEACHER"],
          assignments: [],
          password: "",
        });
      }
    } catch (error) {
      console.error("Error creating teacher", error);
    }
  };

  const updateTeacher = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/teachers/${editingTeacher._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTeacher),
      });
      if (res.ok) {
        const data = await res.json();
        setTeachers(
          teachers.map((t) => (t._id === editingTeacher._id ? data.teacher : t))
        );
        setEditingTeacher(null);
      }
    } catch (error) {
      console.error("Error updating teacher", error);
    }
  };

  const deleteTeacher = async (id) => {
    if (!confirm("Delete this teacher?")) return;
    try {
      const res = await fetch(`/api/teachers/${id}`, { method: "DELETE" });
      if (res.ok) setTeachers(teachers.filter((t) => t._id !== id));
    } catch (error) {
      console.error("Error deleting teacher", error);
    }
  };

  const resetTeacherPassword = async (id) => {
    if (
      !confirm(
        "Reset password for this teacher? A new password will be generated."
      )
    )
      return;
    try {
      const res = await fetch(`/api/teachers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        // Show credentials modal
        if (data.credentials) {
          setCredentialsModal({ isOpen: true, credentials: data.credentials });
        }
        // Update the teacher list
        fetchData();
      }
    } catch (error) {
      console.error("Error resetting password", error);
    }
  };

  const handleBulkTeacherUpload = async (data) => {
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const resData = await res.json();
        alert(`Successfully imported ${resData.count} teachers`);
        fetchData(); // Reload to get updated list
      } else {
        const error = await res.json();
        alert(`Import failed: ${error.message}`);
      }
    } catch (error) {
      console.error("Bulk Import Error:", error);
      alert("Error importing teachers");
    }
  };

  // Classroom CRUD
  const createClassroom = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(classroomForm),
      });
      if (res.ok) {
        const data = await res.json();
        setClassrooms([...classrooms, data.classroom]);
        setClassroomForm({ name: "", capacity: 30 });
      }
    } catch (error) {
      console.error("Error creating classroom", error);
    }
  };

  const updateClassroom = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: editingClassroom.name,
        capacity: editingClassroom.capacity,
        classTeacher: editingClassroom.classTeacher,
        subjectTeachers: editingClassroom.subjectTeachers,
      };
      const res = await fetch(`/api/classrooms/${editingClassroom._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setClassrooms(
          classrooms.map((c) =>
            c._id === editingClassroom._id ? data.classroom : c
          )
        );
        setEditingClassroom(null);
      }
    } catch (error) {
      console.error("Error updating classroom", error);
    }
  };

  const deleteClassroom = async (id) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`/api/classrooms/${id}`, { method: "DELETE" });
      if (res.ok) {
        setClassrooms(classrooms.filter((c) => c._id !== id));
      }
    } catch (error) {
      console.error("Error deleting classroom", error);
    }
  };

  const updateClassroomSubjects = async (classroomId, newSubjects) => {
    const classroom = classrooms.find((c) => c._id === classroomId);
    if (!classroom) return;

    try {
      const res = await fetch(`/api/classrooms/${classroomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: classroom.name,
          capacity: classroom.capacity,
          classTeacher: classroom.classTeacher?._id || classroom.classTeacher,
          subjectTeachers: classroom.subjectTeachers?.map((st) => ({
            teacher: st.teacher?._id || st.teacher,
            subject: st.subject,
          })),
          subjects: newSubjects,
        }),
      });

      if (res.ok) {
        const updatedClassroom = (await res.json()).classroom;
        setClassrooms(
          classrooms.map((c) => (c._id === classroomId ? updatedClassroom : c))
        );
      } else {
        alert("Failed to update subjects");
      }
    } catch (error) {
      console.error("Error updating subjects:", error);
      alert("Error updating subjects");
    }
  };

  const updateSchoolConfig = async (newRoles, newSubjects) => {
    try {
      const payload = {};
      if (newRoles) payload.teacherRoles = newRoles;
      if (newSubjects) payload.subjects = newSubjects;

      const res = await fetch("/api/school/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setSchoolConfig(data.config);
      } else {
        alert("Failed to update config");
      }
    } catch (error) {
      console.error("Error updating config", error);
    }
  };

  if (loading) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans">
      <Sidebar role={session?.user?.role} />

      <main className="flex-1 p-8 ml-64 overflow-y-auto h-screen">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              School Dashboard
            </h1>
            <p className="text-slate-400 mt-1">
              Manage your school operations efficiently
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <div className="text-sm font-medium text-white">
                {session?.user?.name}
              </div>
              <div className="text-xs text-slate-400">
                {session?.user?.email}
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-full transition"
            >
              <FaSignOutAlt />
            </button>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-800 pb-1 overflow-x-auto">
          {[
            "overview",
            "students",
            "teachers",
            "classrooms",
            "attendance",
            "academics",
            "events",
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition relative whitespace-nowrap ${
                activeTab === tab
                  ? "text-emerald-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab === "events"
                ? "Event Management"
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <span className="absolute bottom-[-5px] left-0 w-full h-0.5 bg-emerald-500 rounded-t-full"></span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <>
            <DashboardOverview />
            {/* Events Section */}
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 mt-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FaCalendarCheck className="text-emerald-400" />
                Upcoming Events
              </h2>
              <EventFeed />
            </div>
          </>
        )}

        {activeTab === "students" && <StudentManager classrooms={classrooms} />}

        {activeTab === "teachers" && (
          <div className="space-y-6">
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-4">
                {editingTeacher ? "Edit Teacher" : "Add New Teacher"}
              </h2>
              <form
                onSubmit={editingTeacher ? updateTeacher : createTeacher}
                className="space-y-4"
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Name"
                    value={
                      editingTeacher ? editingTeacher.name : teacherForm.name
                    }
                    onChange={(e) =>
                      editingTeacher
                        ? setEditingTeacher({
                            ...editingTeacher,
                            name: e.target.value,
                          })
                        : setTeacherForm({
                            ...teacherForm,
                            name: e.target.value,
                          })
                    }
                    className="bg-slate-800 text-white p-2 rounded"
                    required
                  />
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="Email"
                      value={
                        editingTeacher
                          ? editingTeacher.email
                          : teacherForm.email
                      }
                      onChange={(e) =>
                        editingTeacher
                          ? setEditingTeacher({
                              ...editingTeacher,
                              email: e.target.value,
                            })
                          : setTeacherForm({
                              ...teacherForm,
                              email: e.target.value,
                            })
                      }
                      className="bg-slate-800 text-white p-2 rounded w-full"
                      required
                    />
                    {!editingTeacher && (
                      <input
                        type="text"
                        placeholder="Password"
                        value={teacherForm.password}
                        onChange={(e) =>
                          setTeacherForm({
                            ...teacherForm,
                            password: e.target.value,
                          })
                        }
                        className="bg-slate-800 text-white p-2 rounded w-full"
                        required
                      />
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Phone"
                    value={
                      editingTeacher ? editingTeacher.phone : teacherForm.phone
                    }
                    onChange={(e) =>
                      editingTeacher
                        ? setEditingTeacher({
                            ...editingTeacher,
                            phone: e.target.value,
                          })
                        : setTeacherForm({
                            ...teacherForm,
                            phone: e.target.value,
                          })
                    }
                    className="bg-slate-800 text-white p-2 rounded"
                  />
                  <input
                    type="text"
                    placeholder="Primary Subject"
                    value={
                      editingTeacher
                        ? editingTeacher.subject
                        : teacherForm.subject
                    }
                    onChange={(e) =>
                      editingTeacher
                        ? setEditingTeacher({
                            ...editingTeacher,
                            subject: e.target.value,
                          })
                        : setTeacherForm({
                            ...teacherForm,
                            subject: e.target.value,
                          })
                    }
                    className="bg-slate-800 text-white p-2 rounded"
                    required
                  />
                </div>

                {/* Custom Roles */}
                <div className="bg-slate-800 p-3 rounded">
                  <span className="text-slate-400 text-sm block mb-2">
                    Custom Roles (e.g. Principal, Sports Head)
                  </span>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(editingTeacher
                      ? editingTeacher.roles
                      : teacherForm.roles
                    ).map((role, i) => (
                      <span
                        key={i}
                        className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs flex items-center gap-1"
                      >
                        {role}
                        <button
                          type="button"
                          onClick={() => {
                            const newRoles = (
                              editingTeacher
                                ? editingTeacher.roles
                                : teacherForm.roles
                            ).filter((_, idx) => idx !== i);
                            editingTeacher
                              ? setEditingTeacher({
                                  ...editingTeacher,
                                  roles: newRoles,
                                })
                              : setTeacherForm({
                                  ...teacherForm,
                                  roles: newRoles,
                                });
                          }}
                          className="hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add Role"
                      id="customRoleInput"
                      className="bg-slate-700 text-white p-1 px-2 rounded text-sm flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = e.target.value.trim();
                          if (val) {
                            const currentRoles = editingTeacher
                              ? editingTeacher.roles
                              : teacherForm.roles;
                            if (!currentRoles.includes(val)) {
                              const newRoles = [...currentRoles, val];
                              editingTeacher
                                ? setEditingTeacher({
                                    ...editingTeacher,
                                    roles: newRoles,
                                  })
                                : setTeacherForm({
                                    ...teacherForm,
                                    roles: newRoles,
                                  });
                            }
                            e.target.value = "";
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input =
                          document.getElementById("customRoleInput");
                        const val = input.value.trim();
                        if (val) {
                          const currentRoles = editingTeacher
                            ? editingTeacher.roles
                            : teacherForm.roles;
                          if (!currentRoles.includes(val)) {
                            const newRoles = [...currentRoles, val];
                            editingTeacher
                              ? setEditingTeacher({
                                  ...editingTeacher,
                                  roles: newRoles,
                                })
                              : setTeacherForm({
                                  ...teacherForm,
                                  roles: newRoles,
                                });
                          }
                          input.value = "";
                        }
                      }}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-3 rounded text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Assignments */}
                <div className="bg-slate-800 p-3 rounded">
                  <span className="text-slate-400 text-sm block mb-2">
                    Class Assignments
                  </span>
                  <div className="space-y-2">
                    {(editingTeacher
                      ? editingTeacher.assignments
                      : teacherForm.assignments
                    ).map((assignment, i) => (
                      <div
                        key={i}
                        className="flex flex-wrap gap-2 items-center bg-slate-900/50 p-2 rounded"
                      >
                        <select
                          value={assignment.classId}
                          onChange={(e) => {
                            const newAssignments = [
                              ...(editingTeacher
                                ? editingTeacher.assignments
                                : teacherForm.assignments),
                            ];
                            newAssignments[i].classId = e.target.value;
                            editingTeacher
                              ? setEditingTeacher({
                                  ...editingTeacher,
                                  assignments: newAssignments,
                                })
                              : setTeacherForm({
                                  ...teacherForm,
                                  assignments: newAssignments,
                                });
                          }}
                          className="bg-slate-700 text-white p-1 rounded text-sm"
                        >
                          <option value="">Select Class</option>
                          {classrooms.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={assignment.role}
                          onChange={(e) => {
                            const newAssignments = [
                              ...(editingTeacher
                                ? editingTeacher.assignments
                                : teacherForm.assignments),
                            ];
                            newAssignments[i].role = e.target.value;
                            editingTeacher
                              ? setEditingTeacher({
                                  ...editingTeacher,
                                  assignments: newAssignments,
                                })
                              : setTeacherForm({
                                  ...teacherForm,
                                  assignments: newAssignments,
                                });
                          }}
                          className="bg-slate-700 text-white p-1 rounded text-sm"
                        >
                          <option value="SUBJECT_TEACHER">
                            Subject Teacher
                          </option>
                          <option value="CLASS_TEACHER">Class Teacher</option>
                        </select>
                        {assignment.role === "SUBJECT_TEACHER" &&
                          (() => {
                            const selectedClass = classrooms.find(
                              (c) => c._id === assignment.classId
                            );
                            const classSubjects = selectedClass?.subjects || [];

                            if (classSubjects.length > 0) {
                              return (
                                <select
                                  value={assignment.subject}
                                  onChange={(e) => {
                                    const newAssignments = [
                                      ...(editingTeacher
                                        ? editingTeacher.assignments
                                        : teacherForm.assignments),
                                    ];
                                    newAssignments[i].subject = e.target.value;
                                    editingTeacher
                                      ? setEditingTeacher({
                                          ...editingTeacher,
                                          assignments: newAssignments,
                                        })
                                      : setTeacherForm({
                                          ...teacherForm,
                                          assignments: newAssignments,
                                        });
                                  }}
                                  className="bg-slate-700 text-white p-1 rounded text-sm flex-1"
                                >
                                  <option value="">Select Subject</option>
                                  {classSubjects.map((sub, idx) => (
                                    <option key={idx} value={sub.name}>
                                      {sub.name}
                                    </option>
                                  ))}
                                </select>
                              );
                            } else {
                              return (
                                <input
                                  type="text"
                                  placeholder="Subject"
                                  value={assignment.subject}
                                  onChange={(e) => {
                                    const newAssignments = [
                                      ...(editingTeacher
                                        ? editingTeacher.assignments
                                        : teacherForm.assignments),
                                    ];
                                    newAssignments[i].subject = e.target.value;
                                    editingTeacher
                                      ? setEditingTeacher({
                                          ...editingTeacher,
                                          assignments: newAssignments,
                                        })
                                      : setTeacherForm({
                                          ...teacherForm,
                                          assignments: newAssignments,
                                        });
                                  }}
                                  className="bg-slate-700 text-white p-1 rounded text-sm flex-1"
                                />
                              );
                            }
                          })()}
                        <button
                          type="button"
                          onClick={() => {
                            const newAssignments = (
                              editingTeacher
                                ? editingTeacher.assignments
                                : teacherForm.assignments
                            ).filter((_, idx) => idx !== i);
                            editingTeacher
                              ? setEditingTeacher({
                                  ...editingTeacher,
                                  assignments: newAssignments,
                                })
                              : setTeacherForm({
                                  ...teacherForm,
                                  assignments: newAssignments,
                                });
                          }}
                          className="text-red-400 hover:text-red-300 px-2"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const current = editingTeacher
                          ? editingTeacher.assignments
                          : teacherForm.assignments;
                        const newAssignments = [
                          ...current,
                          { classId: "", role: "SUBJECT_TEACHER", subject: "" },
                        ];
                        editingTeacher
                          ? setEditingTeacher({
                              ...editingTeacher,
                              assignments: newAssignments,
                            })
                          : setTeacherForm({
                              ...teacherForm,
                              assignments: newAssignments,
                            });
                      }}
                      className="text-emerald-400 text-sm flex items-center gap-1 hover:text-emerald-300"
                    >
                      <FaPlus /> Add Assignment
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  {editingTeacher && (
                    <button
                      type="button"
                      onClick={() => setEditingTeacher(null)}
                      className="text-slate-400 px-4 py-2"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="bg-emerald-600 text-white px-4 py-2 rounded font-bold hover:bg-emerald-500"
                  >
                    {editingTeacher ? "Update Teacher" : "Add Teacher"}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-4">
                Bulk Import Teachers
              </h2>
              <CSVUploader
                onUpload={handleBulkTeacherUpload}
                label="Upload Teachers CSV"
              />
              <p className="text-xs text-slate-500 mt-2">
                Format: Name, Email, Phone, Subject, Roles, Assignments
                <br />
                Assignments Example: "Class Teacher: 10-A; Subject Teacher: Math
                (10-A)"
              </p>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">
                  Teacher List
                </h2>
                <button
                  onClick={() => {
                    const headers = ["Name,Email,Phone,Roles,Assignments"];
                    const rows = teachers.map((t) => {
                      const assignments = [];
                      if (t.detailedRoles?.classTeacherOf?.length)
                        assignments.push(
                          `Class Teacher: ${t.detailedRoles.classTeacherOf.join(
                            ", "
                          )}`
                        );
                      if (t.detailedRoles?.subjectTeacherOf?.length)
                        assignments.push(
                          `Subject Teacher: ${t.detailedRoles.subjectTeacherOf.join(
                            "; "
                          )}`
                        );
                      return `${t.name},${t.email},${
                        t.phone || ""
                      },"${t.roles.join(", ")}","${assignments.join(" | ")}"`;
                    });
                    const csvContent =
                      "data:text/csv;charset=utf-8," +
                      [headers, ...rows].join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "teachers.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-1 rounded transition"
                >
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800 text-slate-400 uppercase text-xs">
                    <tr>
                      <th className="p-3">Profile</th>
                      <th className="p-3">Credentials & Assignments</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((teacher) => (
                      <tr
                        key={teacher._id}
                        className="border-b border-slate-800 hover:bg-slate-800/50"
                      >
                        <td className="p-3 align-top">
                          <div className="font-bold text-white">
                            {teacher.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {teacher.email}
                          </div>
                          {teacher.phone && (
                            <div className="text-xs text-slate-400">
                              {teacher.phone}
                            </div>
                          )}
                          <div className="text-xs text-slate-500">
                            {teacher.subject}
                          </div>
                        </td>
                        <td className="p-3 align-top">
                          {teacher.visiblePassword && (
                            <div className="mb-2">
                              <p className="text-xs text-slate-400 mb-1">
                                Password:
                              </p>
                              <PasswordField
                                password={teacher.visiblePassword}
                                showCopy={true}
                              />
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {teacher.roles.map((role, i) => (
                              <span
                                key={i}
                                className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[10px]"
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 align-top">
                          <div className="space-y-1">
                            {teacher.detailedRoles?.classTeacherOf?.length >
                              0 && (
                              <div className="flex items-start gap-2">
                                <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap">
                                  Class Teacher
                                </span>
                                <span className="text-slate-300 text-sm">
                                  {teacher.detailedRoles.classTeacherOf.join(
                                    ", "
                                  )}
                                </span>
                              </div>
                            )}
                            {teacher.detailedRoles?.subjectTeacherOf?.length >
                              0 && (
                              <div className="flex items-start gap-2">
                                <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap">
                                  Subject Teacher
                                </span>
                                <div className="flex flex-wrap gap-x-3 gap-y-1">
                                  {teacher.detailedRoles.subjectTeacherOf.map(
                                    (role, i) => (
                                      <span
                                        key={i}
                                        className="text-slate-300 text-sm"
                                      >
                                        {role}
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                            {!teacher.detailedRoles?.classTeacherOf?.length &&
                              !teacher.detailedRoles?.subjectTeacherOf
                                ?.length && (
                                <span className="text-slate-500 italic text-xs">
                                  No active class assignments
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="p-3 align-top flex gap-2">
                          <button
                            onClick={() =>
                              setCredentialsModal({
                                isOpen: true,
                                credentials: {
                                  email: teacher.email,
                                  password: teacher.visiblePassword,
                                },
                              })
                            }
                            className="text-emerald-400 hover:text-emerald-300 text-sm px-2 py-1 bg-emerald-500/10 rounded transition"
                            title="View credentials"
                          >
                            Credentials
                          </button>
                          <button
                            onClick={() => resetTeacherPassword(teacher._id)}
                            className="text-yellow-400 hover:text-yellow-300 flex items-center gap-1 text-sm px-2 py-1 bg-yellow-500/10 rounded transition"
                            title="Reset password"
                          >
                            <FaKey /> Reset
                          </button>
                          <button
                            onClick={() => {
                              const assignments = [];
                              if (teacher.detailedRoles?.classTeacherOf) {
                                teacher.detailedRoles.classTeacherOf.forEach(
                                  (className) => {
                                    const cls = classrooms.find(
                                      (c) => c.name === className
                                    );
                                    if (cls)
                                      assignments.push({
                                        classId: cls._id,
                                        role: "CLASS_TEACHER",
                                      });
                                  }
                                );
                              }
                              if (teacher.detailedRoles?.subjectTeacherOf) {
                                teacher.detailedRoles.subjectTeacherOf.forEach(
                                  (str) => {
                                    const match = str.match(/(.*)\s\((.*)\)/);
                                    if (match) {
                                      const subject = match[1];
                                      const className = match[2];
                                      const cls = classrooms.find(
                                        (c) => c.name === className
                                      );
                                      if (cls)
                                        assignments.push({
                                          classId: cls._id,
                                          role: "SUBJECT_TEACHER",
                                          subject,
                                        });
                                    }
                                  }
                                );
                              }
                              setEditingTeacher({ ...teacher, assignments });
                            }}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => deleteTeacher(teacher._id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "attendance" && (
          <div className="space-y-6">
            {/* Attendance Subtabs */}
            <div className="flex gap-4 border-b border-slate-700 pb-2">
              <button
                onClick={() => setAttendanceSubTab("students")}
                className={`px-4 py-2 text-sm font-medium transition ${
                  attendanceSubTab === "students"
                    ? "text-emerald-400 border-b-2 border-emerald-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Student Attendance
              </button>
              <button
                onClick={() => setAttendanceSubTab("teachers")}
                className={`px-4 py-2 text-sm font-medium transition ${
                  attendanceSubTab === "teachers"
                    ? "text-emerald-400 border-b-2 border-emerald-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Teacher Attendance
              </button>
            </div>

            {attendanceSubTab === "students" && (
              <AttendanceManager teachers={teachers} classrooms={classrooms} />
            )}

            {attendanceSubTab === "teachers" && <TeacherAttendanceReport />}
          </div>
        )}

        {activeTab === "events" && <EventHub />}

        {activeTab === "academics" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Teacher Roles Management */}
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Manage Teacher Roles
                </h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {schoolConfig?.teacherRoles?.map((role, i) => (
                    <div
                      key={i}
                      className="bg-slate-800 text-white px-3 py-1 rounded-full flex items-center gap-2"
                    >
                      {role}
                      <button
                        onClick={() => {
                          if (confirm(`Remove role "${role}"?`)) {
                            updateSchoolConfig(
                              (schoolConfig?.teacherRoles || []).filter(
                                (r) => r !== role
                              ),
                              null
                            );
                          }
                        }}
                        className="text-slate-400 hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="newRoleInput"
                    placeholder="Add new role (e.g. Librarian)"
                    className="bg-slate-800 text-white p-2 rounded flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = e.target.value.trim();
                        if (
                          val &&
                          !(schoolConfig?.teacherRoles || []).includes(val)
                        ) {
                          updateSchoolConfig(
                            [...(schoolConfig?.teacherRoles || []), val],
                            null
                          );
                          e.target.value = "";
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById("newRoleInput");
                      const val = input.value.trim();
                      if (
                        val &&
                        !(schoolConfig?.teacherRoles || []).includes(val)
                      ) {
                        updateSchoolConfig(
                          [...(schoolConfig?.teacherRoles || []), val],
                          null
                        );
                        input.value = "";
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-bold"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Global Subjects Management */}
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Global Subject List
                </h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(schoolConfig.subjects || []).map((subject, i) => (
                    <div
                      key={i}
                      className="bg-slate-800 text-white px-3 py-1 rounded-full flex items-center gap-2"
                    >
                      {subject}
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Remove subject "${subject}" from global list?`
                            )
                          ) {
                            updateSchoolConfig(
                              null,
                              (schoolConfig.subjects || []).filter(
                                (s) => s !== subject
                              )
                            );
                          }
                        }}
                        className="text-slate-400 hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="newGlobalSubjectInput"
                    placeholder="Add new subject (e.g. Physics)"
                    className="bg-slate-800 text-white p-2 rounded flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = e.target.value.trim();
                        if (
                          val &&
                          !(schoolConfig.subjects || []).includes(val)
                        ) {
                          updateSchoolConfig(null, [
                            ...(schoolConfig.subjects || []),
                            val,
                          ]);
                          e.target.value = "";
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById(
                        "newGlobalSubjectInput"
                      );
                      const val = input.value.trim();
                      if (val && !(schoolConfig.subjects || []).includes(val)) {
                        updateSchoolConfig(null, [
                          ...(schoolConfig.subjects || []),
                          val,
                        ]);
                        input.value = "";
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-bold"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Class Subjects Management */}
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Manage Class Subjects
                </h2>
                <div className="mb-4">
                  <label className="block text-slate-400 text-sm mb-2">
                    Select Class to Manage
                  </label>
                  <select
                    value={selectedClassroom || ""}
                    onChange={(e) => setSelectedClassroom(e.target.value)}
                    className="w-full bg-slate-800 text-white p-2 rounded"
                  >
                    <option value="">-- Select Class --</option>
                    {classrooms.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedClassroom ? (
                  <>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {classrooms
                        .find((c) => c._id === selectedClassroom)
                        ?.subjects?.map((sub, i) => (
                          <div
                            key={i}
                            className="bg-slate-800 text-white px-3 py-1 rounded-full flex items-center gap-2"
                          >
                            {sub.name}
                            <button
                              onClick={() => {
                                const cls = classrooms.find(
                                  (c) => c._id === selectedClassroom
                                );
                                const newSubjects = cls.subjects.filter(
                                  (_, idx) => idx !== i
                                );
                                updateClassroomSubjects(
                                  selectedClassroom,
                                  newSubjects
                                );
                              }}
                              className="text-slate-400 hover:text-red-400"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      {!classrooms.find((c) => c._id === selectedClassroom)
                        ?.subjects?.length && (
                        <div className="text-slate-500 italic text-sm">
                          No subjects assigned to this class.
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add new subject (e.g. Physics)"
                        value={newSubject.name}
                        onChange={(e) =>
                          setNewSubject({ ...newSubject, name: e.target.value })
                        }
                        className="bg-slate-800 text-white p-2 rounded flex-1"
                        list="globalSubjects"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newSubject.name.trim()) {
                            const cls = classrooms.find(
                              (c) => c._id === selectedClassroom
                            );
                            const newSubjects = [
                              ...(cls.subjects || []),
                              { name: newSubject.name.trim(), code: "" },
                            ];
                            updateClassroomSubjects(
                              selectedClassroom,
                              newSubjects
                            );
                            setNewSubject({ name: "", code: "" });
                          }
                        }}
                      />
                      <datalist id="globalSubjects">
                        {(schoolConfig.subjects || []).map((s, i) => (
                          <option key={i} value={s} />
                        ))}
                      </datalist>
                      <button
                        onClick={() => {
                          if (newSubject.name.trim()) {
                            const cls = classrooms.find(
                              (c) => c._id === selectedClassroom
                            );
                            const newSubjects = [
                              ...(cls.subjects || []),
                              { name: newSubject.name.trim(), code: "" },
                            ];
                            updateClassroomSubjects(
                              selectedClassroom,
                              newSubjects
                            );
                            setNewSubject({ name: "", code: "" });
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-bold"
                      >
                        Add
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center text-slate-500 italic border-2 border-dashed border-slate-800 rounded-xl p-8">
                    Select a class to view and manage subjects
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "classrooms" && (
          <div className="space-y-6">
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-4">
                Add New Class
              </h2>
              <form
                onSubmit={createClassroom}
                className="grid md:grid-cols-2 gap-4"
              >
                <input
                  type="text"
                  placeholder="Class Name (e.g. 10-A)"
                  value={classroomForm.name}
                  onChange={(e) =>
                    setClassroomForm({ ...classroomForm, name: e.target.value })
                  }
                  className="bg-slate-800 text-white p-2 rounded"
                  required
                />
                <input
                  type="number"
                  placeholder="Capacity"
                  value={classroomForm.capacity}
                  onChange={(e) =>
                    setClassroomForm({
                      ...classroomForm,
                      capacity: parseInt(e.target.value),
                    })
                  }
                  className="bg-slate-800 text-white p-2 rounded"
                  required
                />
                <button
                  type="submit"
                  className="bg-emerald-600 text-white px-4 py-2 rounded font-bold md:col-span-2 hover:bg-emerald-500"
                >
                  Create Class
                </button>
              </form>
            </div>
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-4">
                Classrooms
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                {classrooms.map((classroom) => (
                  <div
                    key={classroom._id}
                    className="bg-slate-800 p-4 rounded-xl border border-slate-700 relative group"
                  >
                    <h3 className="text-lg font-bold text-white">
                      {classroom.name}
                    </h3>
                    <p className="text-slate-400 text-sm">
                      Capacity: {classroom.capacity}
                    </p>
                    <p className="text-slate-400 text-sm">
                      Class Teacher:{" "}
                      {classroom.classTeacher?.name || "Unassigned"}
                    </p>
                    <div className="mt-2">
                      <p className="text-xs text-slate-500 uppercase font-bold mb-1">
                        Subject Teachers
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {classroom.subjectTeachers?.map((st, i) => (
                          <span
                            key={i}
                            className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded"
                          >
                            {st.subject}: {st.teacher?.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition flex gap-2">
                      <button
                        onClick={() => setEditingClassroom(classroom)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => deleteClassroom(classroom._id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {editingTeacher && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">
                Edit Teacher
              </h3>
              <form onSubmit={updateTeacher} className="space-y-4">
                <input
                  type="text"
                  value={editingTeacher.name}
                  onChange={(e) =>
                    setEditingTeacher({
                      ...editingTeacher,
                      name: e.target.value,
                    })
                  }
                  className="w-full bg-slate-800 text-white p-2 rounded"
                />
                <input
                  type="email"
                  value={editingTeacher.email}
                  onChange={(e) =>
                    setEditingTeacher({
                      ...editingTeacher,
                      email: e.target.value,
                    })
                  }
                  className="w-full bg-slate-800 text-white p-2 rounded"
                />
                <input
                  type="text"
                  value={editingTeacher.subject}
                  onChange={(e) =>
                    setEditingTeacher({
                      ...editingTeacher,
                      subject: e.target.value,
                    })
                  }
                  className="w-full bg-slate-800 text-white p-2 rounded"
                />
                <div className="bg-slate-800 p-2 rounded">
                  <span className="text-slate-400 text-sm block mb-1">
                    Roles
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(schoolConfig?.teacherRoles || []).map((role) => (
                      <label
                        key={role}
                        className="flex items-center gap-1 text-xs text-slate-300 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={editingTeacher.roles?.includes(role)}
                          onChange={(e) => {
                            const currentRoles = editingTeacher.roles || [];
                            const newRoles = e.target.checked
                              ? [...currentRoles, role]
                              : currentRoles.filter((r) => r !== role);
                            setEditingTeacher({
                              ...editingTeacher,
                              roles: newRoles,
                            });
                          }}
                          className="rounded border-slate-600 bg-slate-700 text-emerald-500"
                        />
                        {role}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTeacher(null)}
                    className="text-slate-400 px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 text-white px-4 py-2 rounded"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingClassroom && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">
                Edit Classroom
              </h3>
              <form onSubmit={updateClassroom} className="space-y-4">
                <input
                  type="text"
                  value={editingClassroom.name}
                  onChange={(e) =>
                    setEditingClassroom({
                      ...editingClassroom,
                      name: e.target.value,
                    })
                  }
                  className="w-full bg-slate-800 text-white p-2 rounded"
                />
                <input
                  type="number"
                  value={editingClassroom.capacity}
                  onChange={(e) =>
                    setEditingClassroom({
                      ...editingClassroom,
                      capacity: parseInt(e.target.value),
                    })
                  }
                  className="w-full bg-slate-800 text-white p-2 rounded"
                />

                <div>
                  <label className="block text-slate-400 text-sm mb-1">
                    Class Teacher
                  </label>
                  <select
                    value={
                      editingClassroom.classTeacher?._id ||
                      editingClassroom.classTeacher ||
                      ""
                    }
                    onChange={(e) =>
                      setEditingClassroom({
                        ...editingClassroom,
                        classTeacher: e.target.value,
                      })
                    }
                    className="w-full bg-slate-800 text-white p-2 rounded"
                  >
                    <option value="">Select Class Teacher</option>
                    {teachers.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-1">
                    Subject Teachers
                  </label>
                  {editingClassroom.subjectTeachers?.map((st, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <select
                        value={st.teacher?._id || st.teacher || ""}
                        onChange={(e) => {
                          const newSubjectTeachers = [
                            ...editingClassroom.subjectTeachers,
                          ];
                          newSubjectTeachers[index].teacher = e.target.value;
                          setEditingClassroom({
                            ...editingClassroom,
                            subjectTeachers: newSubjectTeachers,
                          });
                        }}
                        className="bg-slate-800 text-white p-2 rounded flex-1"
                      >
                        <option value="">Select Teacher</option>
                        {teachers.map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Subject"
                        value={st.subject}
                        onChange={(e) => {
                          const newSubjectTeachers = [
                            ...editingClassroom.subjectTeachers,
                          ];
                          newSubjectTeachers[index].subject = e.target.value;
                          setEditingClassroom({
                            ...editingClassroom,
                            subjectTeachers: newSubjectTeachers,
                          });
                        }}
                        className="bg-slate-800 text-white p-2 rounded flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newSubjectTeachers =
                            editingClassroom.subjectTeachers.filter(
                              (_, i) => i !== index
                            );
                          setEditingClassroom({
                            ...editingClassroom,
                            subjectTeachers: newSubjectTeachers,
                          });
                        }}
                        className="text-red-400 px-2"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const current = editingClassroom.subjectTeachers || [];
                      setEditingClassroom({
                        ...editingClassroom,
                        subjectTeachers: [
                          ...current,
                          { teacher: "", subject: "" },
                        ],
                      });
                    }}
                    className="text-emerald-400 text-sm flex items-center gap-1"
                  >
                    <FaPlus /> Add Subject Teacher
                  </button>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingClassroom(null)}
                    className="text-slate-400 px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 text-white px-4 py-2 rounded"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <CredentialsModal
          isOpen={credentialsModal.isOpen}
          credentials={credentialsModal.credentials}
          onClose={() =>
            setCredentialsModal({ isOpen: false, credentials: null })
          }
        />
      </main>
    </div>
  );
}
