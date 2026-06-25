// Shared helpers for CSV bulk upload (students & teachers).
// Goal: make uploads forgiving about header formatting and make every failure
// visible and actionable for non-technical school staff.

// Normalize a header/key so small differences don't break matching:
// strips a leading BOM, surrounding spaces, "*", "-", "_" and lowercases.
// e.g. "FullName*", " full_name ", "Full-Name" all become "fullname".
export function normalizeHeaderKey(key) {
  return String(key || "")
    .trim()
    .replace(/^﻿/, "")
    .toLowerCase()
    .replace(/[\s*\-_]/g, "");
}

// Build a copy of a CSV row keyed by normalized header names.
export function buildNormalizedRow(row) {
  const normalized = {};
  Object.keys(row || {}).forEach((key) => {
    normalized[normalizeHeaderKey(key)] = row[key];
  });
  return normalized;
}

// Return the first non-empty value among the candidate (already normalized) keys.
export function getRowValue(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
}

// Turn an HTTP failure into a plain-language message a school admin understands.
// `kind` is the noun shown in the 403 message, e.g. "students" or "teachers".
export function friendlyUploadError(status, dataMessage, kind = "records") {
  if (status === 401) {
    return "Your session has expired. Please sign out, sign back in, and try the upload again.";
  }
  if (status === 403) {
    return `You can only add ${kind} from a school account. Please sign in as your school (not the platform admin) and try again.`;
  }
  if (status === 404) {
    return "The upload service could not be reached. Please refresh the page and try again.";
  }
  if (status === 413) {
    return "The file is too large. Please split it into smaller files and upload them one at a time.";
  }
  if (status >= 500) {
    return "The server had a problem processing your file. Please wait a moment and try again.";
  }
  if (dataMessage && String(dataMessage).trim()) {
    return String(dataMessage);
  }
  return `The upload failed (error ${status}). Please check your file and try again.`;
}

// Build a CSV string from an array of objects given an ordered list of headers.
export function rowsToCsv(headers, rows) {
  const escape = (value) => {
    const text = value === undefined || value === null ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const head = headers.map(escape).join(",");
  const body = rows
    .map((row) => headers.map((header) => escape(row[header])).join(","))
    .join("\n");
  return `${head}\n${body}\n`;
}

// Trigger a browser download of text content (used for the failed-rows export).
export function downloadTextFile(filename, content, type = "text/csv") {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

// Build a "failed rows" CSV from rows that each carry their original CSV columns
// plus a human-readable reason, so schools can fix just the failures and re-upload.
export function buildFailedRowsCsv(failedRows) {
  const withRow = failedRows.filter((item) => item.row && typeof item.row === "object");
  const baseHeaders = withRow.length
    ? Array.from(new Set(withRow.flatMap((item) => Object.keys(item.row))))
    : [];
  const headers = [...baseHeaders, "Reason"];
  const rows = failedRows.map((item) => ({ ...(item.row || {}), Reason: item.reason }));
  return rowsToCsv(headers, rows);
}
