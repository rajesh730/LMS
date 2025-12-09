"use client";

import { useState } from "react";
import Papa from "papaparse";
import { FaFileUpload, FaFileCsv, FaExclamationCircle } from "react-icons/fa";
import { validateFile } from "@/lib/validation";

export default function CSVUploader({
  onUpload,
  label = "Upload CSV",
  maxFileSize = 5 * 1024 * 1024,
}) {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [fileInfo, setFileInfo] = useState(null);

  const handleFile = (selectedFile) => {
    setError("");
    setFileInfo(null);

    // Validation: file type and size
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
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setParsing(true);
    setError("");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsing(false);

        if (results.errors.length > 0) {
          setError(`CSV parsing error: ${results.errors[0].message}`);
          return;
        }

        if (results.data.length === 0) {
          setError("CSV file is empty. Please add data rows.");
          return;
        }

        onUpload(results.data);
        setFile(null);
        setFileInfo(null);
      },
      error: (error) => {
        setParsing(false);
        setError(`Error parsing CSV: ${error.message}`);
      },
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFile(droppedFile);
  };

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg flex items-start gap-3">
          <FaExclamationCircle className="text-lg flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Validation Error</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer
                    ${
                      dragging
                        ? "border-blue-400 bg-blue-500/5"
                        : "border-slate-700 hover:border-blue-500/50 bg-slate-900/30"
                    }`}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("csv-input").click()}
      >
        <input
          id="csv-input"
          type="file"
          accept=".csv"
          hidden
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {fileInfo ? (
          <div>
            <FaFileCsv className="text-3xl text-blue-400 mx-auto mb-2" />
            <p className="text-white font-semibold">{fileInfo.name}</p>
            <p className="text-slate-400 text-sm">{fileInfo.size} KB</p>
          </div>
        ) : (
          <div>
            <FaFileUpload className="text-3xl text-slate-500 mx-auto mb-2" />
            <p className="text-white font-semibold">{label}</p>
            <p className="text-slate-400 text-sm">
              Drag and drop or click to browse
            </p>
            <p className="text-slate-500 text-xs mt-2">
              Max file size: {(maxFileSize / 1024 / 1024).toFixed(1)}MB
            </p>
          </div>
        )}
      </div>

      {/* Upload Button */}
      {file && (
        <button
          onClick={handleUpload}
          disabled={parsing}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          {parsing ? "Processing..." : "📤 Upload & Parse CSV"}
        </button>
      )}
    </div>
  );
}
