import { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from './hooks/useApi';
import VoiceInput from './components/VoiceInput';
import AccountPanel from './components/AccountPanel';
import StrategyCards from './components/StrategyCards';
import MarketTicker from './components/MarketTicker';
import AnalyticsTab from './components/AnalyticsTab';
import ActiveInvestments from './components/ActiveInvestments';
import SmartSpending from './components/SmartSpending';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function App() {
  const api = useApi();
  const apiRef = useRef(api);
  apiRef.current = api;

  const [ready, setReady] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [marketSnapshot, setMarketSnapshot] = useState(null);
  const [strategies, setStrategies] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [agentStatus, setAgentStatus] = useState('');
  const [activeTab, setActiveTab] = useState('invest');
  const [history, setHistory] = useState([]);
  const closeStreamRef = useRef(null);

  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [executingStrategy, setExecutingStrategy] = useState(null);
  const [executedStrategy, setExecutedStrategy] = useState(null);
  const [hasActiveInvestments, setHasActiveInvestments] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await apiRef.current.initBunq();
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) setConnectError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const a = apiRef.current;
      const [acctData, txData, mktData, invData] = await Promise.all([
        a.getAccount(),
        a.getTransactions(),
        a.getMarketSnapshot(),
        a.getActiveInvestments(),
      ]);
      setAccounts(acctData.accounts || []);
      setTransactions(txData.transactions || []);
      setMarketSnapshot(mktData);
      setHasActiveInvestments((invData.investments || []).length > 0);
    } catch (err) {
      console.error('Data fetch error:', err);
    }
  }, []);

  useEffect(() => {
    if (ready) {
      fetchData();
      const interval = setInterval(fetchData, 60000);
      return () => clearInterval(interval);
    }
  }, [ready, fetchData]);

  const handleAnalyze = useCallback((command) => {
    setIsAnalyzing(true);
    setStrategies([null, null, null, null, null]);
    setAgentStatus('Connecting to markets...');
    setActiveTab('invest');
    setSelectedStrategy(null);
    setExecutingStrategy(null);
    setExecutedStrategy(null);

    const close = apiRef.current.analyzeStream(command, (event) => {
      if (event.type === 'status') {
        setAgentStatus(event.message);
      } else if (event.type === 'strategy') {
        setStrategies(prev => {
          const next = [...prev];
          next[event.index] = event.data;
          return next;
        });
        setAgentStatus(`Evaluating strategy ${event.index + 2} of 5...`);
      } else if (event.type === 'agent_complete') {
        setAgentStatus('');
      } else if (event.type === 'complete') {
        setIsAnalyzing(false);
        setAgentStatus('');
        if (event.data?.strategies?.length) {
          setStrategies(event.data.strategies);
        }
        setHistory(prev => [{ command, timestamp: new Date().toISOString() }, ...prev]);
        fetchData();
      } else if (event.type === 'agent_error') {
        setAgentStatus(event.message);
      } else if (event.type === 'error') {
        setIsAnalyzing(false);
        setAgentStatus('Connection lost');
      }
    });

    closeStreamRef.current = close;
  }, [fetchData]);

  const handleSelectStrategy = useCallback((index) => {
    if (executedStrategy !== null) return;
    setSelectedStrategy(prev => prev === index ? null : index);
  }, [executedStrategy]);

  const handleExecuteStrategy = useCallback(async () => {
    if (selectedStrategy === null) return;
    const strategy = strategies[selectedStrategy];
    if (!strategy) return;

    setExecutingStrategy(selectedStrategy);
    try {
      await apiRef.current.executeStrategy(strategy);
      setExecutedStrategy(selectedStrategy);
      setExecutingStrategy(null);
      setHasActiveInvestments(true);
      // Small delay so bunq sandbox processes the payment before we re-fetch
      setTimeout(fetchData, 1500);
    } catch (err) {
      console.error('Execute failed:', err);
      setExecutingStrategy(null);
    }
  }, [selectedStrategy, strategies, fetchData]);

  useEffect(() => {
    return () => { if (closeStreamRef.current) closeStreamRef.current(); };
  }, []);

  if (!ready) {
    return (
      <div className="loading-screen">
        <div className="loading-dot"><span /><span /><span /></div>
        <h2>stonq</h2>
        <p>{connectError || 'Connecting to bunq...'}</p>
        {connectError && <p className="loading-error">{connectError}</p>}
      </div>
    );
  }

  const showCards = strategies.some(s => s !== null);
  const canExecute = selectedStrategy !== null && executedStrategy === null && executingStrategy === null && !isAnalyzing;

  return (
    <div className="app">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      <header className="app-header">
        <div className="logo">
          <h1>ston<span className="logo-q">q</span></h1>
          <span className="tagline">AI-Powered Investment Platform</span>
        </div>
        <div className="header-tabs">
          <button className={`tab ${activeTab === 'invest' ? 'active' : ''}`} onClick={() => setActiveTab('invest')}>
            Invest
          </button>
          {hasActiveInvestments && (
            <button className={`tab ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
              Active Investments
            </button>
          )}
          <button className={`tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
            Analytics
          </button>
        </div>
        <div className="header-right">
          <span className="status-dot connected" />
          <span>bunq connected</span>
        </div>
      </header>

      <MarketTicker snapshot={marketSnapshot} />

      <main className="app-main">
        <div className="sidebar">
          <AccountPanel accounts={accounts} transactions={transactions} />
          {marketSnapshot && (
            <div className="panel market-summary-panel">
              <h3>Markets Tracked</h3>
              <div className="market-stats">
                <div className="stat"><span className="stat-num">{marketSnapshot.stocks?.length || 0}</span><span>Stocks</span></div>
                <div className="stat"><span className="stat-num">{marketSnapshot.indices?.length || 0}</span><span>Indices</span></div>
                <div className="stat"><span className="stat-num">{marketSnapshot.commodities?.length || 0}</span><span>Commodities</span></div>
                <div className="stat"><span className="stat-num">{marketSnapshot.etfs?.length || 0}</span><span>ETFs</span></div>
                <div className="stat"><span className="stat-num">{marketSnapshot.crypto?.length || 0}</span><span>Crypto</span></div>
                <div className="stat"><span className="stat-num">{marketSnapshot.forex?.length || 0}</span><span>Forex</span></div>
              </div>
            </div>
          )}
        </div>

        <div className="content">
          {activeTab === 'invest' && (
            <>
              <VoiceInput onSubmitText={handleAnalyze} isAnalyzing={isAnalyzing} />

              {agentStatus && (
                <div className="agent-status-bar">
                  <div className="status-pulse" />
                  <span>{agentStatus}</span>
                </div>
              )}

              {showCards && (
                <>
                  {!isAnalyzing && executedStrategy === null && (
                    <div className="strategy-prompt">
                      {selectedStrategy === null
                        ? 'Select a strategy to execute'
                        : `Ready to execute: ${strategies[selectedStrategy]?.name}`}
                    </div>
                  )}

                  {executedStrategy !== null && (
                    <div className="strategy-executed-banner">
                      <CheckCircle2 size={16} />
                      <span>Investment executed! Track it in the <button className="inline-link" onClick={() => setActiveTab('active')}>Active Investments</button> tab.</span>
                    </div>
                  )}

                  <StrategyCards
                    strategies={strategies}
                    isLoading={isAnalyzing}
                    selectedIndex={selectedStrategy}
                    onSelect={handleSelectStrategy}
                    executedIndex={executedStrategy}
                    executingIndex={executingStrategy}
                  />

                  {canExecute && (
                    <div className="execute-bar">
                      <button className="execute-btn" onClick={handleExecuteStrategy}>
                        Execute {strategies[selectedStrategy]?.action} — &euro;{strategies[selectedStrategy]?.amount_eur?.toLocaleString('en', { minimumFractionDigits: 2 })} in {strategies[selectedStrategy]?.symbol}
                      </button>
                    </div>
                  )}

                  {executingStrategy !== null && (
                    <div className="execute-bar">
                      <div className="executing-indicator">
                        <Loader2 size={16} className="spin" />
                        <span>Executing investment via bunq...</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {history.length > 0 && !isAnalyzing && !showCards && (
                <div className="history-section">
                  <h3>Recent</h3>
                  {history.slice(0, 3).map((h, i) => (
                    <div key={i} className="history-item" onClick={() => handleAnalyze(h.command)}>
                      <span className="history-cmd">"{h.command}"</span>
                      <span className="history-time">{new Date(h.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}

              <SmartSpending api={api} />
            </>
          )}

          {activeTab === 'active' && (
            <ActiveInvestments api={api} />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab transactions={transactions} accounts={accounts} />
          )}
        </div>
      </main>
    </div>
  );
}
