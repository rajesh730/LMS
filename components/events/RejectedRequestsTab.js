"use client";

export default function RejectedRequestsTab({ requests }) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 text-lg">No rejected requests</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 border-b border-slate-300">
          <tr>
            <th className="p-3 text-left font-semibold text-slate-700">
              Student
            </th>
            <th className="p-3 text-left font-semibold text-slate-700">
              School
            </th>
            <th className="p-3 text-left font-semibold text-slate-700">
              Grade
            </th>
            <th className="p-3 text-left font-semibold text-slate-700">
              Rejection Reason
            </th>
            <th className="p-3 text-left font-semibold text-slate-700">
              Rejected Date
            </th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr
              key={request._id}
              className="border-b border-slate-200 hover:bg-slate-50"
            >
              <td className="p-3 font-medium">{request.student.name}</td>
              <td className="p-3">{request.school.name}</td>
              <td className="p-3">{request.student.grade}</td>
              <td className="p-3 text-red-600">
                {request.rejectionReason || "No reason provided"}
              </td>
              <td className="p-3 text-xs text-slate-500">
                {new Date(request.rejectedAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
