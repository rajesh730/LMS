"use client";

import { FaCopy, FaDownload, FaEye, FaEyeSlash, FaTimes } from "react-icons/fa";
import { useEffect, useMemo, useState } from "react";

export default function CredentialsModal({ isOpen, credentials, onClose }) {
  const [passwordVisible, setPasswordVisible] = useState(true);
  const [copied, setCopied] = useState(null);
  const credentialList = useMemo(
    () => (Array.isArray(credentials) ? credentials : credentials ? [credentials] : []),
    [credentials]
  );

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || credentialList.length === 0) return null;

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadCredentials = () => {
    const content = credentialList
      .map((entry, index) => {
        let block = `Account ${index + 1}\n`;
        if (entry.name) block += `Name: ${entry.name}\n`;
        if (entry.username) block += `Username: ${entry.username}\n`;
        if (entry.email) block += `Email: ${entry.email}\n`;
        block += `Password: ${entry.password}\n`;
        return block;
      })
      .join("\n")
      .concat("\nIMPORTANT: Share securely and change password on first login.");

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
      <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
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
          {credentialList.map((entry, index) => (
            <div
              key={`${entry.email || entry.username || index}`}
              className="border border-slate-800 rounded-xl p-4 bg-slate-950/60 space-y-4"
            >
              {credentialList.length > 1 && (
                <div className="text-sm font-medium text-slate-300">
                  Account {index + 1}
                  {entry.name ? ` - ${entry.name}` : ""}
                </div>
              )}

              {entry.username && (
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Username</label>
                  <div className="flex items-center gap-2 bg-slate-800 p-3 rounded border border-slate-700">
                    <input
                      type="text"
                      value={entry.username}
                      readOnly
                      className="flex-1 bg-transparent text-white outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(entry.username, `username-${index}`)}
                      className="text-slate-400 hover:text-blue-400 transition"
                    >
                      <FaCopy />
                    </button>
                  </div>
                  {copied === `username-${index}` && (
                    <p className="text-green-400 text-xs mt-1">Copied!</p>
                  )}
                </div>
              )}

              {entry.email && (
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Email</label>
                  <div className="flex items-center gap-2 bg-slate-800 p-3 rounded border border-slate-700">
                    <input
                      type="text"
                      value={entry.email}
                      readOnly
                      className="flex-1 bg-transparent text-white outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(entry.email, `email-${index}`)}
                      className="text-slate-400 hover:text-blue-400 transition"
                    >
                      <FaCopy />
                    </button>
                  </div>
                  {copied === `email-${index}` && (
                    <p className="text-green-400 text-xs mt-1">Copied!</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-slate-400 text-sm mb-2">Password</label>
                <div className="flex items-center gap-2 bg-slate-800 p-3 rounded border border-slate-700">
                  <input
                    type={passwordVisible ? "text" : "password"}
                    value={entry.password}
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
                    onClick={() => copyToClipboard(entry.password, `password-${index}`)}
                    className="text-slate-400 hover:text-blue-400 transition"
                  >
                    <FaCopy />
                  </button>
                </div>
                {copied === `password-${index}` && (
                  <p className="text-green-400 text-xs mt-1">Copied!</p>
                )}
              </div>
            </div>
          ))}

          <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded text-yellow-400 text-sm">
            Share these credentials securely. Passwords are not recoverable.
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={downloadCredentials}
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
