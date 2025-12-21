export const calculateGrade = (percentage, gradingScale) => {
  if (!gradingScale || !gradingScale.ranges) return null;
  
  // Sort ranges descending by minPercentage to find the highest match first
  // We assume ranges are inclusive of min and exclusive of max, except for the top one?
  // Usually: 90-100. If 90, it's A. If 89.9, it's B.
  // Let's assume standard: percentage >= min && percentage < max (except top can be <= max)
  // Or simpler: just find the first one where percentage >= min.
  
  const sortedRanges = [...gradingScale.ranges].sort((a, b) => b.minPercentage - a.minPercentage);
  
  for (const range of sortedRanges) {
    if (percentage >= range.minPercentage) {
      return range;
    }
  }
  
  // If below lowest range (e.g. 0), return the last one or F
  return sortedRanges[sortedRanges.length - 1];
};

export const calculateGPA = (subjects) => {
  if (!subjects || subjects.length === 0) return 0;
  
  const totalGPA = subjects.reduce((sum, sub) => sum + (sub.gpa || 0), 0);
  return (totalGPA / subjects.length).toFixed(2);
};
