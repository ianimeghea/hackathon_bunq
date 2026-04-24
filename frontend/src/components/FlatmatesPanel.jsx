import { useState, useEffect } from 'react';

export default function FlatmatesPanel({ api }) {
  const [flatmates, setFlatmates] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bunqStatus, setBunqStatus] = useState(null);

  const load = async () => {
    try {
      const data = await api.getFlatmates();
      setFlatmates(data);
    } catch {}
  };

  const initBunq = async () => {
    try {
      const res = await api.initBunq();
      setBunqStatus(res);
    } catch {}
  };

  useEffect(() => { load(); initBunq(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    try {
      await api.addFlatmate(name.trim(), email.trim());
      setName('');
      setEmail('');
      await load();
    } catch {}
  };

  const handleRemove = async (em) => {
    try {
      await api.removeFlatmate(em);
      await load();
    } catch {}
  };

  return (
    <div className="fade-in">
      <div style={{ padding: '0 4px 16px' }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Flatmates & bunq</div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
          Manage your household and send payment requests
        </div>
      </div>

      {/* bunq connection */}
      <div className="glass-sm" style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>bunq Account</div>
            {bunqStatus?.account ? (
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>
                Balance: {bunqStatus.account.currency} {bunqStatus.account.balance}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>
                {bunqStatus ? 'Connected' : 'Connecting...'}
              </div>
            )}
          </div>
          <span className={`status-pill ${bunqStatus ? 'confirmed' : 'pending'}`}>
            {bunqStatus ? 'Connected' : 'Pending'}
          </span>
        </div>
      </div>

      {/* Flatmate list */}
      <div className="glass" style={{ marginBottom: 12 }}>
        <div className="section-title">Household ({flatmates.length})</div>
        {flatmates.length === 0 ? (
          <div style={{ padding: '16px 20px', fontSize: 14, color: 'var(--text-tertiary)' }}>
            Add your flatmates to request payments
          </div>
        ) : (
          flatmates.map((fm) => (
            <div key={fm.email} className="item-row">
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--accent-light)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 700, flexShrink: 0,
              }}>
                {fm.name.charAt(0).toUpperCase()}
              </div>
              <div className="item-info">
                <div className="item-name">{fm.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{fm.email}</div>
              </div>
              <button
                onClick={() => handleRemove(fm.email)}
                style={{
                  background: 'none', border: 'none', color: 'var(--red)',
                  cursor: 'pointer', fontSize: 18, padding: '4px 8px',
                }}
              >×</button>
            </div>
          ))
        )}

        {/* Add form */}
        <form onSubmit={handleAdd} style={{
          padding: '12px 20px', borderTop: '1px solid var(--divider)',
          display: 'flex', gap: 8, alignItems: 'center',
          minWidth: 0,
        }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Name"
            style={{
              flex: 1, minWidth: 0, padding: '8px 12px', borderRadius: 10,
              border: '1px solid var(--divider)', fontSize: 14,
              fontFamily: 'var(--font)', background: 'rgba(0,0,0,0.02)',
              outline: 'none',
            }}
          />
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            style={{
              flex: 1, minWidth: 0, padding: '8px 12px', borderRadius: 10,
              border: '1px solid var(--divider)', fontSize: 14,
              fontFamily: 'var(--font)', background: 'rgba(0,0,0,0.02)',
              outline: 'none',
            }}
          />
          <button type="submit" style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--accent)', color: '#fff', border: 'none',
            fontSize: 20, cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>+</button>
        </form>
      </div>
    </div>
  );
}
