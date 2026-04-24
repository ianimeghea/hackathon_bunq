import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, DollarSign, Calendar, BarChart3 } from 'lucide-react';

function groupByMonth(transactions) {
  const months = {};
  for (const tx of transactions) {
    const date = tx.created?.slice(0, 7) || 'Unknown';
    if (!months[date]) months[date] = { income: 0, expenses: 0, count: 0 };
    const val = parseFloat(tx.amount.value);
    if (val > 0) months[date].income += val;
    else months[date].expenses += Math.abs(val);
    months[date].count++;
  }
  return months;
}

function groupByCategory(transactions) {
  const cats = {};
  for (const tx of transactions) {
    const val = parseFloat(tx.amount.value);
    const key = tx.counterparty || 'Unknown';
    if (!cats[key]) cats[key] = { total: 0, count: 0 };
    cats[key].total += val;
    cats[key].count++;
  }
  return Object.entries(cats)
    .sort((a, b) => Math.abs(b[1].total) - Math.abs(a[1].total))
    .slice(0, 10);
}

export default function AnalyticsTab({ transactions, accounts }) {
  if (!transactions?.length) {
    return (
      <div className="analytics-tab">
        <div className="analytics-empty">
          <BarChart3 size={48} />
          <p>No transaction data yet. Connect your bunq account to see analytics.</p>
        </div>
      </div>
    );
  }

  const totalIncome = transactions
    .filter((t) => parseFloat(t.amount.value) > 0)
    .reduce((s, t) => s + parseFloat(t.amount.value), 0);
  const totalExpenses = transactions
    .filter((t) => parseFloat(t.amount.value) < 0)
    .reduce((s, t) => s + Math.abs(parseFloat(t.amount.value)), 0);
  const netFlow = totalIncome - totalExpenses;
  const balance = accounts?.[0]?.balance ? parseFloat(accounts[0].balance.value) : 0;

  const monthly = groupByMonth(transactions);
  const categories = groupByCategory(transactions);

  const maxBar = Math.max(...Object.values(monthly).map((m) => Math.max(m.income, m.expenses)), 1);

  return (
    <div className="analytics-tab">
      <div className="analytics-summary">
        <div className="analytics-card">
          <DollarSign size={20} />
          <div>
            <span className="analytics-label">Balance</span>
            <span className="analytics-value">&euro;{balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        <div className="analytics-card income">
          <ArrowUpRight size={20} />
          <div>
            <span className="analytics-label">Total Income</span>
            <span className="analytics-value">+&euro;{totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        <div className="analytics-card expenses">
          <ArrowDownRight size={20} />
          <div>
            <span className="analytics-label">Total Expenses</span>
            <span className="analytics-value">-&euro;{totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        <div className={`analytics-card ${netFlow >= 0 ? 'income' : 'expenses'}`}>
          {netFlow >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          <div>
            <span className="analytics-label">Net Flow</span>
            <span className="analytics-value">{netFlow >= 0 ? '+' : ''}&euro;{netFlow.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {Object.keys(monthly).length > 0 && (
        <div className="analytics-section">
          <h4><Calendar size={16} /> Monthly Breakdown</h4>
          <div className="monthly-chart">
            {Object.entries(monthly).map(([month, data]) => (
              <div key={month} className="month-row">
                <span className="month-label">{month}</span>
                <div className="month-bars">
                  <div className="bar-row">
                    <div className="bar income-bar" style={{ width: `${(data.income / maxBar) * 100}%` }} />
                    <span className="bar-label">+{data.income.toFixed(2)}</span>
                  </div>
                  <div className="bar-row">
                    <div className="bar expense-bar" style={{ width: `${(data.expenses / maxBar) * 100}%` }} />
                    <span className="bar-label">-{data.expenses.toFixed(2)}</span>
                  </div>
                </div>
                <span className="month-count">{data.count} tx</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="analytics-section">
        <h4><BarChart3 size={16} /> Top Counterparties</h4>
        <div className="counterparty-list">
          {categories.map(([name, data], i) => (
            <div key={i} className="counterparty-row">
              <span className="cp-rank">#{i + 1}</span>
              <span className="cp-name">{name}</span>
              <span className={`cp-amount ${data.total >= 0 ? 'positive' : 'negative'}`}>
                {data.total >= 0 ? '+' : ''}&euro;{data.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="cp-count">{data.count}x</span>
            </div>
          ))}
        </div>
      </div>

      <div className="analytics-section">
        <h4>All Transactions</h4>
        <div className="tx-full-list">
          {transactions.map((tx, i) => (
            <div key={i} className="tx-full-row">
              <span className="tx-date">{tx.created?.slice(0, 16)}</span>
              <span className="tx-desc">{tx.description || tx.counterparty}</span>
              <span className="tx-counterparty">{tx.counterparty}</span>
              <span className={`tx-val ${parseFloat(tx.amount.value) >= 0 ? 'positive' : 'negative'}`}>
                {parseFloat(tx.amount.value) >= 0 ? '+' : ''}&euro;{parseFloat(tx.amount.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
