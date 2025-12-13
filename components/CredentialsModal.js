"use client";

import { FaCopy, FaEye, FaEyeSlash, FaTimes, FaDownload } from "react-icons/fa";
import { useState } from "react";

export default function CredentialsModal({ isOpen, credentials, onClose }) {
  const [passwordVisible, setPasswordVisible] = useState(true);
  const [copied, setCopied] = useState(null);

  if (!isOpen || !credentials) return null;

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadPDF = () => {
    let content = `Account Credentials\n`;
    if (credentials.username) content += `Username: ${credentials.username}\n`;
    if (credentials.email) content += `Email: ${credentials.email}\n`;
    content += `Password: ${credentials.password}\n\nIMPORTANT: Share securely and change password on first login.`;
    
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`
    );
    element.setAttribute("download", `credentials-${Date.now()}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Account Credentials</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            <FaTimes />
          </button>
        </div>

        <div className="space-y-4">
          {/* Username */}
          {credentials.username && (
            <div>
                <label className="block text-slate-400 text-sm mb-2">Username</label>
                <div className="flex items-center gap-2 bg-slate-800 p-3 rounded border border-slate-700">
                <input
                    type="text"
                    value={credentials.username}
                    readOnly
                    className="flex-1 bg-transparent text-white outline-none"
                />
                <button
                    onClick={() => copyToClipboard(credentials.username, "username")}
                    className="text-slate-400 hover:text-blue-400 transition"
                >
                    <FaCopy />
                </button>
                </div>
                {copied === "username" && (
                <p className="text-green-400 text-xs mt-1">Copied!</p>
                )}
            </div>
          )}

          {/* Email */}
          {credentials.email && (
            <div>
                <label className="block text-slate-400 text-sm mb-2">Email</label>
                <div className="flex items-center gap-2 bg-slate-800 p-3 rounded border border-slate-700">
                <input
                    type="text"
                    value={credentials.email}
                    readOnly
                    className="flex-1 bg-transparent text-white outline-none"
                />
                <button
                    onClick={() => copyToClipboard(credentials.email, "email")}
                    className="text-slate-400 hover:text-blue-400 transition"
                >
                    <FaCopy />
                </button>
                </div>
                {copied === "email" && (
                <p className="text-green-400 text-xs mt-1">Copied!</p>
                )}
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-slate-400 text-sm mb-2">
              Password
            </label>
            <div className="flex items-center gap-2 bg-slate-800 p-3 rounded border border-slate-700">
              <input
                type={passwordVisible ? "text" : "password"}
                value={credentials.password}
                readOnly
                className="flex-1 bg-transparent text-white outline-none font-mono"
              />
              <button
                onClick={() => setPasswordVisible(!passwordVisible)}
                className="text-slate-400 hover:text-blue-400 transition"
              >
                {passwordVisible ? <FaEyeSlash /> : <FaEye />}
              </button>
              <button
                onClick={() =>
                  copyToClipboard(credentials.password, "password")
                }
                className="text-slate-400 hover:text-blue-400 transition"
              >
                <FaCopy />
              </button>
            </div>
            {copied === "password" && (
              <p className="text-green-400 text-xs mt-1">Copied!</p>
            )}
          </div>

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded text-yellow-400 text-sm">
            ⚠️ Share these credentials securely. Passwords are not recoverable.
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <button
              onClick={downloadPDF}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded flex items-center justify-center gap-2 font-medium transition"
            >
              <FaDownload /> Download
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded font-medium transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
