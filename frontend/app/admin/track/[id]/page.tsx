"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { API_BASE } from "@/lib/api";

// Import Map dynamically to avoid SSR issues with Leaflet
const AdminMap = dynamic(() => import("@/components/AdminMap"), { 
  ssr: false,
  loading: () => <div className="map-placeholder">Initializing Map...</div>
});

type Employee = {
  _id: string;
  fullName: string;
  department: string;
};

type Ping = {
  latitude: number;
  longitude: number;
  createdAt: string;
};

type Activity = {
  tab: string;
  date: string;
  company: string;
  purpose: string;
  outcome: string;
  nextAction: string;
};

export default function TrackingPage() {
  const { id } = useParams();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [pings, setPings] = useState<Ping[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("promap_token");
      try {
        // 1. Get Employee Info
        const empRes = await fetch(`${API_BASE}/admin/employees`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const empData = await empRes.json();
        const found = empData.employees.find((e: any) => e._id === id);
        setEmployee(found);

        if (found) {
          // 2. Get Pings
          const pingRes = await fetch(`${API_BASE}/admin/locations/${id}?date=${date}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const pingData = await pingRes.json();
          setPings(pingData.pings || []);

          // 3. Get Sheet Activity
          const actRes = await fetch(`${API_BASE}/admin/activity/${encodeURIComponent(found.fullName)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const actData = await actRes.json();
          setActivity(actData.activity || []);
        }
      } catch (e) {
        console.error("Tracking fetch error", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, date]);

  if (loading) return <div className="tracking-loading">Loading Tracking Data...</div>;

  return (
    <div className="tracking-view">
      <div className="tracking-header">
        <div className="emp-info">
          <h1>{employee?.fullName}</h1>
          <p>{employee?.department} Sector</p>
        </div>
        <div className="date-picker">
          <label>View Date</label>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="tracking-grid">
        <div className="map-column">
          <div className="card-header">
            <span className="material-symbols-outlined">route</span>
            Travel Path
          </div>
          <AdminMap pings={pings} />
        </div>

        <div className="activity-column">
          <div className="card-header">
            <span className="material-symbols-outlined">description</span>
            Google Sheets Activity
          </div>
          <div className="activity-list">
            {activity.length === 0 ? (
              <div className="no-activity">No logs found in Google Sheets for this employee.</div>
            ) : (
              activity.map((act, idx) => (
                <div key={idx} className="activity-item">
                  <div className="act-type-badge">{act.tab}</div>
                  <div className="act-company">{act.company}</div>
                  <div className="act-purpose">{act.purpose}</div>
                  <div className="act-footer">
                    <span>Next: {act.nextAction}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .tracking-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .emp-info h1 {
          font-family: var(--font-headline);
          font-size: 28px;
          margin-bottom: 4px;
        }

        .emp-info p {
          color: #99907c;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .date-picker {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .date-picker label {
          font-size: 10px;
          font-weight: 700;
          color: #ffc0a8;
          text-transform: uppercase;
        }

        .date-picker input {
          background: #1c1b1b;
          border: 1px solid rgba(255, 192, 168, 0.2);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          outline: none;
        }

        .tracking-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }

        @media (max-width: 1100px) {
          .tracking-grid { grid-template-columns: 1fr; }
        }

        .map-column, .activity-column {
          background: #131313;
          border: 1px solid rgba(255, 192, 168, 0.05);
          border-radius: 16px;
          padding: 24px;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 14px;
          color: #ffc0a8;
          margin-bottom: 20px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .map-placeholder {
          height: 500px;
          background: #1c1b1b;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #99907c;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 500px;
          overflow-y: auto;
          padding-right: 8px;
        }

        .activity-item {
          background: #1c1b1b;
          padding: 16px;
          border-radius: 12px;
          border-left: 3px solid #ffc0a8;
        }

        .act-type-badge {
          font-size: 9px;
          font-weight: 800;
          color: #ffc0a8;
          background: rgba(255, 192, 168, 0.1);
          padding: 2px 8px;
          border-radius: 4px;
          width: fit-content;
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .act-company {
          font-weight: 700;
          margin-bottom: 4px;
        }

        .act-purpose {
          font-size: 13px;
          color: #99907c;
          line-height: 1.4;
          margin-bottom: 12px;
        }

        .act-footer {
          font-size: 11px;
          color: #ffc0a8;
          opacity: 0.8;
        }

        .no-activity {
          text-align: center;
          padding: 40px 0;
          color: #99907c;
          font-style: italic;
          font-size: 14px;
        }

        .tracking-loading {
          padding: 100px;
          text-align: center;
          color: #99907c;
        }
      `}</style>
    </div>
  );
}
