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
  lastLogin?: string;
};

type Ping = {
  latitude: number;
  longitude: number;
  createdAt: string;
};

type Activity = {
  tab: string;
  date: string;
  createdAt: string;
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
  const [summaries, setSummaries] = useState<{daily: string, weekly: string, monthly: string} | null>(null);
  const [workTime, setWorkTime] = useState<string>("0h 0m");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [focusedLocation, setFocusedLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSummaries, setLoadingSummaries] = useState(true);

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
          if (pingData.workTime) setWorkTime(pingData.workTime);

          // 3. Get Sheet Activity
          const actRes = await fetch(`${API_BASE}/admin/activity/${encodeURIComponent(found.fullName)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const actData = await actRes.json();
          setActivity(actData.activity || []);

          // 4. Get Summaries
          setLoadingSummaries(true);
          const sumRes = await fetch(`${API_BASE}/admin/summaries/${id}?date=${date}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const sumData = await sumRes.json();
          if (sumData.success) setSummaries(sumData.summaries);
          setLoadingSummaries(false);
        }
      } catch (e) {
        console.error("Tracking fetch error", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, date]);

  const handleLogClick = (logTime: string) => {
    if (pings.length === 0) return;
    
    const logDate = new Date(logTime).getTime();
    
    // Find ping closest to the log time
    let closest = pings[0];
    let minDiff = Math.abs(new Date(pings[0].createdAt).getTime() - logDate);
    
    for (const ping of pings) {
      const diff = Math.abs(new Date(ping.createdAt).getTime() - logDate);
      if (diff < minDiff) {
        minDiff = diff;
        closest = ping;
      }
    }
    
    setFocusedLocation([closest.latitude, closest.longitude]);
  };

  const downloadReport = (format: 'excel' | 'word') => {
    if (!summaries || !employee) return;

    const fileName = `${employee.fullName}_Report_${date}`;
    
    if (format === 'word') {
      const content = `
        <html>
          <head><meta charset="utf-8"></head>
          <body>
            <h1>Field Visit Report: ${employee.fullName}</h1>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Department:</strong> ${employee.department}</p>
            <hr/>
            <h2>Daily Summary</h2>
            <p>${summaries.daily}</p>
            <h2>Weekly Summary</h2>
            <p>${summaries.weekly}</p>
            <h2>Monthly Summary</h2>
            <p>${summaries.monthly}</p>
            <hr/>
            <h2>Activity Logs</h2>
            <table border="1">
              <tr>
                <th>Time</th>
                <th>Category</th>
                <th>Company</th>
                <th>Purpose</th>
                <th>Next Action</th>
              </tr>
              ${activity.map(act => `
                <tr>
                  <td>${new Date(act.createdAt).toLocaleTimeString()}</td>
                  <td>${act.tab}</td>
                  <td>${act.company}</td>
                  <td>${act.purpose}</td>
                  <td>${act.nextAction}</td>
                </tr>
              `).join('')}
            </table>
          </body>
        </html>
      `;
      const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.doc`;
      link.click();
    } else {
      // Excel (CSV)
      const rows = [
        ['Field Visit Report', employee.fullName],
        ['Date', date],
        [],
        ['PERIOD', 'SUMMARY'],
        ['Daily', summaries.daily],
        ['Weekly', summaries.weekly],
        ['Monthly', summaries.monthly],
        [],
        ['ACTIVITY LOGS'],
        ['Time', 'Category', 'Company', 'Purpose', 'Next Action']
      ];
      
      activity.forEach(act => {
        rows.push([
          new Date(act.createdAt).toLocaleTimeString(),
          act.tab,
          act.company,
          act.purpose,
          act.nextAction
        ]);
      });

      const csvContent = rows.map(r => r.map(c => `"${c?.toString().replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(['\ufeff', csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.csv`;
      link.click();
    }
  };

  if (loading) return <div className="tracking-loading">Loading Tracking Data...</div>;

  return (
    <div className="tracking-view">
      <div className="tracking-header">
        <div className="emp-info">
          <h1>{employee?.fullName}</h1>
          <div className="emp-meta-row">
            <span className="badge-sector">{employee?.department} Sector</span>
            <span className="login-time">
              <span className="material-symbols-outlined">login</span>
              Last Login: {employee?.lastLogin ? new Date(employee.lastLogin).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never'}
            </span>
            <span className="work-time-badge">
              <span className="material-symbols-outlined">timer</span>
              Work Time: {workTime}
            </span>
          </div>
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
          <AdminMap pings={pings} focusedLocation={focusedLocation} />
        </div>

        <div className="activity-column">
          <div className="card-header">
            <span className="material-symbols-outlined">description</span>
            Field Activity Logs
          </div>
          <div className="activity-list">
            {activity.length === 0 ? (
              <div className="no-activity">No logs found in the database for this employee.</div>
            ) : (
              activity.map((act, idx) => (
                <div 
                  key={idx} 
                  className={`activity-item clickable`} 
                  onClick={() => handleLogClick(act.createdAt)}
                  title="Click to view location on map"
                >
                  <div className="act-header">
                    <div className="act-type-badge">{act.tab}</div>
                    <div className="act-time">
                      <span className="material-symbols-outlined">schedule</span>
                      {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
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

      <div className="summaries-section">
        <div className="section-header">
          <div className="header-left">
            <span className="material-symbols-outlined">auto_awesome</span>
            AI Period Summaries
          </div>
          <div className="header-actions">
            <button className="download-btn excel" onClick={() => downloadReport('excel')}>
              <span className="material-symbols-outlined">table_chart</span>
              Excel
            </button>
            <button className="download-btn word" onClick={() => downloadReport('word')}>
              <span className="material-symbols-outlined">description</span>
              Word
            </button>
          </div>
        </div>

        {loadingSummaries ? (
          <div className="summaries-loading">
            <div className="spinner-small"></div>
            Analyzing activity data for daily, weekly, and monthly summaries...
          </div>
        ) : (
          <div className="summaries-grid">
            <div className="summary-card daily">
              <h3>Daily Insights</h3>
              <p>{summaries?.daily}</p>
            </div>
            <div className="summary-card weekly">
              <h3>Weekly Progress</h3>
              <p>{summaries?.weekly}</p>
            </div>
            <div className="summary-card monthly">
              <h3>Monthly Performance</h3>
              <p>{summaries?.monthly}</p>
            </div>
          </div>
        )}
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

        .emp-meta-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 4px;
        }

        .badge-sector {
          color: #99907c;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          background: rgba(153, 144, 124, 0.1);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .login-time {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #ffc0a8;
          opacity: 0.8;
        }

        .login-time .material-symbols-outlined {
          font-size: 16px;
        }

        .work-time-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #4ade80;
          background: rgba(74, 222, 128, 0.1);
          padding: 2px 10px;
          border-radius: 6px;
        }

        .work-time-badge .material-symbols-outlined {
          font-size: 16px;
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
          transition: all 0.2s ease;
        }

        .activity-item.clickable {
          cursor: pointer;
        }

        .activity-item.clickable:hover {
          background: #252424;
          transform: translateX(4px);
          border-left-width: 6px;
        }

        .act-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .act-time {
          font-size: 11px;
          color: #99907c;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .act-time .material-symbols-outlined {
          font-size: 14px;
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

        .summaries-section {
          margin-top: 32px;
          background: #131313;
          border: 1px solid rgba(255, 192, 168, 0.05);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 40px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 14px;
          color: #ffc0a8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .download-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid rgba(255, 192, 168, 0.2);
          background: transparent;
          color: #ffc0a8;
        }

        .download-btn:hover {
          background: rgba(255, 192, 168, 0.1);
          transform: translateY(-1px);
        }

        .download-btn.excel:hover { border-color: #4ade80; color: #4ade80; }
        .download-btn.word:hover { border-color: #60a5fa; color: #60a5fa; }

        .summaries-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        @media (max-width: 900px) {
          .summaries-grid { grid-template-columns: 1fr; }
        }

        .summary-card {
          background: #1c1b1b;
          padding: 20px;
          border-radius: 12px;
          border-top: 2px solid #ffc0a8;
        }

        .summary-card.weekly { border-top-color: #fbbf24; }
        .summary-card.monthly { border-top-color: #c084fc; }

        <h3> {
          font-size: 13px;
          color: #99907c;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 12px;
        }

        .summary-card p {
          font-size: 14px;
          line-height: 1.6;
          color: #e5e2e1;
        }

        .summaries-loading {
          padding: 40px;
          text-align: center;
          color: #99907c;
          font-style: italic;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .spinner-small {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(255, 192, 168, 0.1);
          border-top-color: #ffc0a8;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
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
