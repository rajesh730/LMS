"use client";

import { useState, useEffect } from "react";
import { FaArrowRight, FaCheck, FaUserGraduate, FaExclamationTriangle, FaLayerGroup, FaList, FaArrowDown } from "react-icons/fa";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function StudentPromotionManager({ onClose, onSuccess }) {
  const [mode, setMode] = useState("single"); // 'single' | 'bulk'
  const [grades, setGrades] = useState([]);
  const [loadingGrades, setLoadingGrades] = useState(true);
  
  // Single Mode State
  const [fromGrade, setFromGrade] = useState("");
  const [toGrade, setToGrade] = useState("");
  const [isGraduating, setIsGraduating] = useState(false);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  
  // Bulk Mode State
  const [bulkTransitions, setBulkTransitions] = useState([]);
  const [loadingBulk, setLoadingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null); // { current: 0, total: 0 }

  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState("");

  // Fetch Grades
  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const res = await fetch("/api/school/grade-structure");
        if (res.ok) {
          const data = await res.json();
          // Sort grades numerically if possible
          const sorted = [...(data.grades || [])].sort((a, b) => {
             const nameA = a.name || "";
             const nameB = b.name || "";
             const numA = parseInt(nameA.replace(/\D/g, '')) || 0;
             const numB = parseInt(nameB.replace(/\D/g, '')) || 0;
             
             if (numA !== numB) return numA - numB;
             return nameA.localeCompare(nameB, undefined, { numeric: true });
          });
          setGrades(sorted);
          if (sorted.length > 0) {
            setFromGrade(sorted[0].originalValue || sorted[0].name);
          }
        }
      } catch (err) {
        console.error("Error fetching grades", err);
      } finally {
        setLoadingGrades(false);
      }
    };
    fetchGrades();
  }, []);

  const [isDemoting, setIsDemoting] = useState(false);

  // Auto-set To Grade when From Grade changes (Single Mode)
  useEffect(() => {
    if (mode !== "single" || !fromGrade || grades.length === 0) return;

    const currentIndex = grades.findIndex(g => (g.originalValue || g.name) === fromGrade);
    if (currentIndex !== -1 && currentIndex < grades.length - 1) {
        setToGrade(grades[currentIndex + 1].originalValue || grades[currentIndex + 1].name);
        setIsGraduating(false);
    } else {
        setToGrade("");
        setIsGraduating(true);
    }
    
    // Fetch students for the selected grade
    fetchStudents(fromGrade);
  }, [fromGrade, grades, mode]);

  // Check for demotion
  useEffect(() => {
    if (mode !== "single" || !fromGrade || !toGrade || isGraduating) {
        setIsDemoting(false);
        return;
    }

    const fromIndex = grades.findIndex(g => (g.originalValue || g.name) === fromGrade);
    const toIndex = grades.findIndex(g => (g.originalValue || g.name) === toGrade);

    if (fromIndex !== -1 && toIndex !== -1 && toIndex < fromIndex) {
        setIsDemoting(true);
    } else {
        setIsDemoting(false);
    }
  }, [fromGrade, toGrade, isGraduating, grades, mode]);

  // Prepare Bulk Transitions (Bulk Mode)
  useEffect(() => {
    if (mode === "bulk" && grades.length > 0) {
        prepareBulkTransitions();
    }
  }, [mode, grades]);

  const prepareBulkTransitions = async () => {
    setLoadingBulk(true);
    setBulkTransitions([]);
    try {
        // 1. Fetch ALL active students
        // We use the main endpoint with a high limit
        const res = await fetch("/api/students?status=ACTIVE&limit=2000");
        if (!res.ok) throw new Error("Failed to fetch students");
        
        const data = await res.json();
        const allStudents = data.students || [];

        // 2. Group by Grade
        const studentsByGrade = {};
        allStudents.forEach(s => {
            // Normalize grade key
            // We need to match the student's grade string to our grades list
            // This is tricky because of "Grade 9" vs "9"
            // We'll try to find the matching grade object
            let gradeKey = s.grade;
            
            // Try to find exact match in grades list
            const exactMatch = grades.find(g => (g.originalValue || g.name) === s.grade);
            if (exactMatch) {
                gradeKey = exactMatch.originalValue || exactMatch.name;
            } else {
                // Try fuzzy match
                const num = s.grade.replace(/\D/g, '');
                const fuzzyMatch = grades.find(g => (g.originalValue || g.name).includes(num));
                if (fuzzyMatch) {
                    gradeKey = fuzzyMatch.originalValue || fuzzyMatch.name;
                }
            }

            if (!studentsByGrade[gradeKey]) {
                studentsByGrade[gradeKey] = [];
            }
            studentsByGrade[gradeKey].push(s);
        });

        // 3. Build Transitions
        const transitions = [];
        
        // Iterate grades from highest to lowest to avoid double promotion issues logically
        // (though we use IDs so it's fine, but display wise it looks better)
        for (let i = grades.length - 1; i >= 0; i--) {
            const currentGradeObj = grades[i];
            const currentGradeVal = currentGradeObj.originalValue || currentGradeObj.name;
            
            const studentsInGrade = studentsByGrade[currentGradeVal] || [];
            
            if (studentsInGrade.length === 0) continue;

            let targetGradeVal = null;
            let isGrad = false;

            if (i === grades.length - 1) {
                // Last grade -> Graduate
                isGrad = true;
            } else {
                // Next grade
                const nextGradeObj = grades[i + 1];
                targetGradeVal = nextGradeObj.originalValue || nextGradeObj.name;
            }

            transitions.push({
                fromGrade: currentGradeVal,
                fromGradeName: currentGradeObj.name,
                toGrade: targetGradeVal,
                toGradeName: isGrad ? "Graduate (Alumni)" : (grades[i+1]?.name || targetGradeVal),
                isGraduating: isGrad,
                students: studentsInGrade,
                count: studentsInGrade.length
            });
        }
        
        // Also catch any students whose grade didn't match our structure?
        // For now, ignore them or list them as "Unknown Grade"
        
        setBulkTransitions(transitions);

    } catch (err) {
        console.error("Error preparing bulk transitions", err);
        setError("Failed to load student data for bulk promotion.");
    } finally {
        setLoadingBulk(false);
    }
  };

  const fetchStudents = async (grade) => {
    setLoadingStudents(true);
    setStudents([]);
    setSelectedStudents(new Set());
    try {
        // Use the by-grade API endpoint to match the Student List behavior
        const encodedGrade = encodeURIComponent(grade);
        const res = await fetch(`/api/students/by-grade/${encodedGrade}`);
        
        if (res.ok) {
            const data = await res.json();
            // The by-grade API returns { data: { students: [...] } }
            const studentList = data.data?.students || [];
            setStudents(studentList);
            
            // Auto-select all by default
            const allIds = new Set(studentList.map(s => s._id));
            setSelectedStudents(allIds);
        } else {
            console.error("Failed to fetch students");
        }
    } catch (err) {
        console.error("Error fetching students", err);
    } finally {
        setLoadingStudents(false);
    }
  };

  const handleToggleStudent = (id) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(id)) {
        newSelected.delete(id);
    } else {
        newSelected.add(id);
    }
    setSelectedStudents(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedStudents.size === students.length) {
        setSelectedStudents(new Set());
    } else {
        setSelectedStudents(new Set(students.map(s => s._id)));
    }
  };

  const handlePromote = async () => {
    if (mode === "single") {
        if (selectedStudents.size === 0) {
            setError("Please select at least one student.");
            return;
        }
        if (!isGraduating && !toGrade) {
            setError("Please select a target grade.");
            return;
        }

        setPromoting(true);
        setError("");

        try {
            const res = await fetch("/api/students/promote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentIds: Array.from(selectedStudents),
                    targetGrade: isGraduating ? null : toGrade,
                    isGraduating
                })
            });

            const data = await res.json();

            if (res.ok) {
                alert(data.message);
                if (onSuccess) onSuccess();
                if (onClose) onClose();
            } else {
                setError(data.message || "Promotion failed");
            }
        } catch (err) {
            setError("An error occurred during promotion.");
        } finally {
            setPromoting(false);
        }
    } else {
        // Bulk Promote
        if (bulkTransitions.length === 0) return;
        
        setPromoting(true);
        setBulkProgress({ current: 0, total: bulkTransitions.length });
        setError("");

        try {
            let successCount = 0;
            
            // Process sequentially
            for (let i = 0; i < bulkTransitions.length; i++) {
                const transition = bulkTransitions[i];
                setBulkProgress({ current: i + 1, total: bulkTransitions.length });
                
                const res = await fetch("/api/students/promote", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        studentIds: transition.students.map(s => s._id),
                        targetGrade: transition.isGraduating ? null : transition.toGrade,
                        isGraduating: transition.isGraduating
                    })
                });
                
                if (res.ok) successCount++;
            }

            alert(`Bulk promotion completed! Successfully processed ${successCount} grade levels.`);
            if (onSuccess) onSuccess();
            if (onClose) onClose();

        } catch (err) {
            setError("An error occurred during bulk promotion.");
        } finally {
            setPromoting(false);
            setBulkProgress(null);
        }
    }
  };

  if (loadingGrades) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
        {/* Mode Switcher */}
        <div className="flex p-1 bg-slate-800 rounded-lg border border-slate-700">
            <button
                onClick={() => setMode("single")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    mode === "single" 
                    ? "bg-blue-600 text-white shadow-lg" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
            >
                <FaList /> Single Grade
            </button>
            <button
                onClick={() => setMode("bulk")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    mode === "bulk" 
                    ? "bg-blue-600 text-white shadow-lg" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
            >
                <FaLayerGroup /> Bulk Promote All
            </button>
        </div>

        {mode === "single" ? (
            <>
                <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center">
                    {/* From Grade */}
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <label className="block text-sm font-medium text-slate-400 mb-2">Promote From</label>
                        <select 
                            value={fromGrade}
                            onChange={(e) => setFromGrade(e.target.value)}
                            className="w-full bg-slate-900 text-white p-3 rounded-lg border border-slate-600 focus:border-blue-500 outline-none"
                        >
                            {grades.map(g => (
                                <option key={g._id} value={g.originalValue || g.name}>{g.name}</option>
                            ))}
                        </select>
                        <div className="mt-2 text-xs text-slate-500">
                            {students.length} students found
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className={`flex justify-center md:rotate-0 rotate-90 transition-transform duration-300 ${isDemoting ? 'md:rotate-180' : ''}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isDemoting ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-slate-400'}`}>
                            <FaArrowRight />
                        </div>
                    </div>

                    {/* To Grade */}
                    <div className={`p-4 rounded-xl border transition-colors ${isGraduating ? 'bg-emerald-900/20 border-emerald-500/50' : (isDemoting ? 'bg-orange-900/20 border-orange-500/50' : 'bg-slate-800 border-slate-700')}`}>
                        <label className={`block text-sm font-medium mb-2 ${isDemoting ? 'text-orange-400' : 'text-slate-400'}`}>
                            {isDemoting ? "Demote To" : "Promote To"}
                        </label>
                        
                        {isGraduating ? (
                            <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-lg text-emerald-400 font-bold">
                                <FaUserGraduate className="text-xl" />
                                <span>Graduating (Alumni)</span>
                                <button 
                                    onClick={() => setIsGraduating(false)} 
                                    className="ml-auto text-xs underline text-emerald-300 hover:text-white"
                                >
                                    Change
                                </button>
                            </div>
                        ) : (
                            <select 
                                value={toGrade}
                                onChange={(e) => {
                                    if (e.target.value === "GRADUATE") {
                                        setIsGraduating(true);
                                        setToGrade("");
                                    } else {
                                        setToGrade(e.target.value);
                                        setIsGraduating(false);
                                    }
                                }}
                                className="w-full bg-slate-900 text-white p-3 rounded-lg border border-slate-600 focus:border-blue-500 outline-none"
                            >
                                <option value="">Select Target Grade</option>
                                {grades.map(g => (
                                    <option key={g._id} value={g.originalValue || g.name} disabled={(g.originalValue || g.name) === fromGrade}>
                                        {g.name}
                                    </option>
                                ))}
                                <option value="GRADUATE" className="text-emerald-400 font-bold">🎓 Graduate (Alumni)</option>
                            </select>
                        )}
                    </div>
                </div>

                {/* Student Selection List */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col max-h-[400px]">
                    <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                        <h3 className="font-semibold text-white">Select Students</h3>
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                checked={students.length > 0 && selectedStudents.size === students.length}
                                onChange={handleToggleAll}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600"
                            />
                            <span className="text-sm text-slate-400">Select All</span>
                        </div>
                    </div>
                    
                    <div className="overflow-y-auto p-2 space-y-1">
                        {loadingStudents ? (
                            <div className="p-8 flex justify-center"><LoadingSpinner /></div>
                        ) : students.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                No students found in {grades.find(g => (g.originalValue || g.name) === fromGrade)?.name || fromGrade}
                                <div className="text-xs mt-1 opacity-70">Only ACTIVE students are shown</div>
                            </div>
                        ) : (
                            students.map(student => (
                                <label key={student._id} className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors group">
                                    <input 
                                        type="checkbox"
                                        checked={selectedStudents.has(student._id)}
                                        onChange={() => handleToggleStudent(student._id)}
                                        className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-offset-0 focus:ring-0"
                                    />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-slate-200 group-hover:text-white">{student.name}</div>
                                        <div className="text-xs text-slate-500">Roll: {student.rollNumber}</div>
                                    </div>
                                    {selectedStudents.has(student._id) && (
                                        <FaCheck className="text-emerald-500 text-sm" />
                                    )}
                                </label>
                            ))
                        )}
                    </div>
                    
                    <div className="p-3 bg-slate-800 border-t border-slate-700 text-xs text-slate-400 flex justify-between">
                        <span>{selectedStudents.size} students selected</span>
                    </div>
                </div>
            </>
        ) : (
            // Bulk Mode UI
            <div className="space-y-4">
                <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg text-sm text-blue-200">
                    <p className="font-bold mb-1">Bulk Promotion Mode</p>
                    <p>This will automatically promote all active students to the next grade level based on your grade structure. The highest grade will be graduated.</p>
                </div>

                {loadingBulk ? (
                    <div className="p-12 flex justify-center"><LoadingSpinner /></div>
                ) : bulkTransitions.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 bg-slate-800/50 rounded-xl border border-slate-700">
                        No active students found to promote.
                    </div>
                ) : (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 bg-slate-800 border-b border-slate-700">
                            <h3 className="font-semibold text-white">Promotion Plan</h3>
                        </div>
                        <div className="divide-y divide-slate-800">
                            {bulkTransitions.map((t, idx) => (
                                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center font-bold text-slate-300">
                                            {t.fromGradeName.replace(/\D/g, '')}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-200">{t.fromGradeName}</div>
                                            <div className="text-xs text-slate-500">{t.count} Students</div>
                                        </div>
                                    </div>
                                    
                                    <FaArrowRight className="text-slate-600" />
                                    
                                    <div className="flex items-center gap-4 text-right">
                                        <div>
                                            <div className={`font-medium ${t.isGraduating ? 'text-emerald-400' : 'text-slate-200'}`}>
                                                {t.toGradeName}
                                            </div>
                                            {t.isGraduating && <div className="text-xs text-emerald-500/70">Alumni Status</div>}
                                        </div>
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${t.isGraduating ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {t.isGraduating ? <FaUserGraduate /> : t.toGradeName.replace(/\D/g, '')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-slate-800/50 border-t border-slate-800 text-right text-sm text-slate-400">
                            Total {bulkTransitions.reduce((acc, t) => acc + t.count, 0)} students will be promoted
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Debug Info (Only visible if no students found) */}
        {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                <FaExclamationTriangle />
                {error}
            </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handlePromote}
                disabled={promoting || (mode === "single" ? selectedStudents.size === 0 : bulkTransitions.length === 0)}
                className={`px-6 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                    isDemoting ? "bg-orange-600 hover:bg-orange-700" : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
                {promoting ? (
                    <div className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        {mode === "bulk" && bulkProgress && (
                            <span className="text-xs">{bulkProgress.current}/{bulkProgress.total}</span>
                        )}
                    </div>
                ) : (
                    <>
                        {mode === "bulk" ? <FaLayerGroup /> : (isGraduating ? <FaUserGraduate /> : (isDemoting ? <FaArrowDown /> : <FaArrowRight />))}
                        {mode === "bulk" ? "Confirm Promote All" : (isGraduating ? "Graduate Students" : (isDemoting ? "Demote Students" : "Promote Students"))}
                    </>
                )}
            </button>
        </div>
    </div>
  );
}
