"use client";

import { useRef } from "react";
import { FaPrint, FaSchool, FaDownload } from "react-icons/fa";

export default function StudentReportCard({ data }) {
  const componentRef = useRef();

  const handlePrint = () => {
    const printContent = componentRef.current.innerHTML;
    const originalContents = document.body.innerHTML;

    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); // Reload to restore event listeners
  };

  if (!data) return null;

  const { student, exam, subjects, summary } = data;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-end mb-4 gap-2 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <FaPrint /> Print Report Card
        </button>
      </div>

      <div
        ref={componentRef}
        className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 text-gray-800 print:shadow-none print:border-none"
      >
        {/* Header */}
        <div className="text-center border-b-2 border-gray-800 pb-6 mb-6">
          <div className="flex justify-center items-center gap-3 mb-2">
            <FaSchool className="text-4xl text-gray-700" />
            <h1 className="text-3xl font-bold uppercase tracking-wider">
              School Name Here
            </h1>
          </div>
          <p className="text-sm text-gray-500">Address of the School, City, Country</p>
          <p className="text-sm text-gray-500">Phone: +123 456 7890 | Email: info@school.com</p>
          
          <div className="mt-6 bg-gray-800 text-white py-2 rounded-full inline-block px-8">
            <h2 className="text-xl font-bold uppercase">{exam.name}</h2>
            <p className="text-sm opacity-90">{exam.academicYear}</p>
          </div>
        </div>

        {/* Student Info */}
        <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
          <div className="space-y-2">
            <div className="flex border-b border-gray-200 pb-1">
              <span className="font-bold w-32">Student Name:</span>
              <span>{student.name}</span>
            </div>
            <div className="flex border-b border-gray-200 pb-1">
              <span className="font-bold w-32">Grade/Class:</span>
              <span>{student.grade}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex border-b border-gray-200 pb-1">
              <span className="font-bold w-32">Roll Number:</span>
              <span>{student.rollNumber}</span>
            </div>
            <div className="flex border-b border-gray-200 pb-1">
              <span className="font-bold w-32">Section:</span>
              <span>{student.section}</span>
            </div>
          </div>
        </div>

        {/* Marks Table */}
        <table className="w-full mb-8 border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100 text-sm uppercase">
              <th className="border border-gray-300 p-3 text-left">Subject</th>
              <th className="border border-gray-300 p-3 text-center">Full Marks</th>
              <th className="border border-gray-300 p-3 text-center">Obtained</th>
              <th className="border border-gray-300 p-3 text-center">Grade</th>
              <th className="border border-gray-300 p-3 text-center">GPA</th>
              <th className="border border-gray-300 p-3 text-left">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((sub, index) => (
              <tr key={index} className="text-sm">
                <td className="border border-gray-300 p-3 font-medium">{sub.subject}</td>
                <td className="border border-gray-300 p-3 text-center">{sub.totalMarks}</td>
                <td className="border border-gray-300 p-3 text-center">{sub.marksObtained}</td>
                <td className="border border-gray-300 p-3 text-center font-bold">{sub.grade}</td>
                <td className="border border-gray-300 p-3 text-center">{sub.gpa}</td>
                <td className="border border-gray-300 p-3 text-xs text-gray-600">{sub.remarks}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 font-bold">
            <tr>
              <td className="border border-gray-300 p-3 text-right">Total</td>
              <td className="border border-gray-300 p-3 text-center">{summary.maxMarks}</td>
              <td className="border border-gray-300 p-3 text-center">{summary.totalObtained}</td>
              <td className="border border-gray-300 p-3" colSpan="3"></td>
            </tr>
          </tfoot>
        </table>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          <div className="border border-gray-300 p-4 rounded text-center bg-blue-50">
            <p className="text-xs text-gray-500 uppercase">Percentage</p>
            <p className="text-2xl font-bold text-blue-700">{summary.percentage}%</p>
          </div>
          <div className="border border-gray-300 p-4 rounded text-center bg-green-50">
            <p className="text-xs text-gray-500 uppercase">GPA</p>
            <p className="text-2xl font-bold text-green-700">{summary.gpa}</p>
          </div>
          <div className="border border-gray-300 p-4 rounded text-center bg-purple-50">
            <p className="text-xs text-gray-500 uppercase">Final Grade</p>
            <p className="text-2xl font-bold text-purple-700">{summary.grade}</p>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-8 mt-20 pt-8">
          <div className="text-center border-t border-gray-400 pt-2">
            <p className="font-bold text-sm">Class Teacher</p>
          </div>
          <div className="text-center border-t border-gray-400 pt-2">
            <p className="font-bold text-sm">Principal</p>
          </div>
          <div className="text-center border-t border-gray-400 pt-2">
            <p className="font-bold text-sm">Guardian</p>
          </div>
        </div>
        
        <div className="text-center mt-12 text-xs text-gray-400">
            Generated on {new Date().toLocaleDateString()} by E-Grantha School Management System
        </div>
      </div>
    </div>
  );
}
