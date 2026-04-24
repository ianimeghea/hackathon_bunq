import { useState, useEffect, useCallback, useRef } from 'react';
import { TrendingUp, TrendingDown, Clock, RefreshCw, X, Loader2, AlertTriangle, ArrowUp, ArrowDown, Minus } from 'lucide-react';

const ACTION_META = {
  HOLD:     { icon: Minus,    color: '#ca8a04', bg: 'rgba(202,138,4,.08)',  label: 'Hold' },
  SELL:     { icon: ArrowDown, color: '#dc2626', bg: 'rgba(220,38,38,.08)', label: 'Sell' },
  BUY_MORE: { icon: ArrowUp,  color: '#16a34a', bg: 'rgba(22,163,74,.08)', label: 'Buy More' },
};

const URGENCY_META = {
  low:    { color: '#16a34a', label: 'Low urgency' },
  medium: { color: '#ca8a04', label: 'Act soon' },
  high:   { color: '#dc2626', label: 'Urgent' },
};

function formatAge(seconds) {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ago`;
}

function InvestmentCard({ inv, onGetRec, onClose, loadingRec }) {
  const pnlPositive = inv.pnl_percent >= 0;
  const rec = inv.recommendation;
  const actionMeta = rec ? (ACTION_META[rec.action] || ACTION_META.HOLD) : null;
  const urgencyMeta = rec ? (URGENCY_META[rec.urgency] || URGENCY_META.low) : null;
  const ActionIcon = actionMeta?.icon;

  return (
    <div className={`active-inv-card ${pnlPositive ? 'positive' : 'negative'}`}>
      <div className="active-inv-inner">
        <div className="ai-header">
          <div className="ai-symbol-group">
            <span className="ai-symbol">{inv.symbol}</span>
            <span className="ai-name">{inv.name}</span>
          </div>
          <button className="ai-close-btn" onClick={() => onClose(inv.id)} title="Close position">
            <X size={14} />
          </button>
        </div>

        <div className="ai-price-section">
          <div className="ai-current-price">${inv.current_price?.toLocaleString('en', { minimumFractionDigits: 2 })}</div>
          <div className={`ai-pnl ${pnlPositive ? 'positive' : 'negative'}`}>
            {pnlPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{inv.pnl_percent >= 0 ? '+' : ''}{inv.pnl_percent}%</span>
            <span className="ai-pnl-eur">(&euro;{inv.pnl_eur >= 0 ? '+' : ''}{inv.pnl_eur?.toLocaleString('en', { minimumFractionDigits: 2 })})</span>
          </div>
        </div>

        <div className="ai-stats">
          <div className="ai-stat">
            <span className="ai-stat-label">Entry</span>
            <span className="ai-stat-value">${inv.entry_price?.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="ai-stat">
            <span className="ai-stat-label">Invested</span>
            <span className="ai-stat-value">&euro;{inv.amount_eur?.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="ai-stat">
            <span className="ai-stat-label">Value</span>
            <span className="ai-stat-value">&euro;{inv.current_value_eur?.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="ai-stat">
            <span className="ai-stat-label"><Clock size={10} /> Age</span>
            <span className="ai-stat-value">{formatAge(inv.age_seconds)}</span>
          </div>
        </div>

        {inv.target_price != null && inv.stop_loss != null && (
          <div className="ai-targets">
            <div className="ai-target-bar">
              <span className="ai-target-label ai-stop">${inv.stop_loss?.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
              <div className="ai-target-track">
                {(() => {
                  const range = (inv.target_price || 0) - (inv.stop_loss || 0);
                  const pos = range > 0 ? ((inv.current_price - inv.stop_loss) / range * 100) : 50;
                  const clamped = Math.max(2, Math.min(98, pos));
                  return <div className="ai-target-dot" style={{ left: `${clamped}%`, background: pnlPositive ? '#16a34a' : '#dc2626' }} />;
                })()}
              </div>
              <span className="ai-target-label ai-goal">${inv.target_price?.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        <div className="ai-rec-section">
          {!rec && !loadingRec && (
            <button className="ai-rec-btn" onClick={() => onGetRec(inv.id)}>
              <RefreshCw size={13} /> Get AI Recommendation
            </button>
          )}
          {loadingRec && (
            <div className="ai-rec-loading">
              <Loader2 size={14} className="spin" /> Analyzing position...
            </div>
          )}
          {rec && !loadingRec && (
            <div className="ai-rec-result">
              <div className="ai-rec-header">
                <div className="ai-rec-action" style={{ color: actionMeta?.color, background: actionMeta?.bg }}>
                  {ActionIcon && <ActionIcon size={13} />}
                  <span>{actionMeta?.label}</span>
                </div>
                <span className="ai-rec-urgency" style={{ color: urgencyMeta?.color }}>
                  {urgencyMeta?.label}
                </span>
              </div>
              <p className="ai-rec-text">{rec.summary}</p>
              <button className="ai-rec-refresh" onClick={() => onGetRec(inv.id)}>
                <RefreshCw size={11} /> Refresh
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ActiveInvestments({ api }) {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState({});
  const apiRef = useRef(api);
  apiRef.current = api;

  const fetchInvestments = useCallback(async () => {
    try {
      const data = await apiRef.current.getActiveInvestments();
      setInvestments(data.investments || []);
    } catch (err) {
      console.error('Failed to fetch investments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvestments();
    const interval = setInterval(fetchInvestments, 120000);
    return () => clearInterval(interval);
  }, [fetchInvestments]);

  const handleGetRec = useCallback(async (id) => {
    setLoadingRecs(prev => ({ ...prev, [id]: true }));
    try {
      const data = await apiRef.current.getInvestmentRecommendation(id);
      setInvestments(prev =>
        prev.map(inv => inv.id === id ? { ...inv, recommendation: data.recommendation, ...data.investment } : inv)
      );
    } catch (err) {
      console.error('Failed to get recommendation:', err);
    } finally {
      setLoadingRecs(prev => ({ ...prev, [id]: false }));
    }
  }, []);

  const handleClose = useCallback(async (id) => {
    try {
      await apiRef.current.closeInvestment(id);
      setInvestments(prev => prev.filter(inv => inv.id !== id));
    } catch (err) {
      console.error('Failed to close investment:', err);
    }
  }, []);

  if (loading) {
    return (
      <div className="active-inv-tab">
        <div className="active-inv-loading">
          <Loader2 size={24} className="spin" />
          <span>Loading investments...</span>
        </div>
      </div>
    );
  }

  if (investments.length === 0) {
    return (
      <div className="active-inv-tab">
        <div className="active-inv-empty">
          <AlertTriangle size={40} />
          <h3>No Active Investments</h3>
          <p>Go to the Invest tab, analyze a strategy, and execute one to see it here.</p>
        </div>
      </div>
    );
  }

  const totalInvested = investments.reduce((s, i) => s + (i.amount_eur || 0), 0);
  const totalValue = investments.reduce((s, i) => s + (i.current_value_eur || 0), 0);
  const totalPnl = totalValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested * 100) : 0;

  return (
    <div className="active-inv-tab">
      <div className="active-inv-summary">
        <div className="ais-card">
          <span className="ais-label">Total Invested</span>
          <span className="ais-value">&euro;{totalInvested.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="ais-card">
          <span className="ais-label">Current Value</span>
          <span className="ais-value">&euro;{totalValue.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className={`ais-card ${totalPnl >= 0 ? 'positive' : 'negative'}`}>
          <span className="ais-label">Total P&L</span>
          <span className="ais-value">{totalPnl >= 0 ? '+' : ''}&euro;{totalPnl.toLocaleString('en', { minimumFractionDigits: 2 })} ({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)</span>
        </div>
      </div>

      <div className="active-inv-refresh-bar">
        <span className="air-label">{investments.length} active position{investments.length !== 1 ? 's' : ''}</span>
        <button className="air-btn" onClick={fetchInvestments}>
          <RefreshCw size={12} /> Refresh prices
        </button>
      </div>

      <div className="active-inv-grid">
        {investments.map(inv => (
          <InvestmentCard
            key={inv.id}
            inv={inv}
            onGetRec={handleGetRec}
            onClose={handleClose}
            loadingRec={loadingRecs[inv.id]}
          />
        ))}
      </div>
    </div>
  );
}
