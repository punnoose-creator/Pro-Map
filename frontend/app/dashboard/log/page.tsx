"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import PortalShell from "@/components/PortalShell";
import { API_BASE } from "@/lib/api";

export default function LogVisitPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("User");
  const [isRecording, setIsRecording] = useState(false);
  const [notes, setNotes] = useState("");
  const [interimNote, setInterimNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
    sheet?: string;
    parsed?: Record<string, any>;
  } | null>(null);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Get user from local storage
    const storedUser = localStorage.getItem("promap_user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed?.fullName) setUserName(parsed.fullName.split(' ')[0]);
      } catch(e) {}
    }

    // Initialize Speech Recognition
    if (typeof window !== "undefined" && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      // Optional: Set language from navigator or default to en-US
      recognitionRef.current.lang = window.navigator.language || 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setNotes(prev => (prev + " " + finalTranscript).trim());
        }
        
        setInterimNote(interimTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === 'network') {
          alert('Network Error: Your browser (often Brave or Chromium) is blocking the Google Speech API, or you are offline. Voice typing will not work here.');
        } else if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone permissions in your browser.');
        }
        setIsRecording(false);
        setInterimNote("");
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = async () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      setInterimNote(""); // Clear interim note when stopping
    } else {
      if (recognitionRef.current) {
        try {
          // Request permission explicitly. Web Speech API requires permission, but leaving 
          // this stream open can cause a device lock on Windows, resulting in a 'network' error.
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop the tracks immediately so SpeechRecognition can use the mic.
          stream.getTracks().forEach(track => track.stop());
          
          recognitionRef.current.start();
          setIsRecording(true);
        } catch (err) {
          console.error("Mic permission or start error:", err);
          // If starting fails after stopping the stream, it might be the Web Speech API itself
          if (err instanceof DOMException && err.name === 'NotAllowedError') {
             alert("Please grant microphone permissions to use voice recording.");
          } else {
             // Fallback to start blindly if getUserMedia fails
             try {
                recognitionRef.current.start();
                setIsRecording(true);
             } catch(fallbackErr) {
                alert("Could not start voice recognition. Please ensure you have internet access and a working microphone.");
             }
          }
        }
      } else {
        alert("Speech Recognition is not supported in this browser. Try Chrome or Edge.");
      }
    }
  };

  const getDayStr = () => {
    const d = new Date();
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  };

  const submitLog = async () => {
    const text = notes.trim();
    if (!text) {
      setSubmitResult({ success: false, message: "Please type or speak your field note before submitting." });
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);

    try {
      const token = localStorage.getItem("promap_token");
      const res = await fetch(`${API_BASE}/log-entry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Submission failed");

      setSubmitResult({ success: true, message: data.message, sheet: data.sheet, parsed: data.parsed });
      setNotes("");
    } catch (err: any) {
      setSubmitResult({ success: false, message: err.message || "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalShell>
      {/* Header Section */}
      <section className="form-header log-section" style={{ marginBottom: '24px' }}>
        <h1 className="form-title" style={{ fontSize: 'clamp(24px, 5vw, 30px)' }}>Good morning, {userName}</h1>
        <p className="form-subtitle uppercase" style={{ fontSize: '10px', letterSpacing: '0.15em', fontWeight: 700 }}>
          Field Log Entry • {getDayStr()}
        </p>
      </section>

      {/* Main Interaction Area */}
      <div>
        {/* Voice Input Section */}
        <div className="mic-container" style={{ marginBottom: "24px", padding: '32px 16px' }}>
          <div className={`mic-wrapper ${isRecording ? 'is-recording' : ''}`}>
            <div className="mic-pulse"></div>
            <button className="mic-button" onClick={toggleRecording} style={{ width: 'clamp(100px, 25vw, 128px)', height: 'clamp(100px, 25vw, 128px)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 'clamp(40px, 10vw, 56px)' }}>mic</span>
            </button>
          </div>
          <p className="mic-instruction" style={{ marginTop: '24px', fontSize: 'clamp(16px, 4vw, 18px)' }}>
            {isRecording ? "Listening..." : "Tap to record voice log"}
          </p>
          <p className="mic-subinstruction">Audio will be transcribed automatically</p>
        </div>

        {/* Text Input Area */}
        <div style={{ marginBottom: '24px' }}>
          <label className="field-label">Manual Entry</label>
          <div className="manual-box">
            <textarea 
              value={notes + (interimNote ? " " + interimNote : "")}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Type your field notes here..." 
            ></textarea>
            <div className="manual-box-tools">
              <span className="material-symbols-outlined hover:text-white transition-colors duration-200">attachment</span>
              <span className="material-symbols-outlined hover:text-white transition-colors duration-200">location_on</span>
            </div>
          </div>
        </div>

        {/* Meta Data Bento */}
        <div className="meta-grid">
          <div className="meta-card">
            <div className="meta-icon-box">
              <span className="material-symbols-outlined">schedule</span>
            </div>
            <div className="meta-content">
              <div className="meta-label">Shift</div>
              <div className="meta-value">Morning Field</div>
            </div>
          </div>
          
          <div className="meta-card">
            <div className="meta-icon-box">
              <span className="material-symbols-outlined">map</span>
            </div>
            <div className="meta-content">
              <div className="meta-label">Zone</div>
              <div className="meta-value">North Sector</div>
            </div>
          </div>
        </div>

        {/* Submit Result */}
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
            {submitResult.success && submitResult.parsed && (
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", lineHeight: 1.8 }}>
                <span style={{ opacity: 0.5 }}>Sheet → </span>
                <strong style={{ color: "#fbbf24" }}>{submitResult.sheet}</strong>
                <br />
                {submitResult.parsed.date && <><span style={{ opacity: 0.5 }}>Date → </span>{submitResult.parsed.date}<br /></>}
                {submitResult.parsed.company && <><span style={{ opacity: 0.5 }}>Company → </span>{submitResult.parsed.company}<br /></>}
                {submitResult.parsed.contact_person && <><span style={{ opacity: 0.5 }}>Contact → </span>{submitResult.parsed.contact_person}<br /></>}
                {submitResult.parsed.est_value_aed && <><span style={{ opacity: 0.5 }}>Value → </span>AED {submitResult.parsed.est_value_aed}<br /></>}
                {submitResult.parsed.next_action && <><span style={{ opacity: 0.5 }}>Next Action → </span>{submitResult.parsed.next_action}<br /></>}
                {submitResult.parsed.follow_up_date && <><span style={{ opacity: 0.5 }}>Follow-up → </span>{submitResult.parsed.follow_up_date}<br /></>}
              </div>
            )}
            {submitResult.success && (
              <button
                onClick={() => router.push("/dashboard")}
                style={{ marginTop: "12px", fontSize: "12px", color: "#fbbf24", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
              >
                Back to dashboard →
              </button>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          className="gold-gradient-btn"
          onClick={submitLog}
          disabled={submitting}
          style={{ opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? "Saving to Sheet..." : "Submit Entry"}
          <span className="material-symbols-outlined">
            {submitting ? "hourglass_empty" : "arrow_forward"}
          </span>
        </button>
      </div>
    </PortalShell>
  );
}
