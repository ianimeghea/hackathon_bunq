import { useState, useCallback } from 'react';

const API_BASE = '';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (path, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}${path}`, options);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Request failed (${res.status})`);
      }
      return await res.json();
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadReceipt = useCallback(async (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/api/upload-receipt', { method: 'POST', body: form });
  }, [request]);

  const confirmSplit = useCallback(async (receiptId, items, householdMembers) => {
    return request('/api/confirm-split', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receipt_id: receiptId, items, household_members: householdMembers }),
    });
  }, [request]);

  const getReceipts = useCallback(() => request('/api/receipts'), [request]);

  const getReceipt = useCallback((id) => request(`/api/receipts/${id}`), [request]);

  const deleteReceipt = useCallback((id) => request(`/api/receipts/${id}`, { method: 'DELETE' }), [request]);

  const voiceCommand = useCallback(async (transcript, items) => {
    return request('/api/voice-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, items }),
    });
  }, [request]);

  const getPreferences = useCallback(() => request('/api/preferences'), [request]);

  return {
    loading, error, setError,
    uploadReceipt, confirmSplit, getReceipts, getReceipt, deleteReceipt, voiceCommand, getPreferences,
  };
}
