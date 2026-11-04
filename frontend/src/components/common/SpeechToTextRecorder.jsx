import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

/**
 * SpeechToTextRecorder
 * Converts doctor voice speech to editable clinical consultation notes using Web Speech API.
 * Handles microphone permissions, interim transcription, review before insertion, and fallback states.
 */
export const SpeechToTextRecorder = ({ onInsertText, initialText = '' }) => {
  const [isSupported, setIsSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [permissionError, setPermissionError] = useState(null);
  const [interimText, setInterimText] = useState('');

  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setPermissionError(null);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (final) {
        setTranscript((prev) => (prev ? `${prev} ${final.trim()}` : final.trim()));
      }
      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition event error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setPermissionError('Microphone access was denied. Please allow microphone permissions in your browser.');
      } else if (event.error === 'no-speech') {
        // No speech detected, keep listening or prompt user
      } else if (event.error === 'audio-capture') {
        setPermissionError('No microphone detected. Please connect an audio input device.');
      } else {
        setPermissionError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore abort errors during cleanup
        }
      }
    };
  }, []);

  const startListening = () => {
    setPermissionError(null);
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.warn('Could not start recognition:', err);
      // If already running, stop then start
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.warn('Could not stop recognition:', err);
    }
    setIsListening(false);
  };

  const handleInsert = () => {
    const fullText = (transcript + (interimText ? ' ' + interimText : '')).trim();
    if (fullText && onInsertText) {
      onInsertText(fullText);
      setTranscript('');
      setInterimText('');
    }
  };

  const handleClear = () => {
    setTranscript('');
    setInterimText('');
    setPermissionError(null);
  };

  if (!isSupported) {
    return (
      <div
        style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--color-warning-bg)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.85rem',
          color: '#92400e',
          marginBottom: '1rem',
        }}
      >
        <AlertCircle size={18} style={{ flexShrink: 0 }} />
        <div>
          <strong>Browser Speech Recognition Not Supported:</strong> Your current browser does not support the Web Speech API. Please type consultation notes manually or switch to Google Chrome / Edge.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-surface-hover)',
        padding: '1rem',
        marginBottom: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isListening ? '#ef4444' : '#94a3b8',
              animation: isListening ? 'pulse 1.5s infinite' : 'none',
            }}
          />
          <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-text-main)' }}>
            Speech-to-Text Dictation
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            ({isListening ? 'Listening...' : 'Ready for dictation'})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {!isListening ? (
            <button
              type="button"
              onClick={startListening}
              className="btn btn-outline btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderColor: 'var(--color-primary)',
                color: 'var(--color-primary)',
              }}
            >
              <Mic size={15} />
              <span>Start Voice Recording</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopListening}
              className="btn btn-danger btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#dc2626',
                color: '#ffffff',
              }}
            >
              <MicOff size={15} />
              <span>Stop Dictation</span>
            </button>
          )}

          {(transcript || interimText) && (
            <>
              <button
                type="button"
                onClick={handleInsert}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <CheckCircle size={15} />
                <span>Insert Into Notes</span>
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="btn btn-outline btn-sm"
                title="Clear transcript"
              >
                <RefreshCw size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {permissionError && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.82rem',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={16} />
          <span>{permissionError}</span>
        </div>
      )}

      {/* Real-time transcribed text review box */}
      {(transcript || interimText) ? (
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-sm)',
            border: '1px dashed var(--color-border)',
            fontSize: '0.88rem',
            lineHeight: 1.5,
            color: 'var(--color-text-main)',
            maxHeight: '120px',
            overflowY: 'auto',
          }}
        >
          <span>{transcript}</span>
          {interimText && (
            <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              {' '}{interimText}
            </span>
          )}
        </div>
      ) : (
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          Click "Start Voice Recording" to dictate patient examination findings, symptoms, or consultation notes. You can review and edit all text before saving.
        </div>
      )}
    </div>
  );
};
