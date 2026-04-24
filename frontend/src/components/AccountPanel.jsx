import { Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function AccountPanel({ accounts, transactions }) {
  if (!accounts?.length) return null;

  const primary = accounts.find((a) => a.status === 'ACTIVE') || accounts[0];
  const balance = parseFloat(primary?.balance?.value || 0);
  const currency = primary?.balance?.currency || 'EUR';

  const income = transactions
    ?.filter((t) => parseFloat(t.amount.value) > 0)
    .reduce((s, t) => s + parseFloat(t.amount.value), 0) || 0;
  const expenses = transactions
    ?.filter((t) => parseFloat(t.amount.value) < 0)
    .reduce((s, t) => s + Math.abs(parseFloat(t.amount.value)), 0) || 0;

  return (
    <div className="panel account-panel">
      <div className="panel-header">
        <Wallet size={20} />
        <h3>Account Overview</h3>
      </div>
      <div className="balance-display">
        <span className="balance-label">Available Balance</span>
        <span className="balance-amount">
          {currency} {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="flow-row">
        <div className="flow-item income">
          <ArrowUpRight size={16} />
          <span>+{income.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}</span>
        </div>
        <div className="flow-item expenses">
          <ArrowDownRight size={16} />
          <span>-{expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}</span>
        </div>
      </div>
      {primary?.iban && <div className="iban">IBAN: {primary.iban}</div>}
      {transactions?.length > 0 && (
        <div className="recent-tx">
          <h4>Recent Transactions</h4>
          <div className="tx-list">
            {transactions.slice(0, 5).map((tx, i) => (
              <div key={i} className="tx-item">
                <span className="tx-party">{tx.counterparty || 'Unknown'}</span>
                <span className={`tx-amount ${parseFloat(tx.amount.value) >= 0 ? 'positive' : 'negative'}`}>
                  {parseFloat(tx.amount.value) >= 0 ? '+' : ''}
                  {parseFloat(tx.amount.value).toLocaleString('en-US', { minimumFractionDigits: 2 })} {tx.amount.currency}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
