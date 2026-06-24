function parseDateInput(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return new Date(`${text}T00:00:00`);
  }

  return new Date(text);
}

export function startOfToday(now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return today;
}

export function isBeforeToday(value, now = new Date()) {
  const date = parseDateInput(value);
  if (!date || Number.isNaN(date.getTime())) return true;

  const candidate = new Date(date);
  candidate.setHours(0, 0, 0, 0);
  return candidate < startOfToday(now);
}

export function isAfterEndOfDay(value, now = new Date()) {
  const date = parseDateInput(value);
  if (!date || Number.isNaN(date.getTime())) return true;

  const deadline = new Date(date);
  deadline.setHours(23, 59, 59, 999);
  return new Date(now) > deadline;
}

export function validateEventDates({ date, registrationDeadline }) {
  if (isBeforeToday(date)) {
    return "Event date cannot be in the past.";
  }

  if (registrationDeadline) {
    if (isBeforeToday(registrationDeadline)) {
      return "Registration deadline cannot be in the past.";
    }

    const eventDate = parseDateInput(date);
    const deadline = parseDateInput(registrationDeadline);

    if (
      eventDate &&
      deadline &&
      !Number.isNaN(eventDate.getTime()) &&
      !Number.isNaN(deadline.getTime()) &&
      deadline > eventDate
    ) {
      return "Registration deadline cannot be after the event date.";
    }
  }

  return "";
}
