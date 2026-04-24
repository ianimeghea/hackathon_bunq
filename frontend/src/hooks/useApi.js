import { useState, useCallback } from 'react';

const API_BASE = '';

export function useApi() {
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);

  const request = useCallback(async (endpoint, options = {}) => {
    setLoading((prev) => ({ ...prev, [endpoint]: true }));
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}${endpoint}`, options);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: resp.statusText }));
        throw new Error(err.detail || 'Request failed');
      }
      return await resp.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading((prev) => ({ ...prev, [endpoint]: false }));
    }
  }, []);

  const initBunq = useCallback(
    (apiKey) => {
      const params = apiKey ? `?api_key=${encodeURIComponent(apiKey)}` : '';
      return request(`/api/init-bunq${params}`, { method: 'POST' });
    },
    [request],
  );

  const requestMoney = useCallback(
    (amount = '500.00') =>
      request(`/api/request-money?amount=${amount}`, { method: 'POST' }),
    [request],
  );

  const getAccount = useCallback(() => request('/api/account'), [request]);
  const getTransactions = useCallback((count = 50) => request(`/api/transactions?count=${count}`), [request]);
  const getMarketSnapshot = useCallback(() => request('/api/market-snapshot'), [request]);

  const analyzeText = useCallback(
    (command) =>
      request('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `command=${encodeURIComponent(command)}`,
      }),
    [request],
  );

  const analyzeStream = useCallback((command, onEvent) => {
    const url = `${API_BASE}/api/analyze-stream?command=${encodeURIComponent(command)}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent(data);
        if (data.type === 'complete') {
          eventSource.close();
        }
      } catch (err) {
        console.error('[SSE] Parse error:', err, 'raw:', e.data?.substring(0, 200));
      }
    };

    eventSource.onerror = (e) => {
      console.error('[SSE] Connection error:', e);
      eventSource.close();
      onEvent({ type: 'error', message: 'Connection lost' });
    };

    return () => eventSource.close();
  }, []);

  const executeStrategy = useCallback(
    (strategy) =>
      request('/api/execute-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategy),
      }),
    [request],
  );

  const getActiveInvestments = useCallback(() => request('/api/active-investments'), [request]);

  const getInvestmentRecommendation = useCallback(
    (investmentId) => request(`/api/investment-recommendation?investment_id=${encodeURIComponent(investmentId)}`),
    [request],
  );

  const getSpendingAnalysis = useCallback(() => request('/api/spending-analysis'), [request]);

  const closeInvestment = useCallback(
    (investmentId) =>
      request(`/api/close-investment?investment_id=${encodeURIComponent(investmentId)}`, { method: 'POST' }),
    [request],
  );

  return {
    loading,
    error,
    initBunq,
    requestMoney,
    getAccount,
    getTransactions,
    getMarketSnapshot,
    analyzeText,
    analyzeStream,
    executeStrategy,
    getActiveInvestments,
    getInvestmentRecommendation,
    closeInvestment,
    getSpendingAnalysis,
  };
}
