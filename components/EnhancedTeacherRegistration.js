import React, { useState } from "react";
import { Download } from "lucide-react";
import CSVUploader from "./CSVUploader";

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
    subject: "",
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
    if (!formData.fullName || !formData.email || !formData.subject) {
      setError("Please fill in all required fields (Name, Email, Subject)");
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
        subject: formData.subject,
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
        subject: "",
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

  const handleBulkUpload = async (parsedData) => {
    setLoading(true);
    setBulkResult(null);
    setError("");
    setSuccess("");

    try {
        // parsedData is the array of rows directly from CSVUploader
        const teachers = parsedData.map(row => {
            const fullName = (row['FullName*'] || row.Name || "").trim();
            const nameParts = fullName.split(" ");
            const firstName = nameParts[0];
            
            // Generate password
            const password = `${firstName.toLowerCase()}@123`;

            return {
                name: fullName,
                email: row['Email*'] || row.Email,
                subject: row['Subject*'] || row.Subject,
                phone: row.Phone,
                qualification: row.Qualification,
                gender: row.Gender,
                address: row.Address,
                dateOfJoining: row.DateOfJoining,
                designation: row.Designation,
                experience: row.Experience,
                bloodGroup: row.BloodGroup,
                password: password
            };
        }).filter(t => t.name && t.email && t.subject);

        if (teachers.length === 0) {
            throw new Error("No valid teacher records found. Please check mandatory fields (FullName, Email, Subject).");
        }

        const response = await fetch("/api/teachers/bulk-register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teachers, schoolId }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        
        setBulkResult(data.data);
        setSuccess(`Processed ${teachers.length} teachers. Success: ${data.data.success.length}, Failed: ${data.data.failed.length}`);
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    const headers = [
        "FullName*", 
        "Email*", 
        "Subject*", 
        "Phone", 
        "Qualification", 
        "Gender", 
        "Address",
        "DateOfJoining",
        "Designation",
        "Experience",
        "BloodGroup"
    ];
    
    const sampleData = [
        "Sarah Smith", 
        "sarah.smith@example.com", 
        "Mathematics", 
        "9800000000", 
        "M.Sc. Math", 
        "FEMALE", 
        "Kathmandu",
        "2023-01-15",
        "Senior Teacher",
        "5",
        "A+"
    ];
    
    const csvContent = [
      headers.join(","),
      sampleData.join(",")
    ].join("\n");

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
        <h2 className="text-2xl font-bold text-white">Add New Teacher</h2>
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
                    <h4 className="text-red-400 font-medium mb-2">Failed to Register ({bulkResult.failed.length})</h4>
                    <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        <ul className="space-y-2 text-sm text-red-300">
                            {bulkResult.failed.map((f, i) => (
                                <li key={i} className="border-b border-red-500/20 pb-2 last:border-0 last:pb-0">
                                    <div className="font-medium text-red-200">
                                        {f.teacher.name || 'Unknown'}
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
                  placeholder="teacher@example.com"
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
                <label className="block text-sm font-medium text-slate-300 mb-1">Subject *</label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Qualification</label>
                <input
                  type="text"
                  placeholder="e.g. M.Sc. Physics"
                  value={formData.qualification}
                  onChange={(e) => setFormData({...formData, qualification: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Teacher"
                  value={formData.designation}
                  onChange={(e) => setFormData({...formData, designation: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Experience (Years)</label>
                <input
                  type="number"
                  placeholder="e.g. 5"
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
              {loading ? "Registering..." : "Register Teacher"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-medium text-white mb-2">Upload Teacher Data</h3>
                        <div className="text-slate-400 text-sm space-y-2">
                            <p>Upload a CSV file with the following headers:</p>
                            <div className="bg-slate-900 p-3 rounded border border-slate-700 font-mono text-xs overflow-x-auto">
                                <span className="text-red-400">FullName*</span>, 
                                <span className="text-red-400"> Email*</span>, 
                                <span className="text-red-400"> Subject*</span>, 
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
                        onClick={downloadSampleCSV}
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
