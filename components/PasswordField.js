"use client";

import { FaEye, FaEyeSlash, FaCopy } from "react-icons/fa";
import { useState } from "react";

export default function PasswordField({ password, onCopy, showCopy = true }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    if (onCopy) onCopy();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 bg-slate-800 p-2 rounded border border-slate-700 text-sm">
      <input
        type={visible ? "text" : "password"}
        value={password}
        readOnly
        className="flex-1 bg-transparent text-white outline-none font-mono"
      />
      <button
        onClick={() => setVisible(!visible)}
        className="text-slate-400 hover:text-blue-400 transition p-1"
        title={visible ? "Hide" : "Show"}
      >
        {visible ? <FaEyeSlash /> : <FaEye />}
      </button>
      {showCopy && (
        <button
          onClick={handleCopy}
          className="text-slate-400 hover:text-emerald-400 transition p-1"
          title="Copy"
        >
          <FaCopy />
        </button>
      )}
      {copied && (
        <span className="text-green-400 text-xs whitespace-nowrap">
          Copied!
        </span>
      )}
    </div>
  );
}
