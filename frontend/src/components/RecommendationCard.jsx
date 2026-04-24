import { TrendingUp, Shield, Target, Zap, Clock, AlertTriangle } from 'lucide-react';

const RISK_COLORS = {
  low: { bg: '#0a2e1a', border: '#22c55e', accent: '#4ade80', label: 'Low Risk', icon: Shield },
  medium: { bg: '#1a2400', border: '#eab308', accent: '#facc15', label: 'Medium Risk', icon: Target },
  high: { bg: '#2e0a0a', border: '#ef4444', accent: '#f87171', label: 'High Risk', icon: Zap },
};

function RiskDots({ score }) {
  return (
    <div className="risk-dots">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className={`risk-dot ${i < score ? 'filled' : ''}`} />
      ))}
    </div>
  );
}

function StrategyCard({ strategy }) {
  const risk = RISK_COLORS[strategy.risk_level] || RISK_COLORS.medium;
  const Icon = risk.icon;

  return (
    <div className="strategy-card" style={{ '--card-bg': risk.bg, '--card-border': risk.border, '--card-accent': risk.accent }}>
      <div className="strategy-header">
        <div className="strategy-title">
          <Icon size={18} style={{ color: risk.accent }} />
          <div>
            <span className="strategy-name">{strategy.name}</span>
            <span className="risk-badge" style={{ background: risk.border }}>{risk.label}</span>
          </div>
        </div>
        <div className="strategy-amount">
          &euro;{strategy.amount_eur?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
      </div>

      <div className="strategy-details">
        <div className="rec-row">
          <span>Symbol</span>
          <span className="symbol-tag">{strategy.symbol}</span>
        </div>
        <div className="rec-row">
          <span>Asset Type</span>
          <span>{strategy.asset_type}</span>
        </div>
        <div className="rec-row">
          <span>Current Price</span>
          <span>${strategy.current_price?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        {strategy.target_price && (
          <div className="rec-row">
            <span>Target Price</span>
            <span className="target">${strategy.target_price?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {strategy.stop_loss && (
          <div className="rec-row">
            <span>Stop Loss</span>
            <span className="stop-loss">${strategy.stop_loss?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        <div className="rec-row">
          <span>Confidence</span>
          <span>{(strategy.confidence * 100)?.toFixed(0)}%</span>
        </div>
        <div className="rec-row">
          <Clock size={14} />
          <span>{strategy.time_horizon}</span>
        </div>
        <div className="rec-row">
          <span>Risk</span>
          <RiskDots score={strategy.risk_score} />
        </div>
      </div>

      <div className="strategy-reasoning">{strategy.reasoning}</div>
    </div>
  );
}

export default function StrategiesPanel({ result }) {
  if (!result || !result.strategies?.length) return null;

  return (
    <div className="strategies-panel">
      <div className="strategies-header">
        <TrendingUp size={22} />
        <div>
          <h2>Investment Strategies</h2>
          <span className="strategies-total">
            Total: &euro;{result.total_suggested_investment?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {result.summary && <p className="strategies-summary">{result.summary}</p>}

      <div className="strategies-grid">
        {result.strategies.map((s, i) => (
          <StrategyCard key={i} strategy={s} />
        ))}
      </div>

      {result.warnings?.length > 0 && (
        <div className="warnings">
          <AlertTriangle size={16} />
          <div>
            {result.warnings.map((w, i) => <p key={i}>{w}</p>)}
          </div>
        </div>
      )}
    </div>
  );
}
