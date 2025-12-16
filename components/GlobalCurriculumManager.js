'use client';

import { useState, useEffect } from 'react';
import { 
  Book, 
  Plus, 
  Search, 
  MoreVertical, 
  Loader2,
  Globe,
  Trash2,
  Edit2,
  X,
  Archive,
  RefreshCw,
  Save,
  AlertCircle,
  Check,
  ChevronRight,
  GraduationCap
} from 'lucide-react';

export default function GlobalCurriculumManager() {
  const [subjects, setSubjects] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  
  // Edit Mode State (For existing subjects only)
  const [isEditing, setIsEditing] = useState(false);
  const [editableSubjects, setEditableSubjects] = useState([]);
  
  // Creation Mode State
  const [isCreating, setIsCreating] = useState(false);
  const [creationStep, setCreationStep] = useState(1); // 1: Level, 2: Context, 3: Details
  const [newSubjectData, setNewSubjectData] = useState({
    name: '',
    code: '',
    description: '',
    academicType: 'CORE',
    educationLevel: '', // Single value for creation flow
    selectedGrades: [],
    selectedFaculty: '',
    year: '',
    semester: ''
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeLevel, setActiveLevel] = useState('ALL'); // ALL, School, HigherSecondary, Bachelor
  const [activeGrade, setActiveGrade] = useState('ALL');
  const [activeFaculty, setActiveFaculty] = useState('ALL');

  const GRADE_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1));

  useEffect(() => {
    fetchGlobalSubjects();
    fetchGlobalFaculties();
  }, [showArchived]);

  // Sync editable subjects when subjects change or edit mode toggles
  useEffect(() => {
    if (isEditing) {
      setEditableSubjects(subjects.map(s => ({ ...s })));
    }
  }, [isEditing, subjects]);

  const fetchGlobalSubjects = async () => {
    setLoading(true);
    try {
      const status = showArchived ? 'INACTIVE' : 'ACTIVE';
      const response = await fetch(`/api/admin/subjects?status=${status}`);
      if (response.ok) {
        const data = await response.json();
        setSubjects(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch subjects', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalFaculties = async () => {
    try {
      const response = await fetch('/api/faculties?type=global');
      if (response.ok) {
        const data = await response.json();
        setFaculties(data.data?.faculties || []);
      }
    } catch (error) {
      console.error('Failed to fetch faculties', error);
    }
  };

  const handleSaveEdits = async () => {
    setLoading(true);
    try {
      // Update Existing
      for (const subject of editableSubjects) {
        // Only update if changed (simple check)
        const original = subjects.find(s => s._id === subject._id);
        if (JSON.stringify(original) !== JSON.stringify(subject)) {
           await fetch(`/api/admin/subjects/${subject._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: subject.name,
              code: subject.code,
              description: subject.description,
              academicType: subject.academicType,
              educationLevel: subject.educationLevel,
              grades: subject.grades,
              year: subject.year,
              semester: subject.semester
            })
          });
        }
      }

      setIsEditing(false);
      fetchGlobalSubjects();
      alert('Changes saved successfully');

    } catch (error) {
      console.error('Error saving changes', error);
      alert('Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async () => {
    // Strict Validation
    if (!newSubjectData.name || !newSubjectData.code || !newSubjectData.educationLevel) {
        alert("Please fill in all required fields");
        return;
    }

    // Context Validation
    if (newSubjectData.educationLevel === 'School') {
        if (newSubjectData.selectedGrades.length === 0) {
            alert("Please select at least one grade for School level");
            return;
        }
    } else if (newSubjectData.educationLevel === 'HigherSecondary') {
        if (newSubjectData.selectedGrades.length === 0 && !newSubjectData.selectedFaculty) {
             alert("Please select grades or a faculty for High School level");
             return;
        }
    } else if (newSubjectData.educationLevel === 'Bachelor') {
        if (!newSubjectData.selectedFaculty) {
            alert("Please select a faculty for Bachelor level");
            return;
        }
        // Year/Semester are optional but recommended
    }

    setLoading(true);
    try {
        const payload = {
            name: newSubjectData.name,
            code: newSubjectData.code,
            description: newSubjectData.description,
            academicType: newSubjectData.academicType,
            subjectType: 'GLOBAL',
            educationLevel: [newSubjectData.educationLevel],
            grades: newSubjectData.selectedGrades,
            applicableFaculties: newSubjectData.selectedFaculty ? [newSubjectData.selectedFaculty] : [],
            year: newSubjectData.year ? parseInt(newSubjectData.year) : undefined,
            semester: newSubjectData.semester ? parseInt(newSubjectData.semester) : undefined
        };

        const response = await fetch('/api/admin/subjects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            setIsCreating(false);
            setNewSubjectData({
                name: '', code: '', description: '', academicType: 'CORE',
                educationLevel: '', selectedGrades: [], selectedFaculty: '',
                year: '', semester: ''
            });
            setCreationStep(1);
            fetchGlobalSubjects();
            alert('Subject created successfully');
        } else {
            const err = await response.json();
            alert(err.error || 'Failed to create subject');
        }
    } catch (error) {
        console.error('Error creating subject', error);
        alert('Failed to create subject');
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure? This will archive the subject.')) return;
    try {
      const response = await fetch(`/api/admin/subjects/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        // If in edit mode, remove from editableSubjects locally to reflect immediately
        if (isEditing) {
            setEditableSubjects(prev => prev.filter(s => s._id !== id));
        } else {
            fetchGlobalSubjects();
        }
      }
    } catch (error) {
      console.error('Error deleting subject', error);
    }
  };

  const handleRestore = async (id) => {
    try {
      const response = await fetch(`/api/admin/subjects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' })
      });
      if (response.ok) {
        fetchGlobalSubjects();
      }
    } catch (error) {
      console.error('Error restoring subject', error);
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!confirm('Are you sure? This will PERMANENTLY delete the subject and cannot be undone.')) return;
    try {
      const response = await fetch(`/api/admin/subjects/${id}?permanent=true`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchGlobalSubjects();
      }
    } catch (error) {
      console.error('Error permanently deleting subject', error);
    }
  };

  const updateEditableSubject = (index, field, value) => {
    const updated = [...editableSubjects];
    updated[index] = { ...updated[index], [field]: value };
    setEditableSubjects(updated);
  };

  const toggleGradeSelection = (grade) => {
    setNewSubjectData(prev => {
        const grades = prev.selectedGrades.includes(grade)
            ? prev.selectedGrades.filter(g => g !== grade)
            : [...prev.selectedGrades, grade];
        return { ...prev, selectedGrades: grades };
    });
  };

  // Filter logic applied to either editableSubjects (if editing) or subjects (if viewing)
  const sourceSubjects = isEditing ? editableSubjects : subjects;
  const filteredSubjects = sourceSubjects.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLevel = activeLevel === 'ALL' || (s.educationLevel && s.educationLevel.includes(activeLevel));
    
    const matchesGrade = activeGrade === 'ALL' || (s.grades && s.grades.some(g => {
        // Normalize both for comparison (handle "Grade 9" vs "9")
        const storedNum = g.toString().replace(/\D/g, '');
        const filterNum = activeGrade.toString().replace(/\D/g, '');
        return storedNum === filterNum;
    }));
    
    const matchesFaculty = activeFaculty === 'ALL' || (s.applicableFaculties && s.applicableFaculties.includes(activeFaculty));

    return matchesSearch && matchesLevel && matchesGrade && matchesFaculty;
  });

  if (loading && !isEditing && !isCreating) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 min-h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            Global Subjects Repository
          </h2>
          <p className="text-sm text-slate-400">Manage standard subjects available to all schools</p>
        </div>
        <div className="flex gap-3 items-center">
          {!isEditing && !isCreating ? (
             <>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Create New Subject
                </button>
                <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                    <Edit2 className="w-4 h-4" />
                    Edit Subjects
                </button>
             </>
          ) : isEditing ? (
             <div className="flex gap-3 items-center">
                <button
                  onClick={() => { setIsEditing(false); setShowArchived(false); }}
                  className="text-slate-400 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <div className="h-4 w-px bg-slate-700"></div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 cursor-pointer bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={showArchived} 
                    onChange={e => setShowArchived(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  {showArchived ? 'Hide Archived' : 'Show Archived'}
                </label>
             </div>
          ) : (
            <button
                onClick={() => { setIsCreating(false); setCreationStep(1); }}
                className="text-slate-400 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
                Cancel Creation
            </button>
          )}
        </div>
      </div>

      {/* CREATION FORM */}
      {isCreating && (
        <div className="p-6 border-b border-slate-800 bg-slate-800/30">
            <div className="max-w-4xl mx-auto">
                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-8 relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-800 -z-10"></div>
                    {[1, 2, 3].map((step) => (
                        <div 
                            key={step}
                            className={`flex flex-col items-center gap-2 bg-slate-900 px-4 ${creationStep >= step ? 'text-blue-400' : 'text-slate-600'}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                                creationStep >= step ? 'border-blue-500 bg-blue-500/20' : 'border-slate-700 bg-slate-800'
                            }`}>
                                {step}
                            </div>
                            <span className="text-xs font-medium">
                                {step === 1 ? 'Level' : step === 2 ? 'Context' : 'Details'}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Step 1: Level Selection */}
                {creationStep === 1 && (
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { id: 'School', label: 'School Level', desc: 'Grades 1-10', icon: Book },
                            { id: 'HigherSecondary', label: 'High School', desc: 'Grades 11-12', icon: GraduationCap },
                            { id: 'Bachelor', label: 'Bachelor', desc: 'University Level', icon: Globe }
                        ].map((level) => (
                            <button
                                key={level.id}
                                onClick={() => {
                                    setNewSubjectData({ ...newSubjectData, educationLevel: level.id, selectedGrades: [], selectedFaculty: '' });
                                    setCreationStep(2);
                                }}
                                className={`p-6 rounded-xl border-2 text-left transition-all ${
                                    newSubjectData.educationLevel === level.id 
                                    ? 'border-blue-500 bg-blue-500/10' 
                                    : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                                }`}
                            >
                                <level.icon className={`w-8 h-8 mb-4 ${newSubjectData.educationLevel === level.id ? 'text-blue-400' : 'text-slate-400'}`} />
                                <h3 className="text-lg font-bold text-white mb-1">{level.label}</h3>
                                <p className="text-sm text-slate-400">{level.desc}</p>
                            </button>
                        ))}
                    </div>
                )}

                {/* Step 2: Context Selection */}
                {creationStep === 2 && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-white mb-4">
                            Select Context for {newSubjectData.educationLevel}
                        </h3>

                        {newSubjectData.educationLevel === 'School' && (
                            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                <label className="block text-sm font-medium text-slate-400 mb-4">Select Applicable Grades</label>
                                <div className="grid grid-cols-5 gap-3">
                                    {Array.from({ length: 10 }, (_, i) => String(i + 1)).map(grade => (
                                        <button
                                            key={grade}
                                            onClick={() => toggleGradeSelection(grade)}
                                            className={`p-3 rounded-lg text-sm font-medium border transition-colors ${
                                                newSubjectData.selectedGrades.includes(grade)
                                                ? 'bg-blue-600 border-blue-500 text-white'
                                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                                            }`}
                                        >
                                            Grade {grade}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {newSubjectData.educationLevel === 'HigherSecondary' && (
                            <div className="space-y-6">
                                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                    <label className="block text-sm font-medium text-slate-400 mb-4">Select Grades (Optional if Faculty Selected)</label>
                                    <div className="flex gap-3">
                                        {['11', '12'].map(grade => (
                                            <button
                                                key={grade}
                                                onClick={() => toggleGradeSelection(grade)}
                                                className={`px-6 py-3 rounded-lg text-sm font-medium border transition-colors ${
                                                    newSubjectData.selectedGrades.includes(grade)
                                                    ? 'bg-blue-600 border-blue-500 text-white'
                                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                                                }`}
                                            >
                                                Grade {grade}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Faculty / Stream</label>
                                    <select
                                        value={newSubjectData.selectedFaculty}
                                        onChange={(e) => setNewSubjectData({ ...newSubjectData, selectedFaculty: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">Select Faculty (Optional)</option>
                                        {faculties.map(f => (
                                            <option key={f._id} value={f._id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {newSubjectData.educationLevel === 'Bachelor' && (
                            <div className="space-y-6">
                                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Faculty / Program <span className="text-red-400">*</span></label>
                                    <select
                                        value={newSubjectData.selectedFaculty}
                                        onChange={(e) => setNewSubjectData({ ...newSubjectData, selectedFaculty: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">Select Faculty</option>
                                        {faculties.map(f => (
                                            <option key={f._id} value={f._id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                        <label className="block text-sm font-medium text-slate-400 mb-2">Year (Optional)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="5"
                                            value={newSubjectData.year}
                                            onChange={(e) => setNewSubjectData({ ...newSubjectData, year: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="e.g. 1"
                                        />
                                    </div>
                                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                        <label className="block text-sm font-medium text-slate-400 mb-2">Semester (Optional)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={newSubjectData.semester}
                                            onChange={(e) => setNewSubjectData({ ...newSubjectData, semester: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="e.g. 1"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between pt-4">
                            <button
                                onClick={() => setCreationStep(1)}
                                className="text-slate-400 hover:text-white px-4 py-2"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => setCreationStep(3)}
                                disabled={
                                    (newSubjectData.educationLevel === 'School' && newSubjectData.selectedGrades.length === 0) ||
                                    (newSubjectData.educationLevel === 'Bachelor' && !newSubjectData.selectedFaculty)
                                }
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                Next Step <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Details */}
                {creationStep === 3 && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Subject Name <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    value={newSubjectData.name}
                                    onChange={(e) => setNewSubjectData({ ...newSubjectData, name: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Advanced Mathematics"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Subject Code <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    value={newSubjectData.code}
                                    onChange={(e) => setNewSubjectData({ ...newSubjectData, code: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. MTH-101"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Academic Type</label>
                            <div className="flex gap-4">
                                {['CORE', 'ELECTIVE'].map(type => (
                                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="academicType"
                                            value={type}
                                            checked={newSubjectData.academicType === type}
                                            onChange={(e) => setNewSubjectData({ ...newSubjectData, academicType: e.target.value })}
                                            className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500"
                                        />
                                        <span className="text-white">{type}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Description</label>
                            <textarea
                                value={newSubjectData.description}
                                onChange={(e) => setNewSubjectData({ ...newSubjectData, description: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                                placeholder="Brief description of the subject..."
                            />
                        </div>

                        <div className="flex justify-between pt-4 border-t border-slate-800">
                            <button
                                onClick={() => setCreationStep(2)}
                                className="text-slate-400 hover:text-white px-4 py-2"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleCreateSubject}
                                disabled={!newSubjectData.name || !newSubjectData.code}
                                className="bg-emerald-600 text-white px-8 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bold"
                            >
                                <Check className="w-4 h-4" />
                                Create Subject
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Filters - Always Visible */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 space-y-4">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm placeholder-slate-500"
            />
          </div>

          {/* Level Filter */}
          <select
            value={activeLevel}
            onChange={(e) => setActiveLevel(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="ALL">All Levels</option>
            <option value="School">School (1-10)</option>
            <option value="HigherSecondary">High School (11-12)</option>
            <option value="Bachelor">Bachelor</option>
          </select>

          {/* Grade Filter */}
          <select
            value={activeGrade}
            onChange={(e) => setActiveGrade(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="ALL">All Grades</option>
            {GRADE_OPTIONS.map(g => (
              <option key={g} value={g}>Grade {g}</option>
            ))}
          </select>

          {/* Faculty Filter */}
          <select
            value={activeFaculty}
            onChange={(e) => setActiveFaculty(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="ALL">All Faculties</option>
            {faculties.map(f => (
              <option key={f._id} value={f._id}>{f.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase sticky top-0 z-10">
            <tr>
              <th className="p-4 font-medium border-b border-slate-700 w-24">Code</th>
              <th className="p-4 font-medium border-b border-slate-700">Subject Name</th>
              <th className="p-4 font-medium border-b border-slate-700 w-32">Type</th>
              <th className="p-4 font-medium border-b border-slate-700 w-40">Level</th>
              <th className="p-4 font-medium border-b border-slate-700 w-32">Context</th>
              <th className="p-4 font-medium border-b border-slate-700">Description</th>
              <th className="p-4 font-medium border-b border-slate-700 text-right w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredSubjects.length > 0 ? (
              filteredSubjects.map((subject, index) => {
                // Find the actual index in editableSubjects if we are filtering
                // This is tricky because map index might not match editableSubjects index if filtered.
                // We need to find the index in the source array.
                const realIndex = isEditing ? editableSubjects.findIndex(s => s._id === subject._id) : index;

                return (
                <tr key={subject._id} className="hover:bg-slate-800/30 transition-colors group">
                  {/* CODE */}
                  <td className="p-4 align-top">
                    {isEditing ? (
                        <input 
                            type="text" 
                            value={subject.code}
                            onChange={(e) => updateEditableSubject(realIndex, 'code', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                    ) : (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-purple-900/30 text-purple-300 border border-purple-500/20 font-mono">
                        {subject.code}
                        </span>
                    )}
                  </td>

                  {/* NAME */}
                  <td className="p-4 align-top">
                    {isEditing ? (
                        <input 
                            type="text" 
                            value={subject.name}
                            onChange={(e) => updateEditableSubject(realIndex, 'name', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                    ) : (
                        <div className="font-medium text-white">{subject.name}</div>
                    )}
                  </td>

                  {/* TYPE */}
                  <td className="p-4 align-top">
                    {isEditing ? (
                        <select
                            value={subject.academicType}
                            onChange={(e) => updateEditableSubject(realIndex, 'academicType', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                        >
                            <option value="CORE">Core</option>
                            <option value="ELECTIVE">Elective</option>
                        </select>
                    ) : (
                        <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded-full border border-slate-600">
                        {subject.academicType}
                        </span>
                    )}
                  </td>

                  {/* LEVEL */}
                  <td className="p-4 align-top">
                    {isEditing ? (
                        <select
                            value={subject.educationLevel?.[0] || 'School'}
                            onChange={(e) => updateEditableSubject(realIndex, 'educationLevel', [e.target.value])}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                        >
                            <option value="School">School</option>
                            <option value="HigherSecondary">High School</option>
                            <option value="Bachelor">Bachelor</option>
                        </select>
                    ) : (
                        <div className="flex flex-wrap gap-1">
                        {subject.educationLevel?.map(level => (
                            <span key={level} className="text-xs px-2 py-1 bg-blue-900/30 text-blue-300 rounded-full border border-blue-500/20">
                            {level}
                            </span>
                        ))}
                        </div>
                    )}
                  </td>

                  {/* CONTEXT (Grades/Faculty/Year) */}
                  <td className="p-4 align-top">
                    {isEditing ? (
                        <div className="space-y-2">
                            <input 
                                type="text" 
                                value={subject.grades ? subject.grades.join(', ') : ''}
                                onChange={(e) => updateEditableSubject(realIndex, 'grades', e.target.value.split(',').map(g => g.trim()).filter(g => g))}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                placeholder="Grades (e.g. 1, 2)"
                            />
                            <div className="flex gap-2">
                                <input 
                                    type="number" 
                                    value={subject.year || ''}
                                    onChange={(e) => updateEditableSubject(realIndex, 'year', e.target.value)}
                                    className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                    placeholder="Year"
                                />
                                <input 
                                    type="number" 
                                    value={subject.semester || ''}
                                    onChange={(e) => updateEditableSubject(realIndex, 'semester', e.target.value)}
                                    className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                    placeholder="Sem"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {/* Grades */}
                            {subject.grades && subject.grades.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {subject.grades.map(grade => (
                                        <span key={grade} className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                                        G{grade}
                                        </span>
                                    ))}
                                </div>
                            )}
                            
                            {/* Faculty */}
                            {subject.applicableFaculties && subject.applicableFaculties.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {subject.applicableFaculties.map(facId => {
                                        const fac = faculties.find(f => f._id === facId);
                                        return fac ? (
                                            <span key={facId} className="text-xs px-2 py-0.5 bg-indigo-900/30 text-indigo-300 rounded border border-indigo-500/20">
                                                {fac.name}
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            )}

                            {/* Year/Sem */}
                            {(subject.year || subject.semester) && (
                                <div className="flex gap-2 text-xs text-slate-400">
                                    {subject.year && <span>Year: {subject.year}</span>}
                                    {subject.semester && <span>Sem: {subject.semester}</span>}
                                </div>
                            )}

                            {/* Fallback */}
                            {!subject.grades?.length && !subject.applicableFaculties?.length && !subject.year && !subject.semester && (
                                <span className="text-xs text-slate-600 italic">Generic</span>
                            )}
                        </div>
                    )}
                  </td>

                  {/* DESCRIPTION */}
                  <td className="p-4 align-top">
                    {isEditing ? (
                        <input 
                            type="text" 
                            value={subject.description || ''}
                            onChange={(e) => updateEditableSubject(realIndex, 'description', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="Optional description"
                        />
                    ) : (
                        <div className="text-xs text-slate-500 truncate max-w-[200px]">{subject.description}</div>
                    )}
                  </td>

                  {/* ACTIONS */}
                  <td className="p-4 text-right align-top">
                      <div className={`flex justify-end gap-2 ${!isEditing ? 'opacity-0 group-hover:opacity-100' : ''} transition-opacity`}>
                        {showArchived ? (
                          <>
                            <button 
                              onClick={() => handleRestore(subject._id)}
                              className="p-2 hover:bg-emerald-900/30 rounded text-emerald-400 transition-colors"
                              title="Restore Subject"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handlePermanentDelete(subject._id)}
                              className="p-2 hover:bg-red-900/30 rounded text-red-400 transition-colors"
                              title="Delete Permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => handleDelete(subject._id)}
                            className="p-2 hover:bg-red-900/30 rounded text-red-400 transition-colors"
                            title="Archive Subject"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                  </td>
                </tr>
              )})
            ) : (
              !isEditing && (
              <tr>
                <td colSpan="8" className="p-12 text-center text-slate-500">
                  <Book className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  No subjects found matching your filters
                </td>
              </tr>
              )
            )}
          </tbody>
        </table>
      
        {/* Footer Actions for Edit Mode */}
        {isEditing && (
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <div className="flex justify-end gap-3">
                    <button
                      onClick={() => { setIsEditing(false); setShowArchived(false); }}
                      className="px-4 py-2 text-slate-300 hover:text-white text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdits}
                      className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
