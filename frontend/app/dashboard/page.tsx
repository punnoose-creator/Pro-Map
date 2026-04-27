"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";
import PortalShell from "@/components/PortalShell";

const PING_INTERVAL_MS = 5 * 60 * 1000;

type Employee = {
  id: string;
  fullName: string;
  email?: string;
  employeeId?: string;
  department?: string;
  role?: string;
};

type AlertState = { type: "error" | "success"; message: string } | null;

function formatClock(d: Date) {
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function geolocationErrorMessage(code: number) {
  switch (code) {
    case 1:
      return "Location permission denied. Allow location in your browser to start work.";
    case 2:
      return "Position unavailable. Try again outdoors or check device GPS.";
    case 3:
      return "Location request timed out. Try again.";
    default:
      return "Could not read your location.";
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [user, setUser] = useState<Employee | null>(null);
  const [bootError, setBootError] = useState(false);
  const [alert, setAlert] = useState<AlertState>(null);
  const [tracking, setTracking] = useState(false);
  const [starting, setStarting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const clearIntervalSafe = useCallback(() => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const sendLocationPing = useCallback(
    async (opts?: { silentSuccess?: boolean }): Promise<boolean> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setAlert({
        type: "error",
        message: "This browser does not support location services.",
      });
      return false;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const token = localStorage.getItem("promap_token");
          if (!token) {
            setAlert({ type: "error", message: "Session expired. Please sign in again." });
            resolve(false);
            return;
          }

          const body = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude ?? undefined,
            altitudeAccuracy: pos.coords.altitudeAccuracy ?? undefined,
            heading: pos.coords.heading ?? undefined,
            speed: pos.coords.speed ?? undefined,
            clientRecordedAt: new Date(pos.timestamp).toISOString(),
          };

          try {
            const res = await fetch(`${API_BASE}/locations/ping`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              throw new Error(
                typeof data.message === "string" ? data.message : "Could not save location"
              );
            }
            setLastSavedAt(new Date());
            if (opts?.silentSuccess) {
              setAlert((prev) => (prev?.type === "error" ? null : prev));
            } else {
              setAlert({
                type: "success",
                message: `Location saved (±${Math.round(pos.coords.accuracy)} m).`,
              });
            }
            resolve(true);
          } catch (e) {
            setAlert({
              type: "error",
              message: e instanceof Error ? e.message : "Could not save location",
            });
            resolve(false);
          }
        },
        (err) => {
          setAlert({
            type: "error",
            message: geolocationErrorMessage(err.code),
          });
          resolve(false);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 45000 }
      );
    });
  },
  []
);

  useEffect(() => {
    const token = localStorage.getItem("promap_token");
    if (!token) {
      router.replace("/");
      return;
    }
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) throw new Error("unauthorized");
        setUser(data.employee);
      })
      .catch(() => {
        localStorage.removeItem("promap_token");
        localStorage.removeItem("promap_user");
        setBootError(true);
        router.replace("/");
      });
  }, [router]);

  useEffect(() => {
    return () => clearIntervalSafe();
  }, [clearIntervalSafe]);

  async function startWork() {
    setStarting(true);
    setAlert(null);
    const ok = await sendLocationPing();
    if (!ok) {
      setStarting(false);
      return;
    }

    // Notify backend about shift start
    try {
      const token = localStorage.getItem("promap_token");
      await fetch(`${API_BASE}/shifts/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error("Shift start error", e);
    }

    setStarting(false);
    setTracking(true);
    intervalRef.current = setInterval(() => {
      void sendLocationPing({ silentSuccess: true });
    }, PING_INTERVAL_MS);
  }

  async function stopWork() {
    clearIntervalSafe();
    setTracking(false);

    // Notify backend about shift stop
    try {
      const token = localStorage.getItem("promap_token");
      await fetch(`${API_BASE}/shifts/stop`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error("Shift stop error", e);
    }

    setAlert({
      type: "success",
      message: "Shift paused. Location updates stopped.",
    });
  }

  function signOut() {
    clearIntervalSafe();
    setTracking(false);
    localStorage.removeItem("promap_token");
    localStorage.removeItem("promap_user");
    router.push("/");
  }

  if (bootError || !user) {
    return (
      <PortalShell>
        <div className="mobile-brand">
          <div className="mobile-brand-text">
            PRO<span>MAP</span>
          </div>
        </div>
        <div className="form-header">
          <h2 className="form-title">Loading</h2>
          <p className="form-subtitle">Verifying your session…</p>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell>
      <div className="mobile-brand">
        <div className="mobile-brand-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="ProMap Logo" className="brand-logo" style={{ height: '32px' }} />
            <div>PRO<span>MAP</span></div>
          </div>
        </div>
      </div>

      <div className="form-header" style={{ marginBottom: '24px' }}>
        <h2 className="form-title" style={{ fontSize: 'clamp(24px, 5vw, 30px)' }}>Hello, {user.fullName}</h2>
        <p className="form-subtitle">
          You&apos;re signed in. Start your shift to share an accurate GPS checkpoint
          every five minutes, or sign out when you&apos;re done.
        </p>
      </div>

      <div
        className={`alert${alert?.type === "error" ? " alert-error" : ""}${alert?.type === "success" ? " alert-success" : ""}${alert ? " show" : ""}`}
        role="alert"
      >
        {alert ? (
          <>
            <span className="material-symbols-outlined">
              {alert.type === "error" ? "error" : "check_circle"}
            </span>
            <span className="alert-text">{alert.message}</span>
          </>
        ) : null}
      </div>

      {tracking ? (
        <div className="tracking-panel">
          <span className="material-symbols-outlined tracking-panel-icon">
            radar
          </span>
          <div>
            <p className="tracking-panel-title">Shift active</p>
            <p className="tracking-panel-meta">
              High-accuracy GPS samples post every{" "}
              <strong>{PING_INTERVAL_MS / 60000} minutes</strong>
              {lastSavedAt ? (
                <>
                  . Last saved at <strong>{formatClock(lastSavedAt)}</strong>.
                </>
              ) : null}
            </p>
          </div>
        </div>
      ) : null}

      <div className="dashboard-actions">
        {tracking ? (
          <button
            type="button"
            className="btn-primary"
            onClick={stopWork}
          >
            <span className="btn-label">Stop work</span>
            <span className="material-symbols-outlined btn-arrow">stop_circle</span>
          </button>
        ) : (
          <button
            type="button"
            className={`btn-primary${starting ? " loading" : ""}`}
            onClick={() => void startWork()}
            disabled={starting}
          >
            <span className="btn-label">
              {starting ? "Getting location..." : "Start work"}
            </span>
            {starting ? (
              <span className="spinner" aria-hidden />
            ) : (
              <span className="material-symbols-outlined btn-arrow">
                play_arrow
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.push("/dashboard/log")}
          style={{ width: '100%', marginBottom: '12px' }}
        >
          <span className="material-symbols-outlined btn-secondary-icon">
            mic
          </span>
          <span className="btn-label">Speak / Log Visit</span>
        </button>

      </div>

      <footer className="form-footer">
        <span className="footer-copyright">© 2026 ProMap</span>
        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Legal</a>
        </div>
      </footer>
    </PortalShell>
  );
}
