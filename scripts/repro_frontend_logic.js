const requests = [
  {
    student: {
      _id: "6939acb02f4486a8abe4fadd",
      name: "Student 1 of Class 10",
    },
    status: "REJECTED",
  },
];

const relevantRequests = requests.filter((r) =>
  ["PENDING", "APPROVED", "REJECTED"].includes(r.status)
);

const selectedIds = relevantRequests
  .map((r) => {
    if (!r.student) return null;
    const sId = typeof r.student === "object" ? r.student._id : r.student;
    return String(sId);
  })
  .filter(Boolean);

console.log("Selected IDs:", selectedIds);

const student = {
  _id: "6939acb02f4486a8abe4fadd",
  name: "Student 1 of Class 10",
};

const isSelected = selectedIds.includes(student._id);
console.log("Is Selected:", isSelected);

if (!isSelected) {
  console.log("FAILURE: Student should be selected but is not.");
  console.log("Student ID:", student._id);
  console.log("Selected IDs type:", typeof selectedIds[0]);
  console.log("Student ID type:", typeof student._id);
} else {
  console.log("SUCCESS: Logic is correct.");
}
