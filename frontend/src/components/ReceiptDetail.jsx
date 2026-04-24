export default function ReceiptDetail({ receipt, onBack, onDelete }) {
  const currency = receipt.currency || '€';
  const fmt = (n) => `${currency}${(n || 0).toFixed(2)}`;

  return (
    <div className="fade-in">
      <button className="back-btn" onClick={onBack}>
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back
      </button>

      <div className="glass" style={{ marginTop: 12 }}>
        {receipt.image && (
          <img
            src={`/api/images/${receipt.image}`}
            alt="Receipt"
            className="receipt-image-preview"
          />
        )}

        <div className="detail-summary">
          <div className="detail-total-label">{receipt.store_name} — {receipt.date || ''}</div>
          <div className="detail-total">{fmt(receipt.total)}</div>
          <div className="detail-badges">
            {receipt.confirmed ? (
              <>
                <span className="status-pill confirmed">Confirmed</span>
                <span className="history-badge shared">Shared {fmt(receipt.shared_total)}</span>
                <span className="history-badge personal">Personal {fmt(receipt.personal_total)}</span>
                <span className="history-badge per-person">{fmt(receipt.per_person)}/person</span>
              </>
            ) : (
              <span className="status-pill pending">Pending review</span>
            )}
          </div>
        </div>

        <div className="items-section">
          <div className="section-title">Items ({receipt.items.length})</div>
          {receipt.items.map((item, idx) => (
            <div key={idx} className="item-row">
              <div className="item-info">
                <div className="item-name">{item.name}</div>
              </div>
              <div className="item-price">{fmt(item.price)}</div>
              <span className={`category-toggle ${item.category}`} style={{ cursor: 'default' }}>
                {item.category === 'shared' ? '🏠 Shared' : '👤 Personal'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 0' }}>
        <button className="btn btn-danger" onClick={() => onDelete(receipt.id)}>
          Delete Receipt
        </button>
      </div>
    </div>
  );
}
