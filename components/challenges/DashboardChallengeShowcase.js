"use client";

import { useEffect, useState } from "react";
import DashboardChallengeShowcaseClient from "@/components/challenges/DashboardChallengeShowcaseClient";

export default function DashboardChallengeShowcase() {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadShowcase = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/challenges/showcase", {
          cache: "no-store",
        });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(payload.message || "Failed to load showcase");
        }

        if (active) {
          setResponses(Array.isArray(payload.responses) ? payload.responses : []);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Failed to load showcase");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadShowcase();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 text-slate-400">
        Loading challenge showcase...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
        {error}
      </div>
    );
  }

  return <DashboardChallengeShowcaseClient responses={responses} />;
}
