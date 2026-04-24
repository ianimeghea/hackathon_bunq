import { useState, useRef, useEffect, useCallback } from 'react';

export default function VoiceBar({ onCommand, processing }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState(null);
  const recognitionRef = useRef(null);

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (e) => {
      let final = '';
      let interim = '';
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      setTranscript(final || interim);
      if (final) {
        setListening(false);
        onCommand(final.trim());
      }
    };

    recognition.onerror = () => {
      setListening(false);
      setTranscript('');
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    return () => recognition.abort();
  }, [supported, onCommand]);

  const toggle = useCallback(() => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setTranscript('');
      setFeedback(null);
      recognitionRef.current.start();
      setListening(true);
    }
  }, [listening]);

  const showFeedback = useCallback((msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  }, []);

  useEffect(() => {
    if (window._voiceBarFeedback) return;
    window._voiceBarFeedback = showFeedback;
    return () => { delete window._voiceBarFeedback; };
  }, [showFeedback]);

  if (!supported) return null;

  return (
    <div className="voice-bar">
      {feedback && (
        <div className="voice-feedback fade-in">{feedback}</div>
      )}

      <div className="voice-bar-inner">
        <div className="voice-transcript">
          {processing ? 'Thinking...' :
           listening ? (transcript || 'Listening...') :
           transcript || 'Tap mic to give voice feedback'}
        </div>

        <button
          className={`voice-btn ${listening ? 'active' : ''} ${processing ? 'processing' : ''}`}
          onClick={toggle}
          disabled={processing}
        >
          {processing ? (
            <div className="voice-spinner" />
          ) : (
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
