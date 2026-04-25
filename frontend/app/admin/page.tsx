"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import Link from "next/link";

type Employee = {
  _id: string;
  fullName: string;
  employeeId: string;
  email: string;
  role: string;
  department: string;
};

type Stats = {
  activeInField: number;
  totalPings: number;
};

export default function AdminDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("promap_token");
      try {
        const [empRes, statRes] = await Promise.all([
          fetch(`${API_BASE}/admin/employees`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/admin/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const empData = await empRes.json();
        const statData = await statRes.json();

        if (empData.success) setEmployees(empData.employees);
        if (statData.success) setStats(statData.stats);
      } catch (e) {
        console.error("Failed to fetch admin data", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return (
    <div className="admin-loading">
      <div className="spinner"></div>
      <p>Loading Dashboard...</p>
    </div>
  );

  return (
    <div className="admin-overview">
      <div className="admin-stats-grid">
        <div className="stat-card">
          <div className="stat-icon-box">
            <span className="material-symbols-outlined">radar</span>
          </div>
          <div className="stat-info">
            <div className="stat-label">Active in Field</div>
            <div className="stat-value">{stats?.activeInField || 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-box">
            <span className="material-symbols-outlined">analytics</span>
          </div>
          <div className="stat-info">
            <div className="stat-label">GPS Pings (Today)</div>
            <div className="stat-value">{stats?.totalPings || 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-box">
            <span className="material-symbols-outlined">group</span>
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Staff</div>
            <div className="stat-value">{employees.length}</div>
          </div>
        </div>
      </div>

      <div className="employee-section">
        <h2 className="section-title">Field Workforce</h2>
        <div className="employee-table-container">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>ID</th>
                <th>Department</th>
                <th>Role</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp._id}>
                  <td>
                    <div className="emp-name-cell">
                      <div className="emp-avatar">{emp.fullName.charAt(0)}</div>
                      <div>
                        <div className="emp-name">{emp.fullName}</div>
                        <div className="emp-email">{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{emp.employeeId}</td>
                  <td><span className="badge-outline">{emp.department}</span></td>
                  <td>{emp.role}</td>
                  <td>
                    <Link href={`/admin/track/${emp._id}`} className="track-btn">
                      Track Path
                      <span className="material-symbols-outlined">trending_up</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .admin-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: #1c1b1b;
          border: 1px solid rgba(255, 192, 168, 0.05);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          transition: transform 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255, 192, 168, 0.2);
        }

        .stat-icon-box {
          width: 56px;
          height: 56px;
          background: rgba(255, 192, 168, 0.1);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffc0a8;
        }

        .stat-icon-box .material-symbols-outlined {
          font-size: 28px;
        }

        .stat-label {
          font-size: 11px;
          font-weight: 700;
          color: #99907c;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 4px;
        }

        .stat-value {
          font-family: var(--font-headline);
          font-size: 32px;
          font-weight: 800;
          color: #e5e2e1;
        }

        .section-title {
          font-family: var(--font-headline);
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 20px;
          color: #e5e2e1;
        }

        .employee-table-container {
          background: #131313;
          border: 1px solid rgba(255, 192, 168, 0.05);
          border-radius: 16px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        @media (max-width: 600px) {
          .employee-table th, .employee-table td {
            padding: 12px 16px;
          }
          .track-btn {
            padding: 6px 12px;
            font-size: 11px;
          }
        }

        .employee-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .employee-table th {
          padding: 16px 24px;
          background: #1c1b1b;
          font-size: 11px;
          font-weight: 700;
          color: #99907c;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .employee-table td {
          padding: 16px 24px;
          border-bottom: 1px solid rgba(255, 192, 168, 0.03);
          font-size: 14px;
        }

        .emp-name-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .emp-avatar {
          width: 36px;
          height: 36px;
          background: #2a2a2a;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: #ffc0a8;
        }

        .emp-name {
          font-weight: 600;
          color: #e5e2e1;
        }

        .emp-email {
          font-size: 12px;
          color: #99907c;
        }

        .badge-outline {
          padding: 4px 10px;
          border: 1px solid rgba(255, 192, 168, 0.2);
          border-radius: 4px;
          font-size: 11px;
          color: #ffc0a8;
        }

        .track-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #ffc0a8;
          color: #5a1c00;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s;
        }

        .track-btn:hover {
          background: #ffb599;
          transform: translateY(-1px);
        }

        .track-btn .material-symbols-outlined {
          font-size: 16px;
        }

        .admin-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: #99907c;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255, 192, 168, 0.1);
          border-top-color: #ffc0a8;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
