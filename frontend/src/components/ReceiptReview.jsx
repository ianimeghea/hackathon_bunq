import { useState, useMemo, useCallback } from 'react';
import VoiceBar from './VoiceBar';

export default function ReceiptReview({ receipt, onConfirm, onCancel, loading, onVoiceCommand }) {
  const [items, setItems] = useState(() => receipt.items.map((i, idx) => ({ ...i, _id: idx })));
  const [members, setMembers] = useState(receipt.household_members || 2);
  const [voiceProcessing, setVoiceProcessing] = useState(false);

  const toggleCategory = (idx) => {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, category: item.category === 'shared' ? 'personal' : 'shared' } : item
    ));
  };

  const { sharedTotal, personalTotal, perPerson } = useMemo(() => {
    const shared = items.filter(i => i.category === 'shared').reduce((s, i) => s + i.price, 0);
    const personal = items.filter(i => i.category === 'personal').reduce((s, i) => s + i.price, 0);
    return {
      sharedTotal: shared,
      personalTotal: personal,
      perPerson: members > 0 ? shared / members : 0,
    };
  }, [items, members]);

  const handleVoice = useCallback(async (transcript) => {
    if (!onVoiceCommand) return;
    setVoiceProcessing(true);
    try {
      const plain = items.map(({ _id, ...rest }) => rest);
      const result = await onVoiceCommand(transcript, plain);
      if (result.understood && result.items) {
        setItems(result.items.map((it, idx) => ({ ...it, _id: idx })));
      }
      if (window._voiceBarFeedback) {
        window._voiceBarFeedback(result.summary);
      }
    } catch {
      if (window._voiceBarFeedback) {
        window._voiceBarFeedback('Something went wrong. Try again.');
      }
    }
    setVoiceProcessing(false);
  }, [items, onVoiceCommand]);

  const currency = receipt.currency || '€';

  const fmt = (n) => `${currency}${n.toFixed(2)}`;

  return (
    <div className="glass slide-up">
      {receipt.image && (
        <img
          src={`/api/images/${receipt.image}`}
          alt="Receipt"
          className="receipt-image-preview"
        />
      )}

      <div className="receipt-header">
        <div>
          <div className="store-name">{receipt.store_name}</div>
          {receipt.date && <div className="receipt-date">{receipt.date}</div>}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(receipt.total)}
        </div>
      </div>

      <div className="items-section">
        <div className="section-title">Items ({items.length})</div>
        {items.map((item, idx) => (
          <div key={item._id} className="item-row fade-in" style={{ animationDelay: `${idx * 30}ms` }}>
            <div
              className={`confidence-dot ${item.confidence >= 0.85 ? 'high' : item.confidence >= 0.6 ? 'medium' : 'low'}`}
              title={`Confidence: ${Math.round((item.confidence || 0) * 100)}%`}
            />
            <div className="item-info">
              <div className="item-name">{item.name}</div>
            </div>
            <div className="item-price">{fmt(item.price)}</div>
            <button
              className={`category-toggle ${item.category}`}
              onClick={() => toggleCategory(idx)}
            >
              {item.category === 'shared' ? '🏠 Shared' : '👤 Personal'}
            </button>
          </div>
        ))}
      </div>

      <div className="people-control">
        <div className="people-label">Split between</div>
        <div className="stepper">
          <button
            className="stepper-btn"
            disabled={members <= 1}
            onClick={() => setMembers(m => m - 1)}
          >−</button>
          <span className="stepper-value">{members}</span>
          <button
            className="stepper-btn"
            onClick={() => setMembers(m => m + 1)}
          >+</button>
        </div>
      </div>

      <div className="summary-bar">
        <div className="summary-row">
          <span className="summary-label">Shared items</span>
          <span className="summary-value green">{fmt(sharedTotal)}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Personal items</span>
          <span className="summary-value orange">{fmt(personalTotal)}</span>
        </div>
        <div className="summary-divider" />
        <div className="per-person">
          <span className="per-person-label">Per person (shared)</span>
          <span className="per-person-value">{fmt(perPerson)}</span>
        </div>
      </div>

      <VoiceBar onCommand={handleVoice} processing={voiceProcessing} />

      <div className="action-bar">
        <button className="btn btn-secondary" onClick={onCancel} style={{ flex: '0 0 auto', width: 'auto', padding: '14px 20px' }}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={() => onConfirm(items.map(({ _id, ...rest }) => rest), members)}
          disabled={loading}
          style={{ flex: 1 }}
        >
          {loading ? 'Saving...' : 'Confirm Split'}
        </button>
      </div>
    </div>
  );
}
