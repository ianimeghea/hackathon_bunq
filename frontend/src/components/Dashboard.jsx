import { useMemo } from 'react';

export default function Dashboard({ receipts }) {
  const stats = useMemo(() => {
    const confirmed = receipts.filter(r => r.confirmed);
    const totalShared = confirmed.reduce((s, r) => s + (r.shared_total || 0), 0);
    const totalPersonal = confirmed.reduce((s, r) => s + (r.personal_total || 0), 0);
    const totalAll = confirmed.reduce((s, r) => s + (r.total || 0), 0);
    const avgPerPerson = confirmed.length > 0
      ? confirmed.reduce((s, r) => s + (r.per_person || 0), 0) / confirmed.length
      : 0;
    return { totalShared, totalPersonal, totalAll, avgPerPerson, count: confirmed.length };
  }, [receipts]);

  const fmt = (n) => `€${n.toFixed(2)}`;

  if (stats.count === 0) {
    return (
      <div className="fade-in">
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <div className="empty-title">No data yet</div>
          <div className="empty-desc">Confirm some receipt splits to see your dashboard</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ padding: '0 4px 12px' }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Dashboard</div>
      </div>

      <div className="stats-grid">
        <div className="glass-sm stat-card">
          <div className="stat-value">{fmt(stats.totalAll)}</div>
          <div className="stat-label">Total Spent</div>
        </div>
        <div className="glass-sm stat-card accent">
          <div className="stat-value">{fmt(stats.avgPerPerson)}</div>
          <div className="stat-label">Avg Per Person</div>
        </div>
        <div className="glass-sm stat-card green">
          <div className="stat-value">{fmt(stats.totalShared)}</div>
          <div className="stat-label">Total Shared</div>
        </div>
        <div className="glass-sm stat-card orange">
          <div className="stat-value">{fmt(stats.totalPersonal)}</div>
          <div className="stat-label">Total Personal</div>
        </div>
      </div>

      <div className="glass-sm stat-card purple" style={{ textAlign: 'center', padding: 20 }}>
        <div className="stat-value">{stats.count}</div>
        <div className="stat-label">Receipts Processed</div>
      </div>
    </div>
  );
}
