"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PortalShell from "@/components/PortalShell";
import { API_BASE } from "@/lib/api";

export default function DailySummaryPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("User");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    // Get user from local storage
    const storedUser = localStorage.getItem("promap_user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed?.fullName) setUserName(parsed.fullName.split(' ')[0]);
      } catch(e) {}
    }

    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem("promap_token");
        const res = await fetch(`${API_BASE}/summary/generate`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
          setSummary(data.summary);
        } else {
          setSubmitResult({ success: false, message: data.message || "Failed to generate summary." });
        }
      } catch (err: any) {
        setSubmitResult({ success: false, message: "Error connecting to server to generate summary." });
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const submitSummary = async () => {
    if (!summary.trim()) {
      setSubmitResult({ success: false, message: "Summary cannot be empty." });
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);

    try {
      const token = localStorage.getItem("promap_token");
      const res = await fetch(`${API_BASE}/summary/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ summary: summary.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Submission failed");

      setSubmitResult({ success: true, message: data.message });
    } catch (err: any) {
      setSubmitResult({ success: false, message: err.message || "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const getDayStr = () => {
    const d = new Date();
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  };

  return (
    <PortalShell>
      <section className="form-header log-section">
        <h1 className="form-title">{userName}'s Daily Summary</h1>
        <p className="form-subtitle uppercase" style={{ fontSize: '10px', letterSpacing: '0.15em', fontWeight: 700 }}>
          End of Day Report • {getDayStr()}
        </p>
      </section>

      <div>
        <div style={{ marginBottom: '24px' }}>
          <label className="field-label">Review & Edit Summary</label>
          <div className="manual-box" style={{ minHeight: '200px' }}>
            {loading ? (
              <div style={{ padding: '20px', color: '#99907c', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>autorenew</span>
                Generating summary from today's logs...
              </div>
            ) : (
              <textarea 
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Your daily summary will appear here..."
                style={{ height: '200px', resize: 'vertical' }}
              ></textarea>
            )}
            <div className="manual-box-tools">
              <span className="material-symbols-outlined hover:text-white transition-colors duration-200">edit_document</span>
            </div>
          </div>
          <p style={{ fontSize: '11px', color: '#99907c', marginTop: '8px', lineHeight: 1.4 }}>
            This summary was generated automatically by AI based on your field logs for today. 
            You can edit the text before submitting it to the final Google Sheet.
          </p>
        </div>

        {submitResult && (
          <div
            style={{
              marginBottom: "20px",
              padding: "16px",
              borderRadius: "12px",
              background: submitResult.success
                ? "rgba(34,197,94,0.12)"
                : "rgba(239,68,68,0.12)",
              border: `1px solid ${submitResult.success ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`,
            }}
          >
            <p style={{ fontWeight: 700, marginBottom: "8px", color: submitResult.success ? "#4ade80" : "#f87171" }}>
              {submitResult.success ? "✅ " : "❌ "}{submitResult.message}
            </p>
            {submitResult.success && (
              <button
                onClick={() => router.push("/dashboard/log")}
                style={{ marginTop: "12px", fontSize: "12px", color: "#fbbf24", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
              >
                ← Back to Logging
              </button>
            )}
          </div>
        )}

        <button
          className="gold-gradient-btn"
          onClick={submitSummary}
          disabled={submitting || loading}
          style={{ opacity: (submitting || loading) ? 0.7 : 1 }}
        >
          {submitting ? "Saving Report..." : "Submit End of Day Report"}
          <span className="material-symbols-outlined">
            {submitting ? "hourglass_empty" : "publish"}
          </span>
        </button>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </PortalShell>
  );
}
