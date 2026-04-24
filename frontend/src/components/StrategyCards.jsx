import { Shield, Target, Zap, Clock, Check, Loader2 } from 'lucide-react';

const RISK_META = {
  low:    { icon: Shield, color: '#16a34a', bg: 'rgba(22,163,74,.05)',  border: 'rgba(22,163,74,.18)',  label: 'Low Risk' },
  medium: { icon: Target, color: '#ca8a04', bg: 'rgba(202,138,4,.05)', border: 'rgba(202,138,4,.18)', label: 'Medium' },
  high:   { icon: Zap,    color: '#dc2626', bg: 'rgba(220,38,38,.05)', border: 'rgba(220,38,38,.18)', label: 'High Risk' },
};

function SkeletonCard({ index }) {
  return (
    <div className="glass-card skeleton" style={{ animationDelay: `${index * 0.1}s` }}>
      <div className="glass-card-inner">
        <div className="skel-row">
          <div className="skel-circle" />
          <div className="skel-block" style={{ width: '55%' }} />
        </div>
        <div className="skel-block" style={{ width: '70%', height: 18 }} />
        <div className="skel-block" style={{ width: '35%', height: 24 }} />
        <div className="skel-divider" />
        <div className="skel-block" style={{ width: '80%' }} />
        <div className="skel-block" style={{ width: '60%' }} />
        <div className="skel-block" style={{ width: '45%' }} />
      </div>
    </div>
  );
}

function FilledCard({ strategy, index, selected, onSelect, executed, executing }) {
  const risk = RISK_META[strategy.risk_level] || RISK_META.medium;
  const Icon = risk.icon;

  return (
    <div
      className={`glass-card filled ${selected ? 'selected' : ''} ${executed ? 'executed' : ''} ${executing ? 'executing' : ''}`}
      style={{
        '--glass-accent': risk.color,
        '--glass-bg': `rgba(255,255,255,.72)`,
        '--glass-border': selected ? risk.color : risk.border,
        animationDelay: `${index * 0.08}s`,
        cursor: executed || executing ? 'default' : 'pointer',
      }}
      onClick={() => !executed && !executing && onSelect?.()}
    >
      <div className="glass-card-inner">
        {selected && !executed && !executing && (
          <div className="gc-selected-badge">
            <Check size={12} /> Selected
          </div>
        )}
        {executing && (
          <div className="gc-executing-badge">
            <Loader2 size={12} className="spin" /> Executing...
          </div>
        )}
        {executed && (
          <div className="gc-executed-badge">
            <Check size={12} /> Active
          </div>
        )}

        <div className="gc-top">
          <div className="gc-badge" style={{ color: risk.color, background: risk.bg, border: `1px solid ${risk.border}` }}>
            <Icon size={12} />
            <span>{risk.label}</span>
          </div>
          <span className="gc-symbol">{strategy.symbol}</span>
        </div>

        <div className="gc-name">{strategy.name}</div>

        <div className="gc-price-row">
          <div className="gc-amount">&euro;{strategy.amount_eur?.toLocaleString('en', { minimumFractionDigits: 2 })}</div>
          <div className="gc-action" data-action={strategy.action?.toLowerCase()}>{strategy.action}</div>
        </div>

        <div className="gc-divider" />

        <div className="gc-details">
          <div className="gc-detail">
            <span className="gc-label">Price</span>
            <span className="gc-value">${strategy.current_price?.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
          </div>
          {strategy.target_price != null && (
            <div className="gc-detail">
              <span className="gc-label">Target</span>
              <span className="gc-value gc-green">${strategy.target_price?.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {strategy.stop_loss != null && (
            <div className="gc-detail">
              <span className="gc-label">Stop Loss</span>
              <span className="gc-value gc-red">${strategy.stop_loss?.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="gc-detail">
            <span className="gc-label"><Clock size={10} /> Horizon</span>
            <span className="gc-value">{strategy.time_horizon}</span>
          </div>
        </div>

        <div className="gc-confidence">
          <div className="gc-conf-bar">
            <div className="gc-conf-fill" style={{ width: `${(strategy.confidence || 0) * 100}%`, background: risk.color }} />
          </div>
          <span className="gc-conf-label">{((strategy.confidence || 0) * 100).toFixed(0)}%</span>
        </div>

        <div className="gc-reasoning">{strategy.reasoning}</div>
      </div>
    </div>
  );
}

export default function StrategyCards({ strategies, isLoading, selectedIndex, onSelect, executedIndex, executingIndex }) {
  return (
    <div className="strategy-cards-grid">
      {strategies.map((s, i) =>
        s ? (
          <FilledCard
            key={i}
            strategy={s}
            index={i}
            selected={selectedIndex === i}
            onSelect={() => onSelect?.(i)}
            executed={executedIndex === i}
            executing={executingIndex === i}
          />
        ) : (
          <SkeletonCard key={i} index={i} />
        )
      )}
    </div>
  );
}
