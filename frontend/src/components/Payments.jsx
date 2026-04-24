import { useState, useEffect } from 'react';

export default function Payments({ api }) {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getPayments().then(setPayments).catch(() => {});
    api.getPaymentStats().then(setStats).catch(() => {});
  }, [api.getPayments, api.getPaymentStats]);

  const fmt = (n) => `€${(n || 0).toFixed(2)}`;

  return (
    <div className="fade-in">
      <div style={{ padding: '0 4px 16px' }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Payments</div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
          Payment requests sent to flatmates
        </div>
      </div>

      {/* Stats */}
      {stats && stats.total_sent > 0 && (
        <>
          <div className="stats-grid">
            <div className="glass-sm stat-card accent">
              <div className="stat-value">{fmt(stats.total_amount)}</div>
              <div className="stat-label">Total Requested</div>
            </div>
            <div className="glass-sm stat-card green">
              <div className="stat-value">{stats.total_sent}</div>
              <div className="stat-label">Sent</div>
            </div>
          </div>

          {/* Per-person breakdown */}
          {stats.by_person.length > 0 && (
            <div className="glass" style={{ marginBottom: 16 }}>
              <div className="section-title">By Person</div>
              {stats.by_person.map((p) => (
                <div key={p.email} className="item-row">
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'var(--accent-light)', color: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 700, flexShrink: 0,
                  }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="item-info">
                    <div className="item-name">{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {p.count} request{p.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="item-price" style={{ color: 'var(--accent)' }}>{fmt(p.total)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Payment list */}
      {payments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💸</div>
          <div className="empty-title">No payments yet</div>
          <div className="empty-desc">
            Confirm a receipt split and request payments from your flatmates
          </div>
        </div>
      ) : (
        <div className="glass">
          <div className="section-title">Recent Requests ({payments.length})</div>
          {payments.map((p, i) => (
            <div key={i} className="item-row" style={{ animationDelay: `${i * 40}ms` }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: p.status === 'sent' ? 'var(--green-light)' : 'var(--red-light)',
                color: p.status === 'sent' ? 'var(--green)' : 'var(--red)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {p.status === 'sent' ? (
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 18, height: 18 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 18, height: 18 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div className="item-info" style={{ minWidth: 0 }}>
                <div className="item-name">{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.store_name} — {p.created_at?.slice(0, 10)}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="item-price">{fmt(p.amount)}</div>
                <div style={{
                  fontSize: 11, fontWeight: 600, marginTop: 2,
                  color: p.status === 'sent' ? 'var(--green)' : 'var(--red)',
                }}>
                  {p.status === 'sent' ? 'Sent' : 'Failed'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
