import { useState, useEffect, useCallback } from 'react';
import { useApi } from './hooks/useApi';
import UploadZone from './components/UploadZone';
import ReceiptReview from './components/ReceiptReview';
import ReceiptHistory from './components/ReceiptHistory';
import ReceiptDetail from './components/ReceiptDetail';
import Dashboard from './components/Dashboard';
import Preferences from './components/Preferences';

const TABS = {
  SCAN: 'scan',
  HISTORY: 'history',
  DASHBOARD: 'dashboard',
  PREFS: 'prefs',
};

export default function App() {
  const api = useApi();
  const [tab, setTab] = useState(TABS.SCAN);
  const [receipts, setReceipts] = useState([]);
  const [pendingReceipt, setPendingReceipt] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const loadReceipts = useCallback(async () => {
    try {
      const data = await api.getReceipts();
      setReceipts(data);
    } catch {}
  }, [api.getReceipts]);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const receipt = await api.uploadReceipt(file);
      setPendingReceipt(receipt);
    } catch {}
    setUploading(false);
  };

  const handleConfirm = async (items, members) => {
    if (!pendingReceipt) return;
    setConfirming(true);
    try {
      await api.confirmSplit(pendingReceipt.id, items, members);
      setPendingReceipt(null);
      await loadReceipts();
    } catch {}
    setConfirming(false);
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteReceipt(id);
      setSelectedReceipt(null);
      await loadReceipts();
    } catch {}
  };

  const renderContent = () => {
    if (selectedReceipt) {
      return (
        <ReceiptDetail
          receipt={selectedReceipt}
          onBack={() => setSelectedReceipt(null)}
          onDelete={handleDelete}
        />
      );
    }

    switch (tab) {
      case TABS.SCAN:
        if (pendingReceipt) {
          return (
            <ReceiptReview
              receipt={pendingReceipt}
              onConfirm={handleConfirm}
              onCancel={() => setPendingReceipt(null)}
              loading={confirming}
              onVoiceCommand={api.voiceCommand}
            />
          );
        }
        return (
          <>
            <UploadZone onUpload={handleUpload} loading={uploading} />
            <ReceiptHistory
              receipts={receipts.slice(0, 3)}
              onSelect={setSelectedReceipt}
            />
          </>
        );

      case TABS.HISTORY:
        return (
          <ReceiptHistory
            receipts={receipts}
            onSelect={setSelectedReceipt}
          />
        );

      case TABS.DASHBOARD:
        return <Dashboard receipts={receipts} />;

      case TABS.PREFS:
        return <Preferences api={api} />;

      default:
        return null;
    }
  };

  return (
    <div className="app">
      <div className="app-header">
        <div>
          <div className="app-title">SplitSmart</div>
          <div className="app-subtitle">AI-powered receipt splitting</div>
        </div>
      </div>

      {api.error && (
        <div className="glass-sm fade-in" style={{
          padding: '12px 16px', marginBottom: 16,
          background: 'var(--red-light)', borderColor: 'rgba(255,59,48,0.2)',
          color: 'var(--red)', fontSize: 14, fontWeight: 500,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{api.error}</span>
          <button
            onClick={() => api.setError(null)}
            style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}
          >×</button>
        </div>
      )}

      {renderContent()}

      <nav className="nav-tabs">
        <div className="nav-tabs-inner">
          <button className={`nav-tab ${tab === TABS.SCAN ? 'active' : ''}`} onClick={() => { setTab(TABS.SCAN); setSelectedReceipt(null); }}>
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
            <span className="nav-tab-label">Scan</span>
          </button>
          <button className={`nav-tab ${tab === TABS.HISTORY ? 'active' : ''}`} onClick={() => { setTab(TABS.HISTORY); setSelectedReceipt(null); }}>
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span className="nav-tab-label">History</span>
          </button>
          <button className={`nav-tab ${tab === TABS.DASHBOARD ? 'active' : ''}`} onClick={() => { setTab(TABS.DASHBOARD); setSelectedReceipt(null); }}>
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
            <span className="nav-tab-label">Stats</span>
          </button>
          <button className={`nav-tab ${tab === TABS.PREFS ? 'active' : ''}`} onClick={() => { setTab(TABS.PREFS); setSelectedReceipt(null); }}>
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
            <span className="nav-tab-label">AI Memory</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
