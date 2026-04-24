import { useState, useEffect, useCallback } from 'react';
import { useApi } from './hooks/useApi';
import UploadZone from './components/UploadZone';
import ReceiptReview from './components/ReceiptReview';
import ReceiptHistory from './components/ReceiptHistory';
import ReceiptDetail from './components/ReceiptDetail';
import Dashboard from './components/Dashboard';
import Preferences from './components/Preferences';
import Payments from './components/Payments';
import FlatmatesPanel from './components/FlatmatesPanel';
import PaymentRequest from './components/PaymentRequest';

const TABS = {
  SCAN: 'scan',
  HISTORY: 'history',
  PEOPLE: 'people',
  PAYMENTS: 'payments',
  DASHBOARD: 'dashboard',
};

export default function App() {
  const api = useApi();
  const [tab, setTab] = useState(TABS.SCAN);
  const [receipts, setReceipts] = useState([]);
  const [pendingReceipt, setPendingReceipt] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showPayment, setShowPayment] = useState(null);

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
      const confirmed = await api.confirmSplit(pendingReceipt.id, items, members);
      setPendingReceipt(null);
      setShowPayment(confirmed);
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
    if (showPayment) {
      return (
        <PaymentRequest
          receipt={showPayment}
          api={api}
        />
      );
    }

    if (selectedReceipt) {
      return (
        <ReceiptDetail
          receipt={selectedReceipt}
          onBack={() => setSelectedReceipt(null)}
          onDelete={handleDelete}
          onRequestPayment={() => {
            setShowPayment(selectedReceipt);
            setSelectedReceipt(null);
          }}
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

      case TABS.PEOPLE:
        return <FlatmatesPanel api={api} />;

      case TABS.PAYMENTS:
        return <Payments api={api} />;

      case TABS.DASHBOARD:
        return <Dashboard receipts={receipts} />;

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
          <button className={`nav-tab ${tab === TABS.SCAN ? 'active' : ''}`} onClick={() => { setTab(TABS.SCAN); setSelectedReceipt(null); setShowPayment(null); }}>
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
            <span className="nav-tab-label">Scan</span>
          </button>
          <button className={`nav-tab ${tab === TABS.HISTORY ? 'active' : ''}`} onClick={() => { setTab(TABS.HISTORY); setSelectedReceipt(null); setShowPayment(null); }}>
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span className="nav-tab-label">History</span>
          </button>
          <button className={`nav-tab ${tab === TABS.PEOPLE ? 'active' : ''}`} onClick={() => { setTab(TABS.PEOPLE); setSelectedReceipt(null); setShowPayment(null); }}>
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            <span className="nav-tab-label">People</span>
          </button>
          <button className={`nav-tab ${tab === TABS.PAYMENTS ? 'active' : ''}`} onClick={() => { setTab(TABS.PAYMENTS); setSelectedReceipt(null); setShowPayment(null); }}>
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
            <span className="nav-tab-label">Payments</span>
          </button>
          <button className={`nav-tab ${tab === TABS.DASHBOARD ? 'active' : ''}`} onClick={() => { setTab(TABS.DASHBOARD); setSelectedReceipt(null); setShowPayment(null); }}>
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
            <span className="nav-tab-label">Stats</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
