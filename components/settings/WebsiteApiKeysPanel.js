"use client";

import { useCallback, useEffect, useState } from "react";
import { FiCopy, FiKey, FiPlus, FiTrash2 } from "react-icons/fi";

const RESOURCES = [
  ["School profile", "school"],
  ["Public notices", "notices"],
  ["Public events", "events"],
  ["Published writings", "writings"],
  ["Public achievements", "achievements"],
  ["Published magazines", "magazines"],
];

const cleanCurl = (value) => value.replace("\n+  -H", "\n  -H");

export default function WebsiteApiKeysPanel() {
  const [keys, setKeys] = useState([]);
  const [name, setName] = useState("Official school website");
  const [newKey, setNewKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [origin, setOrigin] = useState("");

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
    setOrigin(window.location.origin);
    void load();
  }, [load]);

  const apiBase = `${origin}/api/v1/website`;
  const exampleKey = newKey || "YOUR_API_KEY";
  const envExample = `PRAVYO_API_URL=${apiBase || "https://your-pravyo-domain.com/api/v1/website"}\nPRAVYO_API_KEY=${exampleKey}`;
  const curlExample = `curl "${apiBase || "https://your-pravyo-domain.com/api/v1/website"}/notices?page=1&limit=10" \\\n+  -H "Authorization: Bearer ${exampleKey}"`;
  const javascriptExample = `const response = await fetch(
  \`\${process.env.PRAVYO_API_URL}/notices?page=1&limit=10\`,
  {
    headers: {
      Authorization: \`Bearer \${process.env.PRAVYO_API_KEY}\`,
    },
  }
);

if (!response.ok) throw new Error(\`Pravyo API: \${response.status}\`);
const { data } = await response.json();
console.log(data.items);`;

  const fullGuide = `PRAVYO WEBSITE API

Base URL: ${apiBase || "https://your-pravyo-domain.com/api/v1/website"}
Authentication header: Authorization: Bearer ${exampleKey}

Endpoints:
${RESOURCES.map(([label, resource]) => `- ${label}: GET /${resource}`).join("\n")}

Pagination: ?page=1&limit=12 (maximum 25)

.env
${envExample}

cURL
${curlExample}

Server-side JavaScript
${javascriptExample}`;

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

  const copyText = async (text, successMessage = "Copied.") => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(successMessage);
    } catch {
      setMessage("Copy failed. Select the text and copy it manually.");
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
              onClick={() => copyText(newKey, "API key copied.")}
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

      <div className="mt-6 border-t border-slate-800 pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Developer handoff</h3>
            <p className="mt-1 text-sm text-slate-400">
              Everything a website developer or coding AI needs to connect.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              copyText(cleanCurl(fullGuide), "Complete integration guide copied.")
            }
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 text-sm font-semibold text-slate-200 hover:border-slate-500"
          >
            <FiCopy /> Copy complete guide
          </button>
        </div>

        <InfoBlock
          title="API base URL"
          value={apiBase || "Loading API address..."}
          onCopy={() => copyText(apiBase, "API base URL copied.")}
        />

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
          <div className="border-b border-slate-800 bg-slate-950/70 px-4 py-3">
            <p className="text-sm font-semibold text-white">Available endpoints</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Add <code>?page=1&amp;limit=12</code> to list endpoints. Maximum 25.
            </p>
          </div>
          {RESOURCES.map(([label, resource]) => {
            const endpoint = `${apiBase}/${resource}`;
            return (
              <div
                key={resource}
                className="flex items-center gap-3 border-b border-slate-800 px-4 py-3 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">{label}</p>
                  <code className="block truncate text-xs text-slate-200">
                    GET {endpoint}
                  </code>
                </div>
                <CopyButton
                  label={`Copy ${label} endpoint`}
                  onClick={() => copyText(endpoint, `${label} endpoint copied.`)}
                />
              </div>
            );
          })}
        </div>

        <CodeBlock
          title="1. Website server environment (.env)"
          code={envExample}
          onCopy={() => copyText(envExample, "Environment configuration copied.")}
        />
        <CodeBlock
          title="2. Test with cURL"
          code={cleanCurl(curlExample)}
          onCopy={() => copyText(cleanCurl(curlExample), "cURL example copied.")}
        />
        <CodeBlock
          title="3. Server-side JavaScript"
          code={javascriptExample}
          onCopy={() => copyText(javascriptExample, "JavaScript example copied.")}
        />

        <div className="mt-4 rounded-xl border border-blue-400/20 bg-blue-400/10 p-4 text-xs leading-5 text-blue-100">
          The API key identifies this school automatically. Do not add a school ID
          to requests. Only approved public content is returned, and the API is
          read-only.
        </div>
      </div>
    </section>
  );
}

function CopyButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
      aria-label={label}
    >
      <FiCopy />
    </button>
  );
}

function InfoBlock({ title, value, onCopy }) {
  return (
    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-400">{title}</p>
          <code className="mt-1 block break-all text-xs text-white">{value}</code>
        </div>
        <CopyButton label={`Copy ${title}`} onClick={onCopy} />
      </div>
    </div>
  );
}

function CodeBlock({ title, code, onCopy }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
      <div className="flex items-center justify-between bg-slate-950/80 px-4 py-2">
        <p className="text-xs font-semibold text-slate-300">{title}</p>
        <CopyButton label={`Copy ${title}`} onClick={onCopy} />
      </div>
      <pre className="overflow-x-auto bg-slate-950/50 p-4 text-xs leading-5 text-slate-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}
