import React, { useState, useEffect } from "react";
import { Download, List, Edit, Trash2, Search, RefreshCw } from "lucide-react";
import CSVUploader from "./CSVUploader";

const EnhancedStudentRegistration = ({ schoolId, onSuccess }) => {
  const [activeTab, setActiveTab] = useState("single"); // 'single', 'bulk', 'list'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [bulkResult, setBulkResult] = useState(null);
  const [grades, setGrades] = useState([]);
  
  // List View State
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
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
        console.log("No schoolId provided to EnhancedStudentRegistration");
        return;
      }
      console.log("Fetching grades for schoolId:", schoolId);
      try {
        const response = await fetch(`/api/schools/${schoolId}/config`);
        console.log("Grade fetch response status:", response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Grade fetch failed:", errorText);
            return;
        }

        const data = await response.json();
        console.log("Grade data received:", data);

        if (data.data?.grades) {
          setGrades(data.data.grades);
        } else {
            console.warn("No grades found in data:", data);
        }

      } catch (err) {
        console.error("Failed to fetch grades:", err);
      }
    };
    fetchGrades();
  }, [schoolId]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/students?limit=100&search=${searchTerm}`);
      const data = await response.json();
      if (response.ok) {
        setStudents(data.students || []);
      } else {
        setError(data.message || "Failed to fetch students");
      }
    } catch (err) {
      setError("Error fetching students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'list') {
      fetchStudents();
    }
  }, [activeTab, searchTerm]);

  const handleEdit = (student) => {
    setEditingId(student._id);
    setFormData({
      fullName: student.name,
      phone: student.phone || "",
      dateOfBirth: student.dob ? new Date(student.dob).toISOString().split('T')[0] : "",
      gender: student.gender || "",
      rollNumber: student.rollNumber || "",
      grade: student.grade || "",
      address: student.address || "",
      bloodGroup: student.bloodGroup || "",
      guardianRelationship: "FATHER", // Default or fetch if available
      parentName: student.parentName || "",
      parentContactNumber: student.parentPhone || "",
      parentEmail: student.parentEmail || "",
      parentAlternativeContact: student.emergencyContact || "",
    });
    setActiveTab('single');
  };

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

      // Auto-generate Credentials
      // Username = full name (lowercase, no spaces)
      const username = formData.fullName.toLowerCase().replace(/\s+/g, '');
      
      // Password = firstName + rollNumber + @123
      const password = `${firstName.toLowerCase()}${formData.rollNumber}@123`;

      const payload = {
        // Credentials (Auto-generated)
        username,
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
        email: formData.parentEmail,
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
            setActiveTab('list');
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
        setSuccess(`Student registered successfully! Credentials: Username: ${username}, Password: ${password}`);
        
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
    try {
        // parsedData is the array of rows directly from CSVUploader
        const students = parsedData.map(row => {
            const fullName = (row['FullName*'] || row.Name || "").trim();
            const nameParts = fullName.split(" ");
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(" ") || ".";
            const rollNumber = row['RollNumber*'] || row.RollNumber;
            
            // Generate credentials for bulk
            const username = fullName.toLowerCase().replace(/\s+/g, '');
            const password = `${firstName.toLowerCase()}${rollNumber}@123`;

            return {
                firstName,
                lastName,
                username,
                password,
                email: row.Email, // Optional
                grade: row['Grade*'] || row.Grade,
                rollNumber: rollNumber,
                
                // Optional Student Fields
                phone: row.Phone,
                address: row.Address,
                gender: row.Gender || "OTHER",
                dateOfBirth: row.DateOfBirth ? new Date(row.DateOfBirth) : new Date(),
                bloodGroup: row.BloodGroup,

                // Parent Fields
                guardianRelationship: row.GuardianRelationship || "FATHER",
                parentName: row.GuardianName || "To be added",
                parentContactNumber: row.GuardianPhone || "To be added",
                parentEmail: row.GuardianEmail || row['ParentEmail'],
                parentAlternativeContact: row.GuardianAltPhone,
            };
        }).filter(s => s.firstName && s.rollNumber && s.grade);

        if (students.length === 0) {
            throw new Error("No valid student records found. Please check mandatory fields (FullName, RollNumber, Grade).");
        }

        const response = await fetch("/api/students/bulk-register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ students, schoolId }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        
        setBulkResult(data.data);
        setSuccess(`Processed ${students.length} students. Success: ${data.data.success.length}, Failed: ${data.data.failed.length}`);
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  const downloadSampleCSV = () => {
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
    
    const sampleData = [
        "John Doe", 
        "101", 
        "10", 
        "MALE", 
        "2010-01-01", 
        "9800000000", 
        "Kathmandu", 
        "A+", 
        "FATHER", 
        "Robert Doe", 
        "9800000001", 
        "parent@example.com", 
        "9800000002"
    ];
    
    const csvContent = [
      headers.join(","),
      sampleData.join(",")
    ].join("\n");

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
    <div className="bg-[#0f172a] text-white rounded-lg shadow-xl p-6 max-w-4xl mx-auto border border-slate-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Add New Student</h2>
        <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
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
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'single' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
                {editingId ? 'Edit Student' : 'Single Entry'}
            </button>
            <button 
                onClick={() => setActiveTab("bulk")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'bulk' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
                Bulk Upload
            </button>
            <button 
                onClick={() => setActiveTab("list")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
                View All
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
                            {bulkResult.success.map((s, i) => (
                                <li key={i}>
                                    <span className="font-medium">{s.name}</span> 
                                    <span className="text-green-400/70 ml-2 text-xs">({s.username})</span>
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
                                        {f.student.firstName || 'Unknown'} {f.student.lastName || ''}
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

      {activeTab === "list" && (
        <div className="space-y-4">
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button 
              onClick={fetchStudents}
              className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="text-xs text-slate-400 uppercase bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Roll No</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                      No students found
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student._id} className="border-b border-slate-700 hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-medium text-white">{student.name}</td>
                      <td className="px-4 py-3">{student.rollNumber}</td>
                      <td className="px-4 py-3">{student.grade}</td>
                      <td className="px-4 py-3">{student.phone || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleEdit(student)}
                          className="text-blue-400 hover:text-blue-300 p-1"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "single" ? (
        <div className="space-y-8">
          
          {/* Part 1: Student Details */}
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-semibold text-blue-400 mb-4">Student Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Student Full Name *</label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Phone (Optional)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
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

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Roll Number *</label>
                <input
                  type="text"
                  value={formData.rollNumber}
                  onChange={(e) => setFormData({...formData, rollNumber: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Grade *</label>
                <select
                  value={formData.grade}
                  onChange={(e) => setFormData({...formData, grade: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select Grade</option>
                  {grades.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Blood Group (Optional)</label>
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

          {/* Divider */}
          <div className="border-t border-slate-700"></div>

          {/* Part 2: Parent/Guardian Details */}
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-semibold text-blue-400 mb-4">Parent/Guardian Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Guardian Relationship</label>
                <select
                  value={formData.guardianRelationship}
                  onChange={(e) => setFormData({...formData, guardianRelationship: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
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
                <label className="block text-sm font-medium text-slate-300 mb-1">Guardian Full Name</label>
                <input
                  type="text"
                  value={formData.parentName}
                  onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Guardian Contact Number</label>
                <input
                  type="tel"
                  value={formData.parentContactNumber}
                  onChange={(e) => setFormData({...formData, parentContactNumber: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Guardian Email</label>
                <input
                  type="email"
                  value={formData.parentEmail}
                  onChange={(e) => setFormData({...formData, parentEmail: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Alternative Contact (Optional)</label>
                <input
                  type="tel"
                  value={formData.parentAlternativeContact}
                  onChange={(e) => setFormData({...formData, parentAlternativeContact: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
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
              {loading ? "Registering..." : "Submit Registration"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-medium text-white mb-2">Upload Student Data</h3>
                        <div className="text-slate-400 text-sm space-y-2">
                            <p>Upload a CSV file with the following headers:</p>
                            <div className="bg-slate-900 p-3 rounded border border-slate-700 font-mono text-xs overflow-x-auto">
                                <span className="text-red-400">FullName*</span>, 
                                <span className="text-red-400"> RollNumber*</span>, 
                                <span className="text-red-400"> Grade*</span>, 
                                <span className="text-blue-300"> Gender</span>, 
                                <span className="text-blue-300"> DateOfBirth</span>, 
                                <span className="text-blue-300"> Phone</span>, 
                                <span className="text-blue-300"> Address</span>, 
                                <span className="text-blue-300"> BloodGroup</span>, 
                                <span className="text-blue-300"> GuardianRelationship</span>, 
                                <span className="text-blue-300"> GuardianName</span>, 
                                <span className="text-blue-300"> GuardianPhone</span>, 
                                <span className="text-blue-300"> GuardianEmail</span>, 
                                <span className="text-blue-300"> GuardianAltPhone</span>
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

export default EnhancedStudentRegistration;
