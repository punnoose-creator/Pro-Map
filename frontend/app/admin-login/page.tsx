"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";
import Link from "next/link";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const loginEmail = email === "admin" ? "admin@promap.ae" : email;
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Login failed");

      if (data.employee.role !== "admin" && data.employee.role !== "manager") {
        throw new Error("Unauthorized. This portal is strictly for Management.");
      }

      localStorage.setItem("promap_token", data.token);
      localStorage.setItem("promap_user", JSON.stringify(data.employee));
      router.push("/admin");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-container">
      <div className="admin-login-box">
        <div className="logo-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
            <img src="/logo.png" alt="ProMap Logo" className="brand-logo" style={{ height: '48px', width: 'auto', borderRadius: '15%', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', background: 'white' }} />
            <h1>PRO<span>MAP</span></h1>
          </div>
          <p className="subtitle">Secure Management Portal</p>
        </div>

        {error && <div className="error-alert">
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Admin Email</label>
            <input 
              type="text" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin"
            />
          </div>
          <div className="form-group">
            <label>Master Key</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading} className="login-btn">
            {loading ? "Authenticating..." : "Enter Admin Portal"}
          </button>
        </form>

        <div className="back-link-container">
          <Link href="/" className="back-link">
            <span className="material-symbols-outlined">arrow_back</span>
            Return to Employee Portal
          </Link>
        </div>
      </div>

      <style jsx>{`
        .admin-login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a0a;
          background-image: radial-gradient(circle at center, #1c1b1b 0%, #0a0a0a 100%);
          padding: 24px;
        }
        .admin-login-box {
          background: #131313;
          padding: 48px;
          border-radius: 16px;
          border: 1px solid rgba(255, 192, 168, 0.1);
          width: 100%;
          max-width: 440px;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
        }
        .logo-container {
          text-align: center;
          margin-bottom: 32px;
        }
        h1 {
          font-family: var(--font-headline);
          font-weight: 900;
          font-size: 32px;
          color: #e5e2e1;
          letter-spacing: -0.02em;
        }
        h1 span {
          color: #e9c349;
        }
        .subtitle {
          color: #99907c;
          font-size: 13px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-weight: 700;
        }
        .error-alert {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
        }
        .error-alert .material-symbols-outlined {
          font-size: 18px;
        }
        .form-group {
          margin-bottom: 24px;
        }
        label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          color: #99907c;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          margin-bottom: 8px;
        }
        input {
          width: 100%;
          background: #1c1b1b;
          border: 1px solid rgba(255, 192, 168, 0.1);
          color: #e5e2e1;
          padding: 16px;
          border-radius: 8px;
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s;
        }
        input:focus {
          border-color: #fbc900;
        }
        .login-btn {
          width: 100%;
          background: linear-gradient(135deg, #ffc0a8 0%, #ff986e 100%);
          color: #5a1c00;
          border: none;
          padding: 16px;
          border-radius: 8px;
          font-family: var(--font-headline);
          font-weight: 800;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          cursor: pointer;
          margin-top: 8px;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(255, 152, 110, 0.3);
        }
        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        .back-link-container {
          margin-top: 32px;
          text-align: center;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #99907c;
          font-size: 12px;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s;
        }
        .back-link:hover {
          color: #ffc0a8;
        }
        .back-link .material-symbols-outlined {
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}
