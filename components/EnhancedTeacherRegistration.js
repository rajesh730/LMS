import React, { useState } from "react";
import { Download } from "lucide-react";
import CSVUploader from "./CSVUploader";
import {
  buildNormalizedRow,
  getRowValue,
  friendlyUploadError,
  buildFailedRowsCsv,
  downloadTextFile,
} from "@/lib/bulkUpload";

const EnhancedTeacherRegistration = ({ schoolId, onSuccess }) => {
  const [activeTab, setActiveTab] = useState("single"); // 'single' or 'bulk'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [bulkResult, setBulkResult] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    focusArea: "",
    qualification: "",
    gender: "",
    address: "",
    dateOfJoining: "",
    designation: "",
    experience: "",
    bloodGroup: "",
  });

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    
    // Validation
    if (!formData.fullName || !formData.email || !formData.focusArea) {
      setError("Please fill in all required fields (Name, Email, Focus Area)");
      return;
    }

    setLoading(true);

    try {
      // Split Full Name
      const nameParts = formData.fullName.trim().split(" ");
      const firstName = nameParts[0];
      
      // Auto-generate Password: firstName@123
      const password = `${firstName.toLowerCase()}@123`;

      const payload = {
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        subject: formData.focusArea,
        qualification: formData.qualification,
        gender: formData.gender,
        address: formData.address,
        dateOfJoining: formData.dateOfJoining,
        designation: formData.designation,
        experience: formData.experience,
        bloodGroup: formData.bloodGroup,
        password: password, // Send plain text, backend will handle hashing/storage
        schoolId: schoolId
      };

      const response = await fetch("/api/teachers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      setSuccess(`Teacher registered successfully! Credentials: Email: ${formData.email}, Password: ${password}`);
      
      // Reset form
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        focusArea: "",
        qualification: "",
        gender: "",
        address: "",
        dateOfJoining: "",
        designation: "",
        experience: "",
        bloodGroup: "",
      });
      
      if (onSuccess) onSuccess();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const scrollToTop = () => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBulkUpload = async (parsedData) => {
    setLoading(true);
    setBulkResult(null);
    setError("");
    setSuccess("");

    try {
        // 1. Map + validate every row in the browser first, tolerating header
        //    differences and keeping the original CSV row for re-export.
        const valid = [];
        const invalid = [];

        parsedData.forEach((row, index) => {
            const rowNumber = index + 2; // +1 header line, +1 for 1-based
            const normalizedRow = buildNormalizedRow(row);
            const fullName = String(getRowValue(normalizedRow, ["fullname", "name"])).trim();
            const email = String(getRowValue(normalizedRow, ["email", "emailaddress"])).trim();
            const subject = String(getRowValue(normalizedRow, ["focusarea", "subject", "subjects", "area"])).trim();

            const missing = [];
            if (!fullName) missing.push("FullName");
            if (!email) missing.push("Email");
            if (!subject) missing.push("FocusArea");

            if (missing.length > 0) {
                invalid.push({
                    name: fullName || "(no name)",
                    rowNumber,
                    reason: `Missing required value(s): ${missing.join(", ")}`,
                    row,
                });
                return;
            }

            const firstName = fullName.split(" ").filter(Boolean)[0] || "";
            const password = `${firstName.toLowerCase()}@123`;

            valid.push({
                _row: row,
                _rowNumber: rowNumber,
                name: fullName,
                email,
                subject,
                phone: getRowValue(normalizedRow, ["phone", "phonenumber", "contact"]),
                qualification: getRowValue(normalizedRow, ["qualification", "qualifications"]),
                gender: getRowValue(normalizedRow, ["gender"]),
                address: getRowValue(normalizedRow, ["address"]),
                dateOfJoining: getRowValue(normalizedRow, ["dateofjoining", "joiningdate", "doj"]),
                designation: getRowValue(normalizedRow, ["designation", "role"]),
                experience: getRowValue(normalizedRow, ["experience", "yearsofexperience"]),
                bloodGroup: getRowValue(normalizedRow, ["bloodgroup", "blood"]),
                password,
            });
        });

        // 2. Nothing usable: explain why (empty file vs. header/cell problems).
        if (valid.length === 0) {
            if (invalid.length === 0) {
                throw new Error("Your file has no data rows. Add mentors below the header row and try again.");
            }
            setBulkResult({ success: [], failed: invalid });
            setError("No mentors could be uploaded. Your column headers may not match the template, or required cells (FullName, Email, FocusArea) are empty. Use \"Download Template\" and compare your headings.");
            scrollToTop();
            return;
        }

        // 3. Send only the valid rows.
        const teachers = valid.map(({ _row, _rowNumber, ...clean }) => clean);
        const response = await fetch("/api/teachers/bulk-register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teachers, schoolId }),
        });

        let data = {};
        try { data = await response.json(); } catch { /* non-JSON error page */ }

        if (!response.ok) {
            throw new Error(friendlyUploadError(response.status, data.message, "teachers"));
        }

        const resultData = data.data || { success: [], failed: [] };

        // 4. Combine browser-side invalid rows with server-side failures.
        const serverFailed = (resultData.failed || []).map((f) => {
            const match = valid.find((v) => v.email === f.teacher?.email);
            return {
                name: f.teacher?.name || "Unknown",
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
        setLoading(false);
    }
  };

  const downloadFailedRows = () => {
    if (!bulkResult?.failed?.length) return;
    downloadTextFile("teachers_failed_rows.csv", buildFailedRowsCsv(bulkResult.failed));
  };

  const downloadCsvTemplate = () => {
    const headers = [
        "FullName*", 
        "Email*", 
        "FocusArea*", 
        "Phone", 
        "Qualification", 
        "Gender", 
        "Address",
        "DateOfJoining",
        "Designation",
        "Experience",
        "BloodGroup"
    ];
    
    const csvContent = `${headers.join(",")}\n`;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "teacher_registration_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#0f172a] text-white rounded-lg shadow-xl p-6 max-w-4xl mx-auto border border-slate-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Add New Mentor</h2>
        <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
            <button 
                onClick={() => setActiveTab("single")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'single' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
                Single Entry
            </button>
            <button 
                onClick={() => setActiveTab("bulk")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'bulk' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
                Bulk Upload
            </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg mb-6 break-all">
          {success}
        </div>
      )}

      {bulkResult && activeTab === 'bulk' && (
        <div className="mb-6 space-y-4 animate-in fade-in slide-in-from-top-2">
            {/* Success List */}
            {bulkResult.success.length > 0 && (
                <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4">
                    <h4 className="text-green-400 font-medium mb-2">Successfully Registered ({bulkResult.success.length})</h4>
                    <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        <ul className="list-disc list-inside text-sm text-green-300 space-y-1">
                            {bulkResult.success.map((t, i) => (
                                <li key={i}>
                                    <span className="font-medium">{t.name}</span> 
                                    <span className="text-green-400/70 ml-2 text-xs">({t.email})</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Failed List */}
            {bulkResult.failed.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                        <h4 className="text-red-400 font-medium">Need attention ({bulkResult.failed.length})</h4>
                        <button
                            onClick={downloadFailedRows}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-red-500/50 text-red-300 hover:bg-slate-700 rounded-lg text-xs font-medium transition shrink-0"
                        >
                            <Download size={14} /> Download failed rows
                        </button>
                    </div>
                    <p className="text-xs text-red-300/80 mb-3">
                        Fix these rows in the downloaded file, then upload it again. Already-added mentors are skipped automatically.
                    </p>
                    <div className="max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        <ul className="space-y-2 text-sm text-red-300">
                            {bulkResult.failed.map((f, i) => (
                                <li key={i} className="border-b border-red-500/20 pb-2 last:border-0 last:pb-0">
                                    <div className="font-medium text-red-200">
                                        {f.rowNumber ? `Row ${f.rowNumber}: ` : ""}{f.name || 'Unknown'}
                                    </div>
                                    <div className="text-xs opacity-80 mt-0.5">Reason: {f.reason}</div>
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
          
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email *</label>
                <input
                  type="email"
                  placeholder="teacher@school.edu.np"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Focus Area *</label>
                <input
                  type="text"
                  placeholder="Activity area or subject"
                  value={formData.focusArea}
                  onChange={(e) => setFormData({...formData, focusArea: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Qualification</label>
                <input
                  type="text"
                  placeholder="Academic qualification"
                  value={formData.qualification}
                  onChange={(e) => setFormData({...formData, qualification: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Designation</label>
                <input
                  type="text"
                  placeholder="Role or designation"
                  value={formData.designation}
                  onChange={(e) => setFormData({...formData, designation: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Experience (Years)</label>
                <input
                  type="number"
                  placeholder="Years"
                  value={formData.experience}
                  onChange={(e) => setFormData({...formData, experience: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Date of Joining</label>
                <input
                  type="date"
                  value={formData.dateOfJoining}
                  onChange={(e) => setFormData({...formData, dateOfJoining: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Blood Group</label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
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

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  rows="2"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6 border-t border-slate-700 mt-6 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Registering..." : "Register Mentor"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-medium text-white mb-2">Upload Mentor Data</h3>
                        <div className="text-slate-400 text-sm space-y-2">
                            <p>Upload a CSV file with the following headers:</p>
                            <div className="bg-slate-900 p-3 rounded border border-slate-700 font-mono text-xs overflow-x-auto">
                                <span className="text-red-400">FullName*</span>, 
                                <span className="text-red-400"> Email*</span>, 
                                <span className="text-red-400"> FocusArea*</span>, 
                                <span className="text-blue-300"> Phone</span>, 
                                <span className="text-blue-300"> Qualification</span>, 
                                <span className="text-blue-300"> Gender</span>, 
                                <span className="text-blue-300"> Address</span>,
                                <span className="text-blue-300"> DateOfJoining</span>,
                                <span className="text-blue-300"> Designation</span>,
                                <span className="text-blue-300"> Experience</span>,
                                <span className="text-blue-300"> BloodGroup</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                <span className="text-red-400">* Mandatory Fields</span> | 
                                <span className="text-blue-300"> Optional Fields</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={downloadCsvTemplate}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition shrink-0 ml-4"
                    >
                        <Download size={16} /> Download Template
                    </button>
                </div>
                <CSVUploader onUpload={handleBulkUpload} />
            </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTeacherRegistration;
