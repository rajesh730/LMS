export function normalizeCapacityValue(value) {
  if (value === undefined || value === null || value === "") return null;

  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export function validateEventCapacity({ maxParticipants, maxParticipantsPerSchool }) {
  const totalStudentCapacity = normalizeCapacityValue(maxParticipants);
  const maxStudentsPerSchool = normalizeCapacityValue(maxParticipantsPerSchool);

  if (
    maxParticipants !== undefined &&
    maxParticipants !== null &&
    maxParticipants !== "" &&
    totalStudentCapacity === null
  ) {
    return {
      message: "Total student capacity must be a positive whole number.",
      totalStudentCapacity,
      maxStudentsPerSchool,
    };
  }

  if (
    maxParticipantsPerSchool !== undefined &&
    maxParticipantsPerSchool !== null &&
    maxParticipantsPerSchool !== "" &&
    maxStudentsPerSchool === null
  ) {
    return {
      message: "Max students per school must be a positive whole number.",
      totalStudentCapacity,
      maxStudentsPerSchool,
    };
  }

  if (
    totalStudentCapacity !== null &&
    maxStudentsPerSchool !== null &&
    maxStudentsPerSchool > totalStudentCapacity
  ) {
    return {
      message:
        "Max students per school cannot be greater than total student capacity.",
      totalStudentCapacity,
      maxStudentsPerSchool,
    };
  }

  return {
    message: "",
    totalStudentCapacity,
    maxStudentsPerSchool,
  };
}
