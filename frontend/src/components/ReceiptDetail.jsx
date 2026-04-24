export default function ReceiptDetail({ receipt, onBack, onDelete, onRequestPayment }) {
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

      {receipt.confirmed && (
        <div style={{ display: 'flex', gap: 10, padding: '16px 0' }}>
          <button className="btn btn-primary" onClick={onRequestPayment} style={{ flex: 1 }}>
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: 18, height: 18 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
            Request Payment
          </button>
        </div>
      )}

      <div style={{ padding: receipt.confirmed ? '0 0 16px' : '16px 0' }}>
        <button className="btn btn-danger" onClick={() => onDelete(receipt.id)}>
          Delete Receipt
        </button>
      </div>
    </div>
  );
}
