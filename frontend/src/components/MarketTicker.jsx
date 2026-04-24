import { TrendingUp, TrendingDown } from 'lucide-react';

export default function MarketTicker({ snapshot }) {
  if (!snapshot) return null;

  const tickers = [
    ...(snapshot.indices || []).slice(0, 6),
    ...(snapshot.commodities || []).slice(0, 4),
    ...(snapshot.crypto || []).slice(0, 3),
  ];

  if (tickers.length === 0) return null;

  return (
    <div className="market-ticker">
      <div className="ticker-track">
        {[...tickers, ...tickers].map((item, i) => (
          <div key={i} className="ticker-item">
            <span className="ticker-symbol">{item.symbol}</span>
            <span className="ticker-price">${item.price?.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
            <span className={`ticker-change ${item.change_percent >= 0 ? 'positive' : 'negative'}`}>
              {item.change_percent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {item.change_percent >= 0 ? '+' : ''}{item.change_percent?.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
