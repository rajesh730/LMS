import React, { useState, useEffect } from "react";
import { Download } from "lucide-react";
import CSVUploader from "./CSVUploader";
import {
  buildNormalizedRow,
  getRowValue,
  friendlyUploadError,
  buildFailedRowsCsv,
  downloadTextFile,
} from "@/lib/bulkUpload";

const EnhancedStudentRegistration = ({ schoolId, onSuccess }) => {
  const scrollToTop = () => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const parseDateValue = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const [activeTab, setActiveTab] = useState("single"); // 'single' or 'bulk'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkUploadStatus, setBulkUploadStatus] = useState(null);
  const [grades, setGrades] = useState([]);
  
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    // Part 1: Student Details
    fullName: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    rollNumber: "",
    grade: "",
    address: "",
    bloodGroup: "",

    // Part 2: Parent Details
    guardianRelationship: "FATHER",
    parentName: "",
    parentContactNumber: "",
    parentEmail: "",
    parentAlternativeContact: "",
  });

  // Fetch grades
  useEffect(() => {
    const fetchGrades = async () => {
      if (!schoolId) {
        return;
      }
      try {
        const response = await fetch(`/api/schools/${schoolId}/config`);

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (data.data?.grades) {
          setGrades(data.data.grades);
        }
      } catch (err) {
        setGrades([]);
      }
    };
    fetchGrades();
  }, [schoolId]);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    
    // Validation
    if (!formData.fullName || !formData.grade || !formData.rollNumber) {
      setError("Please fill in all required student details (Name, Grade, Roll Number)");
      return;
    }

    setLoading(true);

    try {
      // Split Full Name
      const nameParts = formData.fullName.trim().split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || "."; // Default if no last name

      // Password is shown once after registration; username is generated server-side
      // so duplicate names/roll numbers across grades can be handled safely.
      const cleanFirstName = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const password = `${cleanFirstName}${formData.rollNumber}@123`;

      const payload = {
        password,
        
        // Student
        firstName,
        lastName,
        name: formData.fullName,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth || new Date(),
        gender: formData.gender || "OTHER",
        rollNumber: formData.rollNumber,
        grade: formData.grade,
        address: formData.address,
        bloodGroup: formData.bloodGroup,
        
        // Parent
        guardianRelationship: formData.guardianRelationship,
        parentName: formData.parentName || "To be added",
        parentContactNumber: formData.parentContactNumber || "To be added",
        parentEmail: formData.parentEmail,
        parentAlternativeContact: formData.parentAlternativeContact,
        
        school: schoolId,
      };

      let response;
      if (editingId) {
        const updatePayload = {
            ...payload,
            dob: payload.dateOfBirth,
            parentPhone: payload.parentContactNumber,
            emergencyContact: payload.parentAlternativeContact
        };
        
        response = await fetch(`/api/students/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatePayload),
        });
      } else {
        response = await fetch("/api/students/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      if (editingId) {
        setSuccess("Student updated successfully!");
        setTimeout(() => {
            setActiveTab('single');
            setEditingId(null);
            setFormData({
                fullName: "",
                phone: "",
                dateOfBirth: "",
                gender: "",
                rollNumber: "",
                grade: "",
                address: "",
                bloodGroup: "",
                guardianRelationship: "FATHER",
                parentName: "",
                parentContactNumber: "",
                parentEmail: "",
                parentAlternativeContact: "",
            });
        }, 1500);
      } else {
        const credentials = data.data || {};
        setSuccess(
          `Student registered successfully! Credentials: Username: ${
            credentials.username || "Generated"
          }, Password: ${credentials.password || password}`
        );
        
        // Reset form after delay
        setTimeout(() => {
            setFormData({
            fullName: "",
            phone: "",
            dateOfBirth: "",
            gender: "",
            rollNumber: "",
            grade: "",
            address: "",
          bloodGroup: "",
          guardianRelationship: "FATHER",
          parentName: "",
          parentContactNumber: "",
          parentEmail: "",
          parentAlternativeContact: "",
        });
        setSuccess("");
        if (onSuccess) onSuccess();
      }, 10000); // Longer delay to let them read credentials
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (parsedData) => {
    setLoading(true);
    setError("");
    setSuccess("");
    setBulkResult(null);
    setBulkUploadStatus({
      label: "Checking CSV rows",
      detail: `${parsedData.length} row(s) found in the selected file.`,
    });
    try {
        // 1. Map + validate every row in the browser first, keeping the original
        //    CSV row so failures can be exported and fixed.
        const valid = [];
        const invalid = [];

        parsedData.forEach((row, index) => {
            const rowNumber = index + 2; // +1 for header line, +1 for 1-based
            const normalizedRow = buildNormalizedRow(row);
            const fullName = String(getRowValue(normalizedRow, ["fullname", "name"])).trim();
            const rollNumber = String(getRowValue(normalizedRow, ["rollnumber", "rollno", "roll"])).trim();
            const grade = String(getRowValue(normalizedRow, ["grade", "class"])).trim();

            const missing = [];
            if (!fullName) missing.push("FullName");
            if (!rollNumber) missing.push("RollNumber");
            if (!grade) missing.push("Grade");

            if (missing.length > 0) {
                invalid.push({
                    name: fullName || "(no name)",
                    rowNumber,
                    reason: `Missing required value(s): ${missing.join(", ")}`,
                    row,
                });
                return;
            }

            const nameParts = fullName.split(" ").filter(Boolean);
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || ".";
            const parsedDob = parseDateValue(getRowValue(normalizedRow, ["dateofbirth", "dob"]));
            const username = fullName.toLowerCase().replace(/\s+/g, "");
            const password = `${firstName.toLowerCase()}${rollNumber}@123`;
            const guardianRelationship =
                String(getRowValue(normalizedRow, ["guardianrelationship", "relationship"]))
                    .trim()
                    .toUpperCase() || "FATHER";

            valid.push({
                _row: row,
                _rowNumber: rowNumber,
                firstName,
                lastName,
                username,
                password,
                email: getRowValue(normalizedRow, ["email"]) || "",
                grade,
                rollNumber,
                phone: getRowValue(normalizedRow, ["phone", "phonenumber", "contact"]),
                address: getRowValue(normalizedRow, ["address"]),
                gender: getRowValue(normalizedRow, ["gender"]) || "OTHER",
                dateOfBirth: parsedDob || new Date(),
                bloodGroup: getRowValue(normalizedRow, ["bloodgroup", "blood"]),
                guardianRelationship,
                parentName: getRowValue(normalizedRow, ["guardianname", "parentname", "fathername", "mothername"]) || "To be added",
                parentContactNumber: getRowValue(normalizedRow, ["guardianphone", "parentphone", "parentcontact", "guardiancontact"]) || "To be added",
                parentEmail: getRowValue(normalizedRow, ["guardianemail", "parentemail"]) || "",
                parentAlternativeContact: getRowValue(normalizedRow, ["guardianaltphone", "alternatephone", "secondaryphone"]),
            });
        });

        // 2. Nothing usable: explain why (empty file vs. header/cell problems).
        if (valid.length === 0) {
            if (invalid.length === 0) {
                throw new Error("Your file has no data rows. Add students below the header row and try again.");
            }
            setBulkResult({ success: [], failed: invalid });
            setError("No students could be uploaded. Your column headers may not match the template, or required cells (FullName, RollNumber, Grade) are empty. Use \"Download Template\" and compare your headings.");
            scrollToTop();
            return;
        }

        // 3. Send only the valid rows.
        setBulkUploadStatus({
          label: "Creating student accounts",
          detail:
            invalid.length > 0
              ? `${valid.length} valid row(s) are being uploaded. ${invalid.length} row(s) will need correction.`
              : `${valid.length} valid row(s) are being uploaded.`,
        });
        const students = valid.map(({ _row, _rowNumber, ...clean }) => clean);
        const response = await fetch("/api/students/bulk-register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ students, schoolId }),
        });

        let data = {};
        try { data = await response.json(); } catch { /* non-JSON error page */ }

        if (!response.ok) {
            throw new Error(friendlyUploadError(response.status, data.message, "students"));
        }

        setBulkUploadStatus({
          label: "Preparing upload summary",
          detail: "Reviewing successful rows and rows that need attention.",
        });
        const resultData = data.data || { success: [], failed: [] };

        // 4. Combine the browser-side invalid rows with any server-side failures,
        //    recovering the original CSV row for each so they can be re-exported.
        const serverFailed = (resultData.failed || []).map((f) => {
            const match = valid.find(
                (v) => v.firstName === f.student?.firstName && v.rollNumber === f.student?.rollNumber
            );
            const fullName = f.student
                ? `${f.student.firstName || ""} ${f.student.lastName || ""}`.trim()
                : "Unknown";
            return {
                name: fullName || "Unknown",
                rowNumber: match?._rowNumber,
                reason: f.reason,
                row: match?._row,
            };
        });
        const failed = [...invalid, ...serverFailed];

        setBulkResult({ success: resultData.success || [], failed });
        const total = valid.length + invalid.length;
        setSuccess(`Processed ${total} row(s) — ${(resultData.success || []).length} added, ${failed.length} need attention.`);
        scrollToTop();
        if ((resultData.success || []).length > 0 && onSuccess) onSuccess();
    } catch (err) {
        setError(err.message || "Something went wrong during the upload. Please try again.");
        scrollToTop();
    } finally {
        setBulkUploadStatus(null);
        setLoading(false);
    }
  };

  const downloadFailedRows = () => {
    if (!bulkResult?.failed?.length) return;
    downloadTextFile("students_failed_rows.csv", buildFailedRowsCsv(bulkResult.failed));
  };

  const downloadCsvTemplate = () => {
    const headers = [
        "FullName*", 
        "RollNumber*", 
        "Grade*", 
        "Gender", 
        "DateOfBirth", 
        "Phone", 
        "Address", 
        "BloodGroup", 
        "GuardianRelationship", 
        "GuardianName", 
        "GuardianPhone", 
        "GuardianEmail", 
        "GuardianAltPhone"
    ];
      const sampleRow = [
        "Sujan Shrestha",
        "12",
        "8",
        "MALE",
        "2011-06-12",
        "9812345678",
        "Bhaktapur",
        "O+",
        "FATHER",
        "Ram Shrestha",
        "9800000000",
        "ram.shrestha@example.com",
        "9841000000"
      ];
    
      const csvContent = `${headers.join(",")}\n${sampleRow.join(",")}\n`;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_registration_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white text-[#27344a] rounded-2xl shadow-[0_14px_36px_rgba(10,47,102,0.08)] p-6 max-w-4xl mx-auto border border-[#d7cdbb]">
      <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold text-[#17120a]">Add New Student</h2>
      <div className="flex gap-2 bg-[#eaf2ff] p-1 rounded-xl">
            <button 
                onClick={() => {
                    setActiveTab("single");
                    setEditingId(null);
                    setFormData({
                        fullName: "",
                        phone: "",
                        dateOfBirth: "",
                        gender: "",
                        rollNumber: "",
                        grade: "",
                        address: "",
                        bloodGroup: "",
                        guardianRelationship: "FATHER",
                        parentName: "",
                        parentContactNumber: "",
                        parentEmail: "",
                        parentAlternativeContact: "",
                    });
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'single' ? 'bg-[#0a2f66] text-white' : 'text-[#52657d] hover:bg-white hover:text-[#0a2f66]'}`}
            >
                {editingId ? 'Edit Student' : 'Single Entry'}
            </button>
            <button 
                onClick={() => setActiveTab("bulk")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'bulk' ? 'bg-[#0a2f66] text-white' : 'text-[#52657d] hover:bg-white hover:text-[#0a2f66]'}`}
            >
                Bulk Upload
            </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg mb-6 break-all">
          {success}
        </div>
      )}

      {bulkUploadStatus && activeTab === "bulk" && (
        <div
          className="mb-6 rounded-xl border border-[#dbe5f4] bg-[#f8fbff] p-4 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <span
              className="pravyo-spinner mt-0.5 h-9 w-9 shrink-0 text-[#0a2f66]"
              style={{ "--pravyo-ring": "4px" }}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-black text-[#17120a]">
                  {bulkUploadStatus.label}
                </p>
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#dbe5f4] bg-white px-3 py-1 text-xs font-black text-[#0a2f66]">
                  <span className="pravyo-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  In progress
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-[#52657d]">
                {bulkUploadStatus.detail}
              </p>
              <div className="pravyo-indeterminate-progress mt-4">
                <span />
              </div>
            </div>
          </div>
        </div>
      )}

      {bulkResult && activeTab === 'bulk' && (
        <div className="mb-6 space-y-4 animate-in fade-in slide-in-from-top-2">
            {/* Success List */}
            {bulkResult.success.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <h4 className="text-emerald-700 font-medium mb-2">Successfully Registered ({bulkResult.success.length})</h4>
                    <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    <ul className="list-disc list-inside text-sm text-emerald-700 space-y-1">
                            {bulkResult.success.map((s, i) => (
                                <li key={i}>
                                    <span className="font-medium">{s.name}</span> 
                          <span className="text-emerald-700/70 ml-2 text-xs">({s.username})</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Failed List */}
            {bulkResult.failed.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h4 className="text-rose-700 font-medium">Need attention ({bulkResult.failed.length})</h4>
                    <button
                      onClick={downloadFailedRows}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-medium transition shrink-0"
                    >
                      <Download size={14} /> Download failed rows
                    </button>
                  </div>
                  <p className="text-xs text-rose-700/80 mb-3">
                    Fix these rows in the downloaded file, then upload it again. Already-added students are skipped automatically.
                  </p>
                    <div className="max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    <ul className="space-y-2 text-sm text-rose-700">
                            {bulkResult.failed.map((f, i) => (
                        <li key={i} className="border-b border-rose-200 pb-2 last:border-0 last:pb-0">
                          <div className="font-medium text-rose-800">
                                        {f.rowNumber ? `Row ${f.rowNumber}: ` : ""}{f.name || 'Unknown'}
                                    </div>
                          <div className="text-xs opacity-80 mt-0.5 text-rose-700">Reason: {f.reason}</div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
      )}

      {activeTab === "single" ? (
        <div className="space-y-8">
          
          {/* Part 1: Student Details */}
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-semibold text-[#0a2f66] mb-4">Student Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#52657d] mb-1">Student Full Name *</label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="w-full bg-white border border-[#d7cdbb] rounded-lg px-4 py-2.5 text-[#27344a] focus:ring-2 focus:ring-[#0a2f66] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#52657d] mb-1">Phone (Optional)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-white border border-[#d7cdbb] rounded-lg px-4 py-2.5 text-[#27344a] focus:ring-2 focus:ring-[#0a2f66] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#52657d] mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                  className="w-full bg-white border border-[#d7cdbb] rounded-lg px-4 py-2.5 text-[#27344a] focus:ring-2 focus:ring-[#0a2f66] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#52657d] mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="w-full bg-white border border-[#d7cdbb] rounded-lg px-4 py-2.5 text-[#27344a] focus:ring-2 focus:ring-[#0a2f66] outline-none"
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#52657d] mb-1">Roll Number *</label>
                <input
                  type="text"
                  value={formData.rollNumber}
                  onChange={(e) => setFormData({...formData, rollNumber: e.target.value})}
                  className="w-full bg-white border border-[#d7cdbb] rounded-lg px-4 py-2.5 text-[#27344a] focus:ring-2 focus:ring-[#0a2f66] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#52657d] mb-1">Grade *</label>
                <select
                  value={formData.grade}
                  onChange={(e) => setFormData({...formData, grade: e.target.value})}
                  className="w-full bg-white border border-[#d7cdbb] rounded-lg px-4 py-2.5 text-[#27344a] focus:ring-2 focus:ring-[#0a2f66] outline-none"
                >
                  <option value="">Select Grade</option>
                  {grades.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#52657d] mb-1">Blood Group (Optional)</label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})}
                  className="w-full bg-white border border-[#d7cdbb] rounded-lg px-4 py-2.5 text-[#27344a] focus:ring-2 focus:ring-[#0a2f66] outline-none"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#52657d] mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full bg-white border border-[#d7cdbb] rounded-lg px-4 py-2.5 text-[#27344a] focus:ring-2 focus:ring-[#0a2f66] outline-none"
                  rows="2"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#d7cdbb]"></div>

          {/* Part 2: Parent/Guardian Details */}
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-semibold text-[#0a2f66] mb-4">Parent/Guardian Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#52657d] mb-1">Guardian Relationship</label>
                <select
                  value={formData.guardianRelationship}
                  onChange={(e) => setFormData({...formData, guardianRelationship: e.target.value})}
                  className="w-full bg-white border border-[#d7cdbb] rounded-lg px-4 py-2.5 text-[#27344a] focus:ring-2 focus:ring-[#0a2f66] outline-none"
                >
                  <option value="FATHER">Father</option>
                  <option value="MOTHER">Mother</option>
                  <option value="GUARDIAN">Guardian</option>
                  <option value="UNCLE">Uncle</option>
                  <option value="AUNT">Aunt</option>
                  <option value="SIBLING">Sibling</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#52657d] mb-1">Guardian Full Name</label>
                <input
                  type="text"
                  value={formData.parentName}
                  onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                  className="w-full bg-white border border-[#d7cdbb] rounded-lg px-4 py-2.5 text-[#27344a] focus:ring-2 focus:ring-[#0a2f66] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#52657d] mb-1">Guardian Contact Number</label>
                <input
                  type="tel"
                  value={formData.parentContactNumber}
                  onChange={(e) => setFormData({...formData, parentContactNumber: e.target.value})}
                  className="w-full bg-white border border-[#d7cdbb] rounded-lg px-4 py-2.5 text-[#27344a] focus:ring-2 focus:ring-[#0a2f66] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#52657d] mb-1">Guardian Email</label>
                <input
                  type="email"
                  value={formData.parentEmail}
                  onChange={(e) => setFormData({...formData, parentEmail: e.target.value})}
                  className="w-full bg-white border border-[#d7cdbb] rounded-lg px-4 py-2.5 text-[#27344a] focus:ring-2 focus:ring-[#0a2f66] outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#52657d] mb-1">Alternative Contact (Optional)</label>
                <input
                  type="tel"
                  value={formData.parentAlternativeContact}
                  onChange={(e) => setFormData({...formData, parentAlternativeContact: e.target.value})}
                  className="w-full bg-white border border-[#d7cdbb] rounded-lg px-4 py-2.5 text-[#27344a] focus:ring-2 focus:ring-[#0a2f66] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6 border-t border-[#d7cdbb] mt-6 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Registering..." : "Submit Registration"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-[#f8fbff] p-6 rounded-2xl border border-[#d7cdbb]">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-medium text-[#17120a] mb-2">Upload Student Data</h3>
                <div className="text-[#52657d] text-sm space-y-2">
                  <p>Upload a CSV file with the following headers:</p>
                  <div className="bg-white p-3 rounded border border-[#d7cdbb] font-mono text-xs overflow-x-auto text-[#27344a]">
                    <span className="text-rose-700">FullName*</span>, 
                    <span className="text-rose-700"> RollNumber*</span>, 
                    <span className="text-rose-700"> Grade*</span>, 
                    <span className="text-[#0a2f66]"> Gender</span>, 
                    <span className="text-[#0a2f66]"> DateOfBirth</span>, 
                    <span className="text-[#0a2f66]"> Phone</span>, 
                    <span className="text-[#0a2f66]"> Address</span>, 
                    <span className="text-[#0a2f66]"> BloodGroup</span>, 
                    <span className="text-[#0a2f66]"> GuardianRelationship</span>, 
                    <span className="text-[#0a2f66]"> GuardianName</span>, 
                    <span className="text-[#0a2f66]"> GuardianPhone</span>, 
                    <span className="text-[#0a2f66]"> GuardianEmail</span>, 
                    <span className="text-[#0a2f66]"> GuardianAltPhone</span>
                  </div>
                  <p className="text-xs text-[#7a8aa0]">
                    <span className="text-rose-700">* Mandatory Fields</span> | 
                    <span className="text-[#0a2f66]"> Optional Fields</span>
                  </p>
                  <p className="text-xs text-[#7a8aa0]">
                    Template includes one demo row. Replace it with your data before upload.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 md:items-end">
                <button
                  onClick={downloadCsvTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0a2f66] hover:bg-[#123f7d] text-white rounded-lg text-sm transition shrink-0"
                >
                  <Download size={16} /> Download Template
                </button>
                <div className="rounded-lg border border-[#d7cdbb] bg-[#f8fbff] p-3 text-xs text-[#52657d] max-w-[260px]">
                  <div className="font-semibold text-[#0a2f66]">Demo row preview</div>
                  <div className="mt-2 space-y-1 text-[#52657d]">
                    <div>Name: Sujan Shrestha</div>
                    <div>Roll: 12 | Grade: 8</div>
                    <div>Guardian: Ram Shrestha</div>
                  </div>
                </div>
              </div>
            </div>
            {bulkResult && (
              <div className="mt-5 rounded-xl border border-[#d7cdbb] bg-white p-4 text-sm text-[#27344a]">
                <div className="font-semibold text-[#17120a]">Bulk upload summary</div>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-[#52657d]">
                  <span>Processed: {bulkResult.success.length + bulkResult.failed.length}</span>
                  <span className="text-emerald-700">Success: {bulkResult.success.length}</span>
                  <span className="text-rose-700">Failed: {bulkResult.failed.length}</span>
                </div>
              </div>
            )}
            <div className="mt-6">
              <CSVUploader
                onUpload={handleBulkUpload}
                uploadingLabel="Uploading student rows"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedStudentRegistration;
