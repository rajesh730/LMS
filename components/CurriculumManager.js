'use client';

import { useState, useEffect } from 'react';
import { 
  Book, 
  Plus, 
  Search, 
  GraduationCap, 
  MoreVertical, 
  Loader2,
  AlertCircle,
  FileJson,
  School,
  Trash2
} from 'lucide-react';
import CurriculumImporter from './CurriculumImporter';

export default function CurriculumManager() {
  const [activeTab, setActiveTab] = useState('manage'); // 'manage' or 'import'
  const [structures, setStructures] = useState([]); // Groups of Grades or Faculties
  const [selectedGroup, setSelectedGroup] = useState(null); // Currently selected Grade or Faculty
  const [selectedGroupType, setSelectedGroupType] = useState(null); // 'GRADE' or 'FACULTY'
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  
  // Existing Subjects (Editable)
  const [editableSubjects, setEditableSubjects] = useState([]);
  // Suggested Subjects (Global)
  const [suggestedSubjects, setSuggestedSubjects] = useState([]);

  // New Subject Form (Array for tabular entry)
  const [newSubjects, setNewSubjects] = useState([]);

  useEffect(() => {
    fetchStructure(true);
  }, [showArchived]); // Refetch when showArchived changes

  useEffect(() => {
    if (selectedGroup?.subjects) {
      setEditableSubjects(selectedGroup.subjects.map(s => ({
        ...s,
        isCustom: s.subjectType === 'SCHOOL_CUSTOM',
        // Ensure defaults
        creditHours: s.creditHours || 3,
        year: s.year || 1,
        semester: s.semester || 1,
        linkStatus: s.linkStatus || 'ACTIVE'
      })));
      setSuggestedSubjects(selectedGroup.suggestedSubjects || []);
    } else {
      setEditableSubjects([]);
      setSuggestedSubjects([]);
    }
  }, [selectedGroup]);

  const fetchStructure = async (shouldCheckInit = false) => {
    try {
      const response = await fetch(`/api/school/curriculum/structure?includeArchived=${showArchived}`);
      if (response.ok) {
        const data = await response.json();
        
        // Check if we need to auto-initialize grades
        if (shouldCheckInit) {
          const gradeStructure = data.structures.find(s => s.type === 'GRADE');
          // If no grades or very few grades (e.g. just one), try to sync
          if (!gradeStructure || gradeStructure.items.length < 2) {
            await initializeGrades(true); // Silent mode
            return; // initializeGrades will call fetchStructure again
          }
        }

        setStructures(data.structures);
        
        // Auto-select first item of first structure
        if (data.structures.length > 0 && data.structures[0].items.length > 0) {
          if (!selectedGroup) {
            setSelectedGroup(data.structures[0].items[0]);
            setSelectedGroupType(data.structures[0].type);
          } else {
            // Refresh currently selected group data to show new subjects
            for (const struct of data.structures) {
              const found = struct.items.find(i => i._id === selectedGroup._id);
              if (found) {
                setSelectedGroup(found);
                break;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch curriculum structure', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFixGrades = async () => {
    if (!confirm('This will standardize grade names (e.g., merge "Class 9" into "Grade 9") and fix duplicates. Continue?')) return;
    setLoading(true);
    try {
      const response = await fetch('/api/school/curriculum/init-grades', { method: 'POST' });
      const data = await response.json();
      alert(data.message);
      fetchStructure(false);
    } catch (error) {
      console.error('Fix error', error);
      alert('Failed to fix grades');
    } finally {
      setLoading(false);
    }
  };

  const initializeGrades = async (silent = false) => {
    if (!silent && !confirm('This will check for missing grades (Grade 1-12) and create them. Continue?')) return;
    try {
      const response = await fetch('/api/school/curriculum/init-grades', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        if (!silent) alert(data.message);
        fetchStructure(false); // Refresh without checking init again to avoid loop
      } else {
        const data = await response.json();
        if (!silent) alert(data.message);
      }
    } catch (error) {
      console.error('Init error', error);
    }
  };

  const updateSubject = (index, field, value) => {
    const updated = [...newSubjects];
    updated[index] = { ...updated[index], [field]: value };
    setNewSubjects(updated);
  };

  const addSubjectRow = () => {
    setNewSubjects([...newSubjects, { name: '', code: '', description: '', creditHours: 3, year: 1, semester: 1, isCustom: true }]);
  };

  const removeSubjectRow = (index) => {
    const updated = newSubjects.filter((_, i) => i !== index);
    setNewSubjects(updated);
  };

  const updateExistingSubject = (index, field, value) => {
    const updated = [...editableSubjects];
    updated[index] = { ...updated[index], [field]: value };
    setEditableSubjects(updated);
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!confirm('Are you sure you want to remove this subject? It will be moved to archive.')) return;
    
    try {
      const params = new URLSearchParams({
        subjectId,
        [selectedGroupType === 'GRADE' ? 'gradeId' : 'facultyId']: selectedGroup.name
      });
      
      const response = await fetch(`/api/school/curriculum/update-subject-link?${params}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove from local state or refresh
        fetchStructure();
      } else {
        alert('Failed to delete subject');
      }
    } catch (error) {
      console.error('Delete error', error);
      alert('Error deleting subject');
    }
  };

  const handleRestoreSubject = async (subjectId) => {
    try {
      const payload = {
        subjectId,
        status: 'ACTIVE'
      };

      if (selectedGroupType === 'GRADE') {
        payload.gradeId = selectedGroup.name;
      } else {
        payload.facultyId = selectedGroup.name;
      }

      const response = await fetch('/api/school/curriculum/update-subject-link', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        fetchStructure();
      } else {
        alert('Failed to restore subject');
      }
    } catch (error) {
      console.error('Restore error', error);
      alert('Error restoring subject');
    }
  };

  const handlePermanentDelete = async (subjectId) => {
    if (!confirm('Are you sure you want to PERMANENTLY delete this subject? This action cannot be undone.')) return;

    try {
      const params = new URLSearchParams({
        subjectId,
        [selectedGroupType === 'GRADE' ? 'gradeId' : 'facultyId']: selectedGroup.name,
        permanent: 'true'
      });

      const response = await fetch(`/api/school/curriculum/update-subject-link?${params}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchStructure();
      } else {
        alert('Failed to delete subject permanently');
      }
    } catch (error) {
      console.error('Permanent delete error', error);
      alert('Error deleting subject permanently');
    }
  };

  const handleAddSuggestion = async (subject) => {
    try {
      const payload = {
        name: subject.name,
        code: subject.code,
        creditHours: 3, // Default
        year: 1,
        semester: 1,
        isCustom: false,
        educationLevel: selectedGroupType === 'GRADE' ? 'School' : 'HigherSecondary'
      };

      if (selectedGroupType === 'GRADE') {
        payload.gradeId = selectedGroup.name;
      } else {
        payload.facultyId = selectedGroup.name;
      }

      const response = await fetch('/api/school/curriculum/sync-subject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        fetchStructure();
      } else {
        const data = await response.json();
        alert(`Failed to add subject: ${data.message}`);
      }
    } catch (error) {
      console.error('Add suggestion error', error);
      alert('Error adding subject');
    }
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    if (!selectedGroup) return;

    let successCount = 0;
    let errors = [];

    // 1. Update Existing Subjects
    for (const subject of editableSubjects) {
        try {
            const payload = {
                subjectId: subject._id,
                creditHours: parseFloat(subject.creditHours),
                year: parseInt(subject.year),
                semester: parseInt(subject.semester),
                isCustom: subject.isCustom,
                name: subject.name,
                code: subject.code
            };

            if (selectedGroupType === 'GRADE') {
                payload.gradeId = selectedGroup.name;
            } else {
                payload.facultyId = selectedGroup.name;
            }

            const response = await fetch('/api/school/curriculum/update-subject-link', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const data = await response.json();
                errors.push(`Update ${subject.name}: ${data.message}`);
            }
        } catch (err) {
            errors.push(`Update ${subject.name}: ${err.message}`);
        }
    }

    // 2. Create New Subjects
    for (const subject of newSubjects) {
      // Skip empty rows
      if (!subject.name || !subject.code) continue;

      try {
        const payload = {
          ...subject,
          educationLevel: selectedGroupType === 'GRADE' ? 'School' : 'HigherSecondary'
        };

        if (selectedGroupType === 'GRADE') {
          payload.gradeId = selectedGroup.name;
        } else {
          payload.facultyId = selectedGroup.name;
        }

        const response = await fetch('/api/school/curriculum/sync-subject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
          successCount++;
        } else {
          errors.push(`Create ${subject.name}: ${data.message}`);
        }
      } catch (error) {
        console.error('Error adding subject', error);
        errors.push(`Create ${subject.name}: ${error.message}`);
      }
    }

    fetchStructure();
    if (errors.length === 0) {
      setNewSubjects([]);
      setIsEditing(false);
      setShowArchived(false);
      alert('All changes saved successfully!');
    } else {
      alert(`Saved with errors:\n${errors.join('\n')}`);
    }
  };

  if (loading) {
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
          <h2 className="text-xl font-bold text-white">Curriculum Manager</h2>
          <p className="text-sm text-slate-400">Manage subjects for Grades and Faculties</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'manage' 
                ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' 
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            Manage
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'import' 
                ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' 
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <FileJson className="w-4 h-4 inline-block mr-2" />
            Bulk Import
          </button>
        </div>
      </div>

      {activeTab === 'import' ? (
        <div className="p-6">
          <CurriculumImporter />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Structure Navigation */}
          <div className="w-64 border-r border-slate-800 bg-slate-900/50 overflow-y-auto p-4">
            
            {/* Duplicate Warning Banner */}
            {structures.some(s => s.type === 'GRADE' && s.items.some(i => i.name.startsWith('Class '))) && (
                <div className="mb-4 p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs text-amber-200 font-medium mb-1">Duplicates Detected</p>
                            <p className="text-[10px] text-amber-400/80 mb-2 leading-tight">
                                Found mixed "Class" and "Grade" names.
                            </p>
                            <button 
                                onClick={handleFixGrades}
                                className="w-full py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded transition-colors font-medium"
                            >
                                Fix & Merge Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Academic Structure</h3>
              <div className="flex gap-2">
                <button 
                  onClick={fetchStructure} 
                  className="text-blue-400 hover:text-blue-300 text-xs"
                  title="Refresh"
                >
                  Sync
                </button>
              </div>
            </div>
            
            <div className="space-y-6">
              {structures.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <p className="mb-2">No structure found.</p>
                  <p className="text-xs mb-4">Configure your School Settings first.</p>
                  <button 
                    onClick={() => initializeGrades(false)}
                    className="text-blue-400 hover:text-blue-300 text-xs underline"
                  >
                    Sync Missing Grades
                  </button>
                </div>
              )}
              
              {structures.map((structure, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-2 px-2">
                    <h4 className="text-xs font-bold text-slate-600">{structure.title}</h4>
                    {structure.type === 'GRADE' && (
                        <button 
                            onClick={() => initializeGrades(false)}
                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-0.5 rounded border border-slate-700 transition-colors"
                            title="Fix/Sync Grades"
                        >
                            Fix
                        </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {structure.items.map(item => (
                      <button
                        key={item._id}
                        onClick={() => {
                          setSelectedGroup(item);
                          setSelectedGroupType(structure.type);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                          selectedGroup?._id === item._id
                            ? 'bg-slate-800 text-blue-400 shadow-sm ring-1 ring-slate-700'
                            : 'text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {structure.type === 'GRADE' ? <School className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              
              {structures.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <p className="mb-2">No structure found.</p>
                  <p className="text-xs mb-4">Configure your School Settings first.</p>
                  <button 
                    onClick={initializeGrades}
                    className="text-blue-400 hover:text-blue-300 text-xs underline"
                  >
                    Initialize Default Grades (Class 1-10)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Subjects */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedGroup ? (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {isEditing ? 'Editing ' : ''}Subjects for {selectedGroup?.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isEditing 
                        ? 'Modify existing subjects or add new ones below.' 
                        : 'View subjects assigned to this grade/faculty.'}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {isEditing ? (
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mr-2 cursor-pointer bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={showArchived} 
                          onChange={e => setShowArchived(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                        />
                        {showArchived ? 'Hide Archived' : 'Show Archived'}
                      </label>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                      >
                        Edit Subjects
                      </button>
                    )}
                  </div>
                </div>

                {!isEditing ? (
                  // READ ONLY VIEW
                  <div className="flex flex-col gap-6">
                    <div className="flex-1 overflow-y-auto border border-slate-800 rounded-lg">
                      <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-800 text-slate-200 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 font-medium">Subject Name</th>
                            <th className="px-4 py-3 font-medium">Code</th>
                            <th className="px-4 py-3 font-medium">Credits</th>
                            <th className="px-4 py-3 font-medium text-center">Type</th>
                            {selectedGroupType === 'FACULTY' && (
                              <>
                                <th className="px-4 py-3 font-medium">Year</th>
                                <th className="px-4 py-3 font-medium">Sem</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {editableSubjects.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="p-8 text-center text-slate-500">
                                No subjects found. Click "Edit Subjects" to add some.
                              </td>
                            </tr>
                          ) : (
                            editableSubjects.map((subject) => (
                              <tr key={subject._id} className={`hover:bg-slate-800/50 ${subject.linkStatus === 'INACTIVE' ? 'opacity-50 bg-red-900/10' : ''}`}>
                                <td className="px-4 py-3 text-white">
                                  {subject.name}
                                  {subject.linkStatus === 'INACTIVE' && <span className="ml-2 text-xs text-red-400">(Archived)</span>}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs">{subject.code}</td>
                                <td className="px-4 py-3">{subject.creditHours}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${subject.isCustom ? 'bg-purple-900/30 text-purple-400' : 'bg-blue-900/30 text-blue-400'}`}>
                                    {subject.isCustom ? 'Custom' : 'Global'}
                                  </span>
                                </td>
                                {selectedGroupType === 'FACULTY' && (
                                  <>
                                    <td className="px-4 py-3">{subject.year}</td>
                                    <td className="px-4 py-3">{subject.semester}</td>
                                  </>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>


                  </div>
                ) : (
                  // EDIT MODE (Unified View)
                  <form onSubmit={handleSaveAll} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto border border-slate-800 rounded-lg">
                      <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-800 text-slate-200 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 font-medium">Subject Name *</th>
                            <th className="px-4 py-3 font-medium w-32">Code *</th>
                            <th className="px-4 py-3 font-medium w-24">Credits</th>
                            <th className="px-4 py-3 font-medium w-20 text-center">Extra?</th>
                            {selectedGroupType === 'FACULTY' && (
                              <>
                                <th className="px-4 py-3 font-medium w-20">Year</th>
                                <th className="px-4 py-3 font-medium w-20">Sem</th>
                              </>
                            )}
                            <th className="px-4 py-3 font-medium">Description</th>
                            <th className="px-4 py-3 font-medium w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {/* Existing Subjects */}
                          {editableSubjects.map((subject, index) => (
                            <tr key={subject._id} className={`hover:bg-slate-800/50 bg-slate-900/30 ${subject.linkStatus === 'INACTIVE' ? 'opacity-60' : ''}`}>
                              <td className="p-2">
                                <input
                                  type="text"
                                  required
                                  value={subject.name}
                                  onChange={e => updateExistingSubject(index, 'name', e.target.value)}
                                  className={`w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded focus:ring-1 focus:ring-blue-500 outline-none ${!subject.isCustom || subject.linkStatus === 'INACTIVE' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  readOnly={!subject.isCustom || subject.linkStatus === 'INACTIVE'}
                                  title={!subject.isCustom ? "Global subjects cannot be renamed" : ""}
                                />
                                {subject.linkStatus === 'INACTIVE' && <span className="text-xs text-red-400 block mt-1">Archived</span>}
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  required
                                  value={subject.code}
                                  onChange={e => updateExistingSubject(index, 'code', e.target.value)}
                                  className={`w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded focus:ring-1 focus:ring-blue-500 outline-none ${!subject.isCustom || subject.linkStatus === 'INACTIVE' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  readOnly={!subject.isCustom || subject.linkStatus === 'INACTIVE'}
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  value={subject.creditHours}
                                  onChange={e => updateExistingSubject(index, 'creditHours', e.target.value)}
                                  className={`w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded focus:ring-1 focus:ring-blue-500 outline-none ${subject.linkStatus === 'INACTIVE' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  readOnly={subject.linkStatus === 'INACTIVE'}
                                />
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={subject.isCustom}
                                  disabled
                                  className="w-6 h-6 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 opacity-50 cursor-not-allowed"
                                  title="Cannot change type of existing subject"
                                />
                              </td>
                              {selectedGroupType === 'FACULTY' && (
                                <>
                                  <td className="p-2">
                                    <input
                                      type="number"
                                      min="1"
                                      max="6"
                                      value={subject.year}
                                      onChange={e => updateExistingSubject(index, 'year', parseInt(e.target.value) || 1)}
                                      className={`w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded focus:ring-1 focus:ring-blue-500 outline-none ${subject.linkStatus === 'INACTIVE' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      readOnly={subject.linkStatus === 'INACTIVE'}
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="number"
                                      min="1"
                                      max="12"
                                      value={subject.semester}
                                      onChange={e => updateExistingSubject(index, 'semester', parseInt(e.target.value) || 1)}
                                      className={`w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded focus:ring-1 focus:ring-blue-500 outline-none ${subject.linkStatus === 'INACTIVE' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      readOnly={subject.linkStatus === 'INACTIVE'}
                                    />
                                  </td>
                                </>
                              )}
                              <td className="p-2">
                                <span className="text-xs text-slate-500 italic">Existing</span>
                              </td>
                              <td className="p-2 text-center">
                                {subject.linkStatus === 'INACTIVE' ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreSubject(subject._id)}
                                      className="text-green-500 hover:text-green-400 transition-colors text-xs font-bold"
                                      title="Restore Subject"
                                    >
                                      RESTORE
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handlePermanentDelete(subject._id)}
                                      className="text-red-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-500/10"
                                      title="Delete Permanently"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSubject(subject._id)}
                                    className="text-slate-500 hover:text-red-400 transition-colors"
                                    title="Remove Subject"
                                  >
                                    &times;
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}



                          {/* New Subjects */}
                          {!showArchived && newSubjects.map((subject, index) => (
                            <tr key={`new-${index}`} className="hover:bg-slate-800/50">
                              <td className="p-2">
                                <input
                                  type="text"
                                  required
                                  value={subject.name}
                                  onChange={e => updateSubject(index, 'name', e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded focus:ring-1 focus:ring-blue-500 outline-none placeholder-slate-600"
                                  placeholder="New Subject Name"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  required
                                  value={subject.code}
                                  onChange={e => updateSubject(index, 'code', e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded focus:ring-1 focus:ring-blue-500 outline-none placeholder-slate-600"
                                  placeholder="Code"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  value={subject.creditHours}
                                  onChange={e => updateSubject(index, 'creditHours', e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={subject.isCustom}
                                  onChange={e => updateSubject(index, 'isCustom', e.target.checked)}
                                  className="w-6 h-6 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                                  title="Check to create a school-specific subject (not global)"
                                />
                              </td>
                              {selectedGroupType === 'FACULTY' && (
                                <>
                                  <td className="p-2">
                                    <input
                                      type="number"
                                      min="1"
                                      max="6"
                                      value={subject.year}
                                      onChange={e => updateSubject(index, 'year', parseInt(e.target.value) || 1)}
                                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="number"
                                      min="1"
                                      max="12"
                                      value={subject.semester}
                                      onChange={e => updateSubject(index, 'semester', parseInt(e.target.value) || 1)}
                                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                    />
                                  </td>
                                </>
                              )}
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={subject.description}
                                  onChange={e => updateSubject(index, 'description', e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded focus:ring-1 focus:ring-blue-500 outline-none placeholder-slate-600"
                                  placeholder="Optional description"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeSubjectRow(index)}
                                  className="text-slate-500 hover:text-red-400 transition-colors"
                                >
                                  &times;
                                </button>
                              </td>
                            </tr>
                          ))}


                        </tbody>
                      </table>
                      
                      {/* Add Row Button - Below Last Row */}
                      {!showArchived && (
                      <div className="p-2 border-t border-slate-800 bg-slate-900/50">
                        <button
                          type="button"
                          onClick={addSubjectRow}
                          className="w-full py-2 border-2 border-dashed border-slate-700 rounded-lg text-slate-400 hover:border-blue-500 hover:text-blue-400 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Add New Subject Row
                        </button>
                      </div>
                      )}
                    </div>

                    {/* Suggested Subjects Section (Card Design) */}
                    {suggestedSubjects.length > 0 && !showArchived && (
                      <div className="mt-6 border border-slate-800 rounded-lg p-4 bg-slate-900/50">
                        <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                          <Book className="w-4 h-4 text-blue-400" />
                          Suggested Global Subjects
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {suggestedSubjects.map(subject => (
                            <div key={subject._id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-blue-500/50 transition-colors">
                              <div>
                                <div className="text-sm font-medium text-white">{subject.name}</div>
                                <div className="text-xs text-slate-400 font-mono">{subject.code}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAddSuggestion(subject)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                Add
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-3 mt-6 pt-4 border-t border-slate-800">
                      <div className="flex-1"></div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setShowArchived(false);
                          fetchStructure();
                        }}
                        className="px-6 py-2 text-slate-400 hover:text-white font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      {!showArchived && (
                      <button
                        type="submit"
                        className="px-6 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                      >
                        Save All Changes
                      </button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <GraduationCap className="w-12 h-12 mb-4 text-slate-700" />
                <p>Select a Grade or Faculty to view subjects</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
