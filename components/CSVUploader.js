"use client";

import { useState } from "react";
import Papa from "papaparse";
import { FaFileUpload, FaFileCsv, FaExclamationCircle } from "react-icons/fa";
import { validateFile } from "@/lib/validation";

export default function CSVUploader({
  onUpload,
  label = "Upload CSV",
  uploadingLabel = "Uploading CSV rows",
  maxFileSize = 5 * 1024 * 1024,
}) {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [fileInfo, setFileInfo] = useState(null);
  const busy = parsing || uploading;

  const handleFile = (selectedFile) => {
    if (!selectedFile || busy) return;

    setError("");
    setFileInfo(null);

    const fileError = validateFile(selectedFile, {
      maxSize: maxFileSize,
      allowedTypes: ["text/csv", "application/vnd.ms-excel", "application/csv"],
    });

    if (fileError) {
      setError(fileError);
      return;
    }

    setFile(selectedFile);
    setFileInfo({
      name: selectedFile.name,
      size: (selectedFile.size / 1024).toFixed(2),
    });
  };

  const handleUpload = () => {
    if (!file || busy) {
      setError("Please select a file first");
      return;
    }

    setParsing(true);
    setError("");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setParsing(false);

        if (results.errors.length > 0) {
          setError(`CSV parsing error: ${results.errors[0].message}`);
          return;
        }

        if (results.data.length === 0) {
          setError("CSV file is empty. Please add data rows.");
          return;
        }

        setUploading(true);
        try {
          await onUpload(results.data);
          setFile(null);
          setFileInfo(null);
        } catch (uploadError) {
          setError(
            uploadError?.message ||
              "Upload failed. Please check the file and try again."
          );
        } finally {
          setUploading(false);
        }
      },
      error: (parseError) => {
        setParsing(false);
        setError(`Error parsing CSV: ${parseError.message}`);
      },
    });
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    handleFile(event.dataTransfer.files[0]);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
          <FaExclamationCircle className="mt-0.5 flex-shrink-0 text-lg" />
          <div>
            <p className="text-sm font-semibold">Validation Error</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      )}

      <div
        className={`rounded-xl border-2 border-dashed p-6 text-center transition ${
          busy
            ? "cursor-not-allowed border-[#dbe5f4] bg-[#f8fbff] opacity-80"
            : dragging
              ? "cursor-pointer border-[#0a2f66] bg-[#eaf2ff]"
              : "cursor-pointer border-[#d7cdbb] bg-[#f8fbff] hover:border-[#7fb1ee]"
        }`}
        onDragEnter={() => {
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (!busy) document.getElementById("csv-input").click();
        }}
      >
        <input
          id="csv-input"
          type="file"
          accept=".csv"
          hidden
          disabled={busy}
          onChange={(event) => handleFile(event.target.files[0])}
        />

        {fileInfo ? (
          <div>
            <FaFileCsv className="mx-auto mb-2 text-3xl text-[#0a2f66]" />
            <p className="font-semibold text-[#17120a]">{fileInfo.name}</p>
            <p className="text-sm text-[#52657d]">{fileInfo.size} KB</p>
          </div>
        ) : (
          <div>
            <FaFileUpload className="mx-auto mb-2 text-3xl text-[#7a8aa0]" />
            <p className="font-semibold text-[#17120a]">{label}</p>
            <p className="text-sm text-[#52657d]">
              Drag and drop or click to browse
            </p>
            <p className="mt-2 text-xs text-[#7a8aa0]">
              Max file size: {(maxFileSize / 1024 / 1024).toFixed(1)}MB
            </p>
          </div>
        )}
      </div>

      {busy && (
        <div
          className="rounded-xl border border-[#dbe5f4] bg-white p-4 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <span
              className="pravyo-spinner h-8 w-8 shrink-0 text-[#0a2f66]"
              style={{ "--pravyo-ring": "4px" }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="font-black text-[#17120a]">
                {parsing ? "Reading CSV file" : uploadingLabel}
              </p>
              <p className="text-sm font-semibold text-[#52657d]">
                {parsing
                  ? "Checking the file format before import."
                  : "Keep this page open while the server creates accounts."}
              </p>
            </div>
          </div>
          <div className="pravyo-indeterminate-progress mt-4">
            <span />
          </div>
        </div>
      )}

      {file && (
        <button
          onClick={handleUpload}
          disabled={busy}
          className="w-full rounded-lg bg-[#0a2f66] px-6 py-3 font-semibold text-white transition hover:bg-[#123f7d] disabled:bg-[#9db6d9]"
        >
          {busy ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span className="pravyo-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              {parsing ? "Processing CSV" : "Uploading"}
            </span>
          ) : (
            "Upload & Parse CSV"
          )}
        </button>
      )}
    </div>
  );
}
