import { useState, useEffect } from 'react';

export default function Preferences({ api }) {
  const [prefs, setPrefs] = useState(null);

  useEffect(() => {
    api.getPreferences().then(setPrefs).catch(() => {});
  }, [api]);

  const rules = prefs?.item_rules || {};
  const entries = Object.entries(rules);

  return (
    <div className="fade-in">
      <div style={{ padding: '0 4px 12px' }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Learned Preferences</div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
          These rules were learned from your corrections
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧠</div>
          <div className="empty-title">No preferences yet</div>
          <div className="empty-desc">
            When you change an item's category during review, the AI will remember your preference for next time
          </div>
        </div>
      ) : (
        <div className="glass">
          <div className="pref-list">
            {entries.map(([name, category]) => (
              <div key={name} className="pref-item">
                <span className="pref-name">{name}</span>
                <span className={`pref-category ${category}`}>{category}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
