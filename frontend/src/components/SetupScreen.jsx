import { useState } from 'react';
import { Loader2, Banknote, CheckCircle } from 'lucide-react';

export default function SetupScreen({ onComplete, api }) {
  const [step, setStep] = useState('init');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [bunqData, setBunqData] = useState(null);

  const handleInit = async () => {
    setLoading(true);
    setError('');
    setStatus('Connecting to bunq sandbox...');
    try {
      const result = await api.initBunq(apiKey || undefined);
      setBunqData(result);
      setStatus('Connected! Requesting test funds...');
      try {
        await api.requestMoney('500.00');
        setStatus('Done! €500 test funds requested.');
      } catch {
        setStatus('Connected (test funds request may take a moment).');
      }
      setStep('ready');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'ready') {
    return (
      <div className="setup-screen">
        <div className="setup-card done">
          <CheckCircle size={48} className="success-icon" />
          <h2>Connected to bunq</h2>
          <p>User ID: {bunqData?.user_id} | Account: {bunqData?.account_id}</p>
          <button className="btn-primary" onClick={() => onComplete(bunqData)}>
            Launch VoiceInvest
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <Banknote size={48} className="setup-icon" />
        <h2>VoiceInvest</h2>
        <p className="setup-subtitle">AI-Powered Investment Platform</p>
        <p className="setup-desc">
          Connect your bunq sandbox account to get started. We'll create a test account
          with €500 in funds automatically.
        </p>
        <div className="setup-form">
          <input
            type="text"
            placeholder="bunq API key (leave empty for auto-create)"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <button className="btn-primary" onClick={handleInit} disabled={loading}>
            {loading ? <><Loader2 size={18} className="spin" /> {status}</> : 'Connect to bunq Sandbox'}
          </button>
        </div>
        {error && <p className="error-msg">{error}</p>}
      </div>
    </div>
  );
}
