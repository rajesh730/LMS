"use client";

import { useCallback, useEffect, useState } from "react";
import { FiCopy, FiKey, FiPlus, FiTrash2 } from "react-icons/fi";

export default function WebsiteApiKeysPanel() {
  const [keys, setKeys] = useState([]);
  const [name, setName] = useState("Official school website");
  const [newKey, setNewKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/school/settings/api-keys", {
        cache: "no-store",
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || "Could not load API keys");
      setKeys(json.data || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setBusy(true);
    setMessage("");
    setNewKey("");
    try {
      const response = await fetch("/api/school/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || "Could not create API key");
      setNewKey(json.data.apiKey);
      setMessage("API key created. Copy it now; Pravyo will not show it again.");
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id) => {
    if (!window.confirm("Revoke this API key? The connected website will stop updating.")) {
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/school/settings/api-keys/${id}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || "Could not revoke API key");
      await load();
      setMessage("API key revoked.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(newKey);
      setMessage("API key copied.");
    } catch {
      setMessage("Copy failed. Select the key and copy it manually.");
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-blue-500/10 p-3 text-blue-300">
          <FiKey className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-white">Website API</h2>
          <p className="mt-1 text-sm text-slate-400">
            Connect your official website to approved public data in Pravyo.
            Store the key on the website server, never in browser code.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          aria-label="API key name"
          className="min-h-11 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-blue-500"
        />
        <button
          type="button"
          onClick={create}
          disabled={busy || !name.trim()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          <FiPlus /> {busy ? "Please wait..." : "Create API key"}
        </button>
      </div>

      {newKey ? (
        <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
          <p className="text-sm font-semibold text-amber-100">Copy this key now</p>
          <div className="mt-2 flex gap-2">
            <input
              readOnly
              value={newKey}
              className="min-w-0 flex-1 rounded-lg border border-amber-300/20 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
            />
            <button
              type="button"
              onClick={copy}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-300 text-slate-950"
              aria-label="Copy API key"
            >
              <FiCopy />
            </button>
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-slate-300">{message}</p> : null}

      <div className="mt-5 space-y-2">
        {loading ? <p className="text-sm text-slate-400">Loading keys...</p> : null}
        {!loading && keys.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
            No website API keys yet.
          </p>
        ) : null}
        {keys.map((key) => (
          <div
            key={key._id}
            className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{key.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {key.prefix}••••{key.lastFour} · {key.revokedAt ? "Revoked" : "Active"}
                {key.lastUsedAt
                  ? ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                  : " · Never used"}
              </p>
            </div>
            {!key.revokedAt ? (
              <button
                type="button"
                onClick={() => revoke(key._id)}
                disabled={busy}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                aria-label={`Revoke ${key.name}`}
              >
                <FiTrash2 />
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl bg-slate-950/60 p-4 text-xs leading-6 text-slate-400">
        <p className="font-semibold text-slate-200">Website endpoint</p>
        <code className="break-all">GET /api/v1/website/school</code>
        <p className="mt-1">
          Also available: notices, events, writings, achievements and magazines.
          Send the key as <code>Authorization: Bearer YOUR_KEY</code>.
        </p>
      </div>
    </section>
  );
}
