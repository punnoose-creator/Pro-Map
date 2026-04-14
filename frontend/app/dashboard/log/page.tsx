"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import PortalShell from "@/components/PortalShell";

export default function LogVisitPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("User");
  const [isRecording, setIsRecording] = useState(false);
  const [notes, setNotes] = useState("");
  const [interimNote, setInterimNote] = useState("");
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Get user from local storage
    const storedUser = localStorage.getItem("fieldiq_user");
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

  const submitLog = () => {
    // Basic mock submission
    alert("Log submitted successfully!");
    router.push("/dashboard");
  };

  return (
    <PortalShell>
      {/* Header Section */}
      <section className="form-header log-section">
        <h1 className="form-title">Good morning, {userName}</h1>
        <p className="form-subtitle uppercase" style={{ fontSize: '10px', letterSpacing: '0.15em', fontWeight: 700 }}>
          Field Log Entry • {getDayStr()}
        </p>
      </section>

      {/* Main Interaction Area */}
      <div>
        {/* Voice Input Section */}
        <div className="mic-container" style={{ marginBottom: "24px" }}>
          <div className={`mic-wrapper ${isRecording ? 'is-recording' : ''}`}>
            <div className="mic-pulse"></div>
            <button className="mic-button" onClick={toggleRecording}>
              <span className="material-symbols-outlined">mic</span>
            </button>
          </div>
          <p className="mic-instruction">
            {isRecording ? "Listening..." : "Tap to record voice log"}
          </p>
          <p className="mic-subinstruction">Audio will be transcribed automatically</p>
        </div>

        {/* Text Input Area */}
        <div style={{ marginBottom: '24px' }}>
          <label className="field-label">Manual Entry</label>
          <div className="manual-box">
            <textarea 
              value={(notes + (interimNote ? " " + interimNote : "")).trim()}
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

        {/* Submit Button */}
        <button className="gold-gradient-btn" onClick={submitLog}>
          Submit Entry
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </PortalShell>
  );
}
