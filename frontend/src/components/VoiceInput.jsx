import { useState } from 'react';
import { Mic, MicOff, Send, Loader2, Keyboard } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

export default function VoiceInput({ onSubmitText, isAnalyzing }) {
  const { isListening, transcript, interimTranscript, supported, startListening, stopListening, reset } = useSpeechRecognition();
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState('');

  const handleSendTranscript = () => {
    if (transcript.trim()) {
      onSubmitText(transcript.trim());
      reset();
    }
  };

  const handleSendText = (e) => {
    e.preventDefault();
    if (textInput.trim()) {
      onSubmitText(textInput.trim());
      setTextInput('');
    }
  };

  if (isAnalyzing) {
    return (
      <div className="voice-input analyzing">
        <div className="analyzing-indicator">
          <Loader2 className="spin" size={32} />
          <span>Agents analyzing your request...</span>
        </div>
      </div>
    );
  }

  if (textMode) {
    return (
      <div className="voice-input text-mode">
        <form onSubmit={handleSendText} className="text-form">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your investment command... e.g. 'Invest 1000 euros in safe tech stocks'"
            autoFocus
          />
          <button type="submit" disabled={!textInput.trim()} className="btn-send">
            <Send size={20} />
          </button>
        </form>
        {supported && (
          <button className="btn-toggle-mode" onClick={() => setTextMode(false)}>
            <Mic size={16} /> Switch to voice
          </button>
        )}
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="voice-input text-mode">
        <form onSubmit={handleSendText} className="text-form">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your investment command..."
            autoFocus
          />
          <button type="submit" disabled={!textInput.trim()} className="btn-send">
            <Send size={20} />
          </button>
        </form>
        <p className="voice-unsupported">Voice input not supported in this browser. Use Chrome for voice.</p>
      </div>
    );
  }

  return (
    <div className="voice-input">
      <div className="voice-controls">
        {!isListening && !transcript && (
          <button className="btn-record" onClick={startListening}>
            <Mic size={28} />
            <span>Tap to speak</span>
          </button>
        )}

        {isListening && (
          <>
            <button className="btn-record recording" onClick={stopListening}>
              <MicOff size={28} />
              <span>Tap to stop</span>
              <div className="pulse-ring" />
            </button>
            <div className="live-transcript">
              {transcript && <span className="final">{transcript}</span>}
              {interimTranscript && <span className="interim">{interimTranscript}</span>}
              {!transcript && !interimTranscript && <span className="interim">Listening...</span>}
            </div>
          </>
        )}

        {transcript && !isListening && (
          <div className="audio-ready">
            <div className="live-transcript">
              <span className="final">{transcript}</span>
            </div>
            <div className="audio-actions">
              <button className="btn-discard" onClick={reset}>Discard</button>
              <button className="btn-send" onClick={handleSendTranscript}>
                <Send size={18} /> Analyze
              </button>
            </div>
          </div>
        )}
      </div>
      <button className="btn-toggle-mode" onClick={() => setTextMode(true)}>
        <Keyboard size={16} /> Type instead
      </button>
    </div>
  );
}
