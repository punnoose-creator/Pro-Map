"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";
import PortalShell from "@/components/PortalShell";

type Tab = "login" | "register";

type AlertState = { type: "error" | "success"; message: string } | null;

function getPasswordStrength(value: string) {
  const bars: [string, string, string] = ["pwd-bar", "pwd-bar", "pwd-bar"];
  if (!value) {
    return { bars, hint: "Enter a password to check strength" as const };
  }
  let score = 0;
  if (value.length >= 6) score++;
  if (value.length >= 10) score++;
  if (/[A-Z]/.test(value) && /[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score = Math.min(score + 1, 3);

  const levels = [
    { cls: "weak" as const, text: "Weak — add more characters" },
    { cls: "medium" as const, text: "Fair — try mixing letters & numbers" },
    { cls: "strong" as const, text: "Strong — great credential key!" },
  ];
  const levelIdx = Math.max(0, Math.min(score - 1, 2));
  const cls = levels[levelIdx].cls;
  for (let i = 0; i <= levelIdx; i++) {
    bars[i] = `pwd-bar ${cls}`;
  }
  return { bars, hint: levels[levelIdx].text };
}

export default function EmployeePortal() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");

  const [loginAlert, setLoginAlert] = useState<AlertState>(null);
  const [regAlert, setRegAlert] = useState<AlertState>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginPwdVisible, setLoginPwdVisible] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmpId, setRegEmpId] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regDept, setRegDept] = useState("Sales");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regTerms, setRegTerms] = useState(false);
  const [regPwdVisible, setRegPwdVisible] = useState(false);
  const [regConfirmVisible, setRegConfirmVisible] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  const pwdStrength = getPasswordStrength(regPassword);

  const clearAlerts = useCallback(() => {
    setLoginAlert(null);
    setRegAlert(null);
  }, []);

  const switchTab = (next: Tab) => {
    clearAlerts();
    setTab(next);
  };

  useEffect(() => {
    const token = localStorage.getItem("fieldiq_token");
    if (!token) return;
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) router.replace("/dashboard");
      })
      .catch(() => localStorage.removeItem("fieldiq_token"));
  }, [router]);

  const showForgotFlow = (e: React.MouseEvent) => {
    e.preventDefault();
    setLoginAlert({
      type: "success",
      message:
        "Password reset — contact your department manager or IT admin.",
    });
  };

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    clearAlerts();
    const email = loginEmail.trim();
    const password = loginPassword;
    if (!email || !password) {
      setLoginAlert({
        type: "error",
        message: "Please enter your email and password.",
      });
      return;
    }
    setLoginLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      localStorage.setItem("fieldiq_token", data.token);
      localStorage.setItem("fieldiq_user", JSON.stringify(data.employee));
      setLoginAlert({
        type: "success",
        message: `Welcome back, ${data.employee.fullName}! Redirecting to dashboard...`,
      });
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err) {
      setLoginAlert({
        type: "error",
        message: err instanceof Error ? err.message : "Login failed",
      });
      setLoginLoading(false);
    }
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    clearAlerts();
    const fullName = regName.trim();
    const employeeId = regEmpId.trim();
    const email = regEmail.trim();
    const phone = regPhone.trim();
    const password = regPassword;
    const confirmPassword = regConfirm;

    if (
      !fullName ||
      !employeeId ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      setRegAlert({
        type: "error",
        message: "Please fill in all required fields.",
      });
      return;
    }
    if (password.length < 6) {
      setRegAlert({
        type: "error",
        message: "Password must be at least 6 characters.",
      });
      return;
    }
    if (password !== confirmPassword) {
      setRegAlert({
        type: "error",
        message: "Passwords do not match.",
      });
      return;
    }
    if (!regTerms) {
      setRegAlert({
        type: "error",
        message: "Please accept the terms and conditions.",
      });
      return;
    }

    setRegLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          employeeId,
          email,
          phone,
          department: regDept,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
      localStorage.setItem("fieldiq_token", data.token);
      localStorage.setItem("fieldiq_user", JSON.stringify(data.employee));
      setRegAlert({
        type: "success",
        message: `Account created! Welcome, ${data.employee.fullName}. Redirecting...`,
      });
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err) {
      setRegAlert({
        type: "error",
        message: err instanceof Error ? err.message : "Registration failed",
      });
      setRegLoading(false);
    }
  }

  return (
    <PortalShell>
      <div className="mobile-brand">
              <div className="mobile-brand-text">
                FIELD<span>IQ</span>
              </div>
            </div>

            <div className="tab-switcher" role="tablist">
              <button
                type="button"
                className={`tab-btn${tab === "login" ? " active" : ""}`}
                role="tab"
                aria-selected={tab === "login"}
                onClick={() => switchTab("login")}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`tab-btn${tab === "register" ? " active" : ""}`}
                role="tab"
                aria-selected={tab === "register"}
                onClick={() => switchTab("register")}
              >
                Register
              </button>
            </div>

            <div
              className={`form-view${tab !== "login" ? " hidden" : ""}`}
              id="view-login"
            >
              <div className="form-header">
                <h2 className="form-title">Employee Login</h2>
                <p className="form-subtitle">
                  Secure authorization required for field access.
                </p>
              </div>

              <div
                className={`alert${loginAlert?.type === "error" ? " alert-error" : ""}${loginAlert?.type === "success" ? " alert-success" : ""}${loginAlert ? " show" : ""}`}
                role="alert"
              >
                {loginAlert ? (
                  <>
                    <span className="material-symbols-outlined">
                      {loginAlert.type === "error" ? "error" : "check_circle"}
                    </span>
                    <span className="alert-text">{loginAlert.message}</span>
                  </>
                ) : null}
              </div>

              <form id="form-login" noValidate onSubmit={onLogin}>
                <div className="form-group">
                  <label className="field-label" htmlFor="login-email">
                    Corporate Email
                  </label>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined input-icon">
                      mail
                    </span>
                    <input
                      className="field-input"
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="employee@fieldiq.ae"
                      required
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="label-row">
                    <label className="field-label" htmlFor="login-password">
                      Credential Key
                    </label>
                    <button
                      type="button"
                      className="field-link"
                      onClick={showForgotFlow}
                    >
                      Reset Key
                    </button>
                  </div>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined input-icon">
                      lock
                    </span>
                    <input
                      className="field-input"
                      id="login-password"
                      name="password"
                      type={loginPwdVisible ? "text" : "password"}
                      placeholder="••••••••••••"
                      required
                      autoComplete="current-password"
                      style={{ paddingRight: 36 }}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="pwd-toggle"
                      aria-label="Toggle password visibility"
                      onClick={() => setLoginPwdVisible((v) => !v)}
                    >
                      <span className="material-symbols-outlined">
                        {loginPwdVisible ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  className={`btn-primary${loginLoading ? " loading" : ""}`}
                  type="submit"
                  disabled={loginLoading}
                >
                  <span className="btn-label">
                    {loginLoading ? "Verifying..." : "Sign In"}
                  </span>
                  {loginLoading ? (
                    <span className="spinner" aria-hidden />
                  ) : (
                    <span className="material-symbols-outlined btn-arrow">
                      arrow_forward
                    </span>
                  )}
                </button>
              </form>

              <div className="divider">
                <div className="divider-line" />
                <span className="divider-text">Or access via</span>
                <div className="divider-line" />
              </div>

              <div className="quick-access">
                <div className="quick-card" role="button" tabIndex={0}>
                  <span className="material-symbols-outlined">fingerprint</span>
                  <span className="quick-card-name">Biometric</span>
                  <span className="quick-card-desc">Mobile Only</span>
                </div>
                <div className="quick-card" role="button" tabIndex={0}>
                  <span className="material-symbols-outlined">
                    key_visualizer
                  </span>
                  <span className="quick-card-name">SSO Login</span>
                  <span className="quick-card-desc">External Vault</span>
                </div>
              </div>
            </div>

            <div
              className={`form-view${tab !== "register" ? " hidden" : ""}`}
              id="view-register"
            >
              <div className="form-header">
                <h2 className="form-title">Create Account</h2>
                <p className="form-subtitle">
                  Register your field personnel profile.
                </p>
              </div>

              <div
                className={`alert${regAlert?.type === "error" ? " alert-error" : ""}${regAlert?.type === "success" ? " alert-success" : ""}${regAlert ? " show" : ""}`}
                role="alert"
              >
                {regAlert ? (
                  <>
                    <span className="material-symbols-outlined">
                      {regAlert.type === "error" ? "error" : "check_circle"}
                    </span>
                    <span className="alert-text">{regAlert.message}</span>
                  </>
                ) : null}
              </div>

              <form id="form-register" noValidate onSubmit={onRegister}>
                <div className="field-row">
                  <div className="form-group">
                    <label className="field-label" htmlFor="reg-name">
                      Full Name
                    </label>
                    <div className="input-wrapper">
                      <span className="material-symbols-outlined input-icon">
                        person
                      </span>
                      <input
                        className="field-input"
                        id="reg-name"
                        name="fullName"
                        type="text"
                        placeholder="Ahmed Al-Rashid"
                        required
                        autoComplete="name"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="field-label" htmlFor="reg-empid">
                      Employee ID
                    </label>
                    <div className="input-wrapper">
                      <span className="material-symbols-outlined input-icon">
                        badge
                      </span>
                      <input
                        className="field-input"
                        id="reg-empid"
                        name="employeeId"
                        type="text"
                        placeholder="ELV-0042"
                        required
                        value={regEmpId}
                        onChange={(e) => setRegEmpId(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="field-label" htmlFor="reg-email">
                    Corporate Email
                  </label>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined input-icon">
                      mail
                    </span>
                    <input
                      className="field-input"
                      id="reg-email"
                      name="email"
                      type="email"
                      placeholder="employee@company.ae"
                      required
                      autoComplete="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field-row">
                  <div className="form-group">
                    <label className="field-label" htmlFor="reg-phone">
                      Phone (Optional)
                    </label>
                    <div className="input-wrapper">
                      <span className="material-symbols-outlined input-icon">
                        phone
                      </span>
                      <input
                        className="field-input"
                        id="reg-phone"
                        name="phone"
                        type="tel"
                        placeholder="+971 50 000 0000"
                        autoComplete="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="field-label" htmlFor="reg-dept">
                      Department
                    </label>
                    <div className="input-wrapper">
                      <span className="material-symbols-outlined input-icon">
                        corporate_fare
                      </span>
                      <select
                        className="field-select"
                        id="reg-dept"
                        name="department"
                        value={regDept}
                        onChange={(e) => setRegDept(e.target.value)}
                      >
                        <option value="Sales">Sales</option>
                        <option value="Project Engineering">
                          Project Engineering
                        </option>
                        <option value="Pre-Sales">Pre-Sales</option>
                        <option value="Accounts">Accounts</option>
                        <option value="Other">Other</option>
                      </select>
                      <span className="material-symbols-outlined dept-hint">
                        expand_more
                      </span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="field-label" htmlFor="reg-password">
                    Credential Key
                  </label>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined input-icon">
                      lock
                    </span>
                    <input
                      className="field-input"
                      id="reg-password"
                      name="password"
                      type={regPwdVisible ? "text" : "password"}
                      placeholder="Min. 6 characters"
                      required
                      autoComplete="new-password"
                      style={{ paddingRight: 36 }}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="pwd-toggle"
                      aria-label="Toggle password visibility"
                      onClick={() => setRegPwdVisible((v) => !v)}
                    >
                      <span className="material-symbols-outlined">
                        {regPwdVisible ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                  <div className="pwd-strength">
                    <div className={pwdStrength.bars[0]} />
                    <div className={pwdStrength.bars[1]} />
                    <div className={pwdStrength.bars[2]} />
                  </div>
                  <span className="pwd-hint">{pwdStrength.hint}</span>
                </div>

                <div className="form-group">
                  <label className="field-label" htmlFor="reg-confirm">
                    Confirm Key
                  </label>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined input-icon">
                      lock_reset
                    </span>
                    <input
                      className="field-input"
                      id="reg-confirm"
                      name="confirmPassword"
                      type={regConfirmVisible ? "text" : "password"}
                      placeholder="Re-enter your password"
                      required
                      autoComplete="new-password"
                      style={{ paddingRight: 36 }}
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                    />
                    <button
                      type="button"
                      className="pwd-toggle"
                      aria-label="Toggle password visibility"
                      onClick={() => setRegConfirmVisible((v) => !v)}
                    >
                      <span className="material-symbols-outlined">
                        {regConfirmVisible ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <div className="checkbox-group">
                    <input
                      type="checkbox"
                      id="reg-terms"
                      name="terms"
                      required
                      checked={regTerms}
                      onChange={(e) => setRegTerms(e.target.checked)}
                    />
                    <label className="checkbox-label" htmlFor="reg-terms">
                      I confirm that I am an authorized employee and agree to
                      the <a href="#">Terms of Use</a> and{" "}
                      <a href="#">Privacy Policy</a>.
                    </label>
                  </div>
                </div>

                <button
                  className={`btn-primary${regLoading ? " loading" : ""}`}
                  type="submit"
                  disabled={regLoading}
                >
                  <span className="btn-label">
                    {regLoading ? "Creating account..." : "Create Account"}
                  </span>
                  {regLoading ? (
                    <span className="spinner" aria-hidden />
                  ) : (
                    <span className="material-symbols-outlined btn-arrow">
                      arrow_forward
                    </span>
                  )}
                </button>
              </form>
            </div>

      <footer className="form-footer">
        <span className="footer-copyright">© 2026 FieldIQ</span>
        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Legal</a>
        </div>
      </footer>
    </PortalShell>
  );
}
