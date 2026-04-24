export default function ReceiptHistory({ receipts, onSelect }) {
  if (!receipts.length) {
    return (
      <div className="empty-state fade-in">
        <div className="empty-icon">📋</div>
        <div className="empty-title">No receipts yet</div>
        <div className="empty-desc">Upload your first receipt to start splitting expenses</div>
      </div>
    );
  }

  return (
    <div className="history-section fade-in">
      <div className="history-title">Recent</div>
      {receipts.map((r, idx) => {
        const currency = r.currency || '€';
        const fmt = (n) => `${currency}${(n || 0).toFixed(2)}`;
        return (
          <div
            key={r.id}
            className="glass-sm history-card slide-up"
            style={{ animationDelay: `${idx * 60}ms` }}
            onClick={() => onSelect(r)}
          >
            <div className="history-top">
              <div className="history-store">{r.store_name}</div>
              <div className="history-total">{fmt(r.total)}</div>
            </div>
            <div className="history-bottom">
              <div className="history-date">
                {r.date || r.created_at?.slice(0, 10) || ''}
              </div>
              <div className="history-split">
                {r.confirmed ? (
                  <>
                    <span className="history-badge shared">{fmt(r.shared_total)}</span>
                    <span className="history-badge personal">{fmt(r.personal_total)}</span>
                    <span className="history-badge per-person">{fmt(r.per_person)}/pp</span>
                  </>
                ) : (
                  <span className="status-pill pending">Pending</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
