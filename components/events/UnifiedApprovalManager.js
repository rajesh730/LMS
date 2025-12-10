"use client";

import { useState } from "react";
import StatusSidebar from "./StatusSidebar";
import DetailPanel from "./DetailPanel";

export default function UnifiedApprovalManager({
  requests,
  event,
  capacityInfo,
  onDataChange,
}) {
  const [activeStatus, setActiveStatus] = useState("PENDING");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Organize requests by status
  const requestsByStatus = {
    PENDING: requests.filter((r) => r.status === "PENDING"),
    APPROVED: requests.filter((r) => r.status === "ENROLLED"),
    REJECTED: requests.filter((r) => r.status === "REJECTED"),
  };

  // Count by status
  const statusCounts = {
    PENDING: requestsByStatus.PENDING.length,
    APPROVED: requestsByStatus.APPROVED.length,
    REJECTED: requestsByStatus.REJECTED.length,
    ALL: requests.length,
  };

  const activeRequests = requestsByStatus[activeStatus] || [];

  const handleSelectStudent = (studentId, isChecked) => {
    if (isChecked) {
      setSelectedStudents([...selectedStudents, studentId]);
    } else {
      setSelectedStudents(selectedStudents.filter((id) => id !== studentId));
    }
  };

  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      setSelectedStudents(activeRequests.map((r) => r.student._id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleClearSelection = () => {
    setSelectedStudents([]);
    setSelectedStudent(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
      {/* LEFT PANEL: Status Sidebar */}
      <StatusSidebar
        statusCounts={statusCounts}
        activeStatus={activeStatus}
        onStatusChange={(status) => {
          setActiveStatus(status);
          setSelectedStudents([]);
          setSelectedStudent(null);
        }}
        selectedCount={selectedStudents.length}
        totalCount={activeRequests.length}
      />

      {/* RIGHT PANEL: Detail Panel */}
      <DetailPanel
        status={activeStatus}
        requests={activeRequests}
        selectedStudents={selectedStudents}
        selectedStudent={selectedStudent}
        event={event}
        capacityInfo={capacityInfo}
        onSelectStudent={handleSelectStudent}
        onSelectAll={handleSelectAll}
        onSelectStudentDetail={setSelectedStudent}
        onClearSelection={handleClearSelection}
        onDataChange={onDataChange}
      />
    </div>
  );
}
