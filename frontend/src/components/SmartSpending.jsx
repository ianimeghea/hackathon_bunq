import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, TrendingUp, Scissors, PiggyBank, AlertCircle, RefreshCw, ChevronRight, Sparkles } from 'lucide-react';

const DIFFICULTY_META = {
  easy:   { color: '#16a34a', label: 'Easy' },
  medium: { color: '#ca8a04', label: 'Medium' },
  hard:   { color: '#dc2626', label: 'Hard' },
};

const CATEGORY_ICONS = {
  food_delivery:  '🍕',
  subscriptions:  '📱',
  entertainment:  '🎬',
  shopping:       '🛍️',
  transport:      '🚗',
  groceries:      '🛒',
  dining:         '🍽️',
  utilities:      '⚡',
  other:          '📦',
};

function formatEur(n) {
  return `€${Number(n || 0).toLocaleString('en', { minimumFractionDigits: 2 })}`;
}

function CategoryBar({ name, data, maxAmount }) {
  const icon = CATEGORY_ICONS[name] || CATEGORY_ICONS.other;
  const pct = maxAmount > 0 ? (data.amount / maxAmount * 100) : 0;
  const label = name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="ss-cat-row">
      <span className="ss-cat-icon">{icon}</span>
      <div className="ss-cat-info">
        <div className="ss-cat-header">
          <span className="ss-cat-name">{label}</span>
          <span className="ss-cat-amount">{formatEur(data.amount)}</span>
        </div>
        <div className="ss-cat-bar-track">
          <div className="ss-cat-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="ss-cat-meta">{data.count} transactions · avg {formatEur(data.avg_per_transaction)}</span>
      </div>
    </div>
  );
}

function SavingsCard({ opp }) {
  const diff = DIFFICULTY_META[opp.difficulty] || DIFFICULTY_META.medium;
  const impactWidth = Math.min(100, (opp.impact_score || 0) * 10);

  return (
    <div className="ss-savings-card">
      <div className="ss-sav-header">
        <div className="ss-sav-category">
          <span>{CATEGORY_ICONS[opp.category] || '📦'}</span>
          <span className="ss-sav-cat-name">{(opp.category || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
        </div>
        <span className="ss-sav-difficulty" style={{ color: diff.color, background: `${diff.color}12`, border: `1px solid ${diff.color}30` }}>
          {diff.label}
        </span>
      </div>

      <div className="ss-sav-amounts">
        <div className="ss-sav-from">
          <span className="ss-sav-label">Current</span>
          <span className="ss-sav-val">{formatEur(opp.current_monthly)}/mo</span>
        </div>
        <ChevronRight size={14} className="ss-sav-arrow" />
        <div className="ss-sav-to">
          <span className="ss-sav-label">Target</span>
          <span className="ss-sav-val">{formatEur(opp.recommended_monthly)}/mo</span>
        </div>
        <div className="ss-sav-save">
          <span className="ss-sav-label">You save</span>
          <span className="ss-sav-val ss-green">+{formatEur(opp.monthly_savings)}/mo</span>
        </div>
      </div>

      <p className="ss-sav-suggestion">{opp.suggestion}</p>

      <div className="ss-sav-impact">
        <span className="ss-sav-impact-label">Impact</span>
        <div className="ss-sav-impact-track">
          <div className="ss-sav-impact-fill" style={{ width: `${impactWidth}%` }} />
        </div>
        <span className="ss-sav-impact-val">{(opp.impact_score || 0).toFixed(1)}</span>
      </div>

      <div className="ss-sav-annual">
        Annual savings: <strong>{formatEur(opp.annual_savings)}</strong>
      </div>
    </div>
  );
}

function InvestmentProjection({ proj }) {
  return (
    <div className="ss-proj-card">
      <div className="ss-proj-header">
        <TrendingUp size={16} />
        <span>If you invest {formatEur(proj.monthly_redirect)}/month</span>
      </div>
      <div className="ss-proj-type">{proj.investment_type} · {proj.expected_annual_return}% annual return</div>
      <div className="ss-proj-grid">
        <div className="ss-proj-item">
          <span className="ss-proj-label">Per Year</span>
          <span className="ss-proj-value">{formatEur(proj.annual_amount)}</span>
        </div>
        <div className="ss-proj-item">
          <span className="ss-proj-label">5-Year Value</span>
          <span className="ss-proj-value ss-green">{formatEur(proj.projected_5yr_value)}</span>
        </div>
        <div className="ss-proj-item">
          <span className="ss-proj-label">10-Year Value</span>
          <span className="ss-proj-value ss-green">{formatEur(proj.projected_10yr_value)}</span>
        </div>
      </div>
    </div>
  );
}

export default function SmartSpending({ api }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const apiRef = useRef(api);
  apiRef.current = api;

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRef.current.getSpendingAnalysis();
      setAnalysis(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  if (loading && !analysis) {
    return (
      <div className="ss-widget">
        <div className="ss-loading">
          <Sparkles size={20} className="ss-sparkle" />
          <Loader2 size={20} className="spin" />
          <span>AI is analyzing your spending patterns...</span>
        </div>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className="ss-widget">
        <div className="ss-error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={fetchAnalysis} className="ss-retry-btn">Retry</button>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const spending = analysis.monthly_spending || {};
  const savings = analysis.savings_opportunities || [];
  const projections = analysis.investment_projections || [];
  const spendingEntries = Object.entries(spending).sort((a, b) => (b[1].amount || 0) - (a[1].amount || 0));
  const maxSpending = spendingEntries.length > 0 ? spendingEntries[0][1].amount : 1;

  return (
    <div className="ss-widget">
      <div className="ss-header">
        <div className="ss-title-group">
          <Sparkles size={16} />
          <h3>Smart Spending Analysis</h3>
        </div>
        <button className="ss-refresh" onClick={fetchAnalysis} disabled={loading}>
          <RefreshCw size={12} className={loading ? 'spin' : ''} />
          {loading ? 'Analyzing...' : 'Refresh'}
        </button>
      </div>

      {analysis.total_monthly_savings_potential > 0 && (
        <div className="ss-savings-banner">
          <PiggyBank size={18} />
          <div>
            <div className="ss-savings-headline">
              You could save <strong>{formatEur(analysis.total_monthly_savings_potential)}/month</strong>
            </div>
            <div className="ss-savings-sub">
              That's {formatEur(analysis.total_annual_savings_potential)} per year to invest
            </div>
          </div>
        </div>
      )}

      {spendingEntries.length > 0 && (
        <div className="ss-section">
          <h4><Scissors size={13} /> Spending Breakdown</h4>
          <div className="ss-cat-list">
            {spendingEntries.map(([name, data]) => (
              <CategoryBar key={name} name={name} data={data} maxAmount={maxSpending} />
            ))}
          </div>
        </div>
      )}

      {savings.length > 0 && (
        <div className="ss-section">
          <h4><PiggyBank size={13} /> Savings Opportunities</h4>
          <div className="ss-savings-grid">
            {savings.map((opp, i) => (
              <SavingsCard key={i} opp={opp} />
            ))}
          </div>
        </div>
      )}

      {projections.length > 0 && (
        <div className="ss-section">
          <h4><TrendingUp size={13} /> Investment ROI Projections</h4>
          <div className="ss-proj-list">
            {projections.map((proj, i) => (
              <InvestmentProjection key={i} proj={proj} />
            ))}
          </div>
        </div>
      )}

      {analysis.error && (
        <div className="ss-error-inline">
          <AlertCircle size={12} />
          <span>{analysis.error}</span>
        </div>
      )}
    </div>
  );
}
