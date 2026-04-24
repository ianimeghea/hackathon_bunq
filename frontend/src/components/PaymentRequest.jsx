import { useState, useEffect } from 'react';

export default function PaymentRequest({ receipt, api }) {
  const [flatmates, setFlatmates] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    api.getFlatmates().then(data => {
      setFlatmates(data);
      setSelected(new Set(data.map(f => f.email)));
    }).catch(() => {});
  }, [api.getFlatmates]);

  const toggle = (email) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const handleSend = async () => {
    if (selected.size === 0) return;
    setSending(true);
    try {
      const res = await api.requestPayments(receipt.id, [...selected]);
      setResults(res);
    } catch {}
    setSending(false);
  };

  const currency = receipt.currency || '€';
  const perPerson = receipt.per_person || 0;

  if (results) {
    return (
      <div className="glass fade-in" style={{ padding: 20 }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>Payment Requests Sent</div>
        {results.results.map((r, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0', borderBottom: i < results.results.length - 1 ? '1px solid var(--divider)' : 'none',
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{r.name || r.email}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{r.email}</div>
            </div>
            {r.error ? (
              <span style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>Failed</span>
            ) : (
              <span className="status-pill confirmed">Sent {currency}{r.amount}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="glass fade-in" style={{ padding: 20 }}>
      <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Request Payments</div>
      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>
        Send {currency}{perPerson.toFixed(2)} per person via bunq
      </div>

      {flatmates.length === 0 ? (
        <div style={{ fontSize: 14, color: 'var(--text-tertiary)', padding: '12px 0' }}>
          Add flatmates in the People tab first
        </div>
      ) : (
        <>
          {flatmates.map(fm => (
            <label key={fm.email} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0', borderBottom: '1px solid var(--divider)',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={selected.has(fm.email)}
                onChange={() => toggle(fm.email)}
                style={{ width: 20, height: 20, accentColor: 'var(--accent)' }}
              />
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--accent-light)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, flexShrink: 0,
              }}>
                {fm.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{fm.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{fm.email}</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent)' }}>
                {currency}{perPerson.toFixed(2)}
              </div>
            </label>
          ))}

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={sending || selected.size === 0}
              style={{ flex: 1 }}
            >
              {sending ? 'Sending...' : `Request from ${selected.size} flatmate${selected.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
