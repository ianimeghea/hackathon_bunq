import { Activity, CheckCircle, Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function AgentFeed({ events, narrationText, isComplete }) {
  const narrationRef = useRef(null);

  useEffect(() => {
    if (narrationRef.current) {
      narrationRef.current.scrollTop = narrationRef.current.scrollHeight;
    }
  }, [narrationText]);

  if (!events.length && !narrationText) return null;

  return (
    <div className="agent-feed">
      <div className="feed-header">
        {isComplete ? <CheckCircle size={16} /> : <Activity size={16} />}
        <h3>{isComplete ? 'Analysis Complete' : 'Live Agent Feed'}</h3>
        {!isComplete && <Loader2 size={14} className="spin" />}
      </div>

      {events.filter(e => e.type === 'status').map((event, i) => (
        <div key={i} className="feed-status-line">
          <Activity size={14} />
          <span>{event.message}</span>
        </div>
      ))}

      {narrationText && (
        <div className="narration-box" ref={narrationRef}>
          <div className="narration-text" dangerouslySetInnerHTML={{
            __html: formatNarration(narrationText)
          }} />
          {!isComplete && <span className="narration-cursor" />}
        </div>
      )}

      {events.filter(e => e.type === 'agent_complete').map((event, i) => (
        <div key={`complete-${i}`} className="feed-complete-line">
          <CheckCircle size={14} />
          <span>{event.message}</span>
        </div>
      ))}
    </div>
  );
}

function formatNarration(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
    .replace(/```json[\s\S]*$/g, '');
}
