import { Loader2, CheckCircle, Shield, Target, Zap } from 'lucide-react';

const AGENTS = [
  { key: 'safe', name: 'SafeHaven Advisor', icon: Shield, color: '#4ade80' },
  { key: 'moderate', name: 'BalanceGrowth Advisor', icon: Target, color: '#facc15' },
  { key: 'risky', name: 'AlphaSeeker Advisor', icon: Zap, color: '#f87171' },
];

export default function AgentStatus({ stage, completedAgents }) {
  if (!stage || stage === 'complete') return null;

  return (
    <div className="agent-status">
      <h3>AI Agents Working</h3>
      <div className="agent-list">
        {AGENTS.map(({ key, name, icon: Icon, color }) => {
          const done = completedAgents.includes(key);
          const running = stage === 'agents_running' && !done;

          return (
            <div key={key} className={`agent-item ${done ? 'done' : ''} ${running ? 'running' : ''}`}>
              <Icon size={20} style={{ color }} />
              <span>{name}</span>
              {done ? <CheckCircle size={18} className="check" /> : running ? <Loader2 size={18} className="spin" /> : null}
            </div>
          );
        })}
      </div>
      {stage === 'fetching_data' && <p className="stage-msg">Gathering financial data and market prices...</p>}
      {stage === 'data_ready' && <p className="stage-msg">Data collected. Launching agents...</p>}
      {stage === 'agents_running' && <p className="stage-msg">Agents analyzing in parallel...</p>}
    </div>
  );
}
