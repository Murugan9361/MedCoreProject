import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Sparkles,
  Globe,
  Copy,
  Check,
  Cpu,
  Radio,
  FileCheck2,
} from 'lucide-react';
import { dictationApi } from '../../api/dictation';

/**
 * Tanglish and Indian Clinical Speech Normalizer Dictionary
 * Maps common Tanglish, Tamil, and Indian colloquial medical terms into professional clinical documentation.
 */
const TANGLISH_MEDICAL_MAP = [
  // Symptoms & Complaints
  { pattern: /\b(thala vali|thalavali|thala valikuthu|thalavalli|தலைவலி)\b/gi, replacement: 'headache' },
  { pattern: /\b(kaachal|kaichal|fever irukku|காய்ச்சல்)\b/gi, replacement: 'fever' },
  { pattern: /\b(vayiru vali|vaiyiru vali|stomach pain|வயிற்று வலி)\b/gi, replacement: 'abdominal pain' },
  { pattern: /\b(vaanthi|vomiting irukku|வாந்தி)\b/gi, replacement: 'vomiting' },
  { pattern: /\b(mayakkam|mayakkama irukku|giddiness|மயக்கம்)\b/gi, replacement: 'dizziness/giddiness' },
  { pattern: /\b(nenju vali|chest pain irukku|நெஞ்சு வலி)\b/gi, replacement: 'chest pain' },
  { pattern: /\b(muttu vali|muttuvalli|knee pain)\b/gi, replacement: 'knee joint pain' },
  { pattern: /\b(kaal vali|kal vali|leg pain)\b/gi, replacement: 'leg pain' },
  { pattern: /\b(udambu vali|body pain|udal vali)\b/gi, replacement: 'generalized body ache/myalgia' },
  { pattern: /\b(irumal|erumal|cough irukku|இருமல்)\b/gi, replacement: 'cough' },
  { pattern: /\b(sali|thondai vali|sali pidichirukku|throat pain|சளி)\b/gi, replacement: 'cold and sore throat' },
  { pattern: /\b(moochu vida kashtam|moochu thinaral|breathlessness)\b/gi, replacement: 'dyspnea/shortness of breath' },
  { pattern: /\b(arippu|saruma arippu|skin itching|itching)\b/gi, replacement: 'pruritus/skin itching' },
  { pattern: /\b(thookam varala|thookam illa|sleep issue)\b/gi, replacement: 'insomnia/sleep disturbance' },
  { pattern: /\b(loose motion|bhedi|diarrhoea)\b/gi, replacement: 'loose stools/diarrhea' },
  { pattern: /\b(pasikavilla|pasi illa|loss of appetite)\b/gi, replacement: 'anorexia/loss of appetite' },

  // Timing & Duration
  { pattern: /\b(\d+)\s*(days?|naal|naala|nala)\s*(ah|irukku|aachu)?\b/gi, replacement: 'for $1 days' },
  { pattern: /\b(kaalaila|morning|kaalai)\b/gi, replacement: 'morning' },
  { pattern: /\b(madhiyam|afternoon|noon)\b/gi, replacement: 'afternoon' },
  { pattern: /\b(iravu|night)\b/gi, replacement: 'night' },
  { pattern: /\b(saptu aparam|saapattu pin|after food|food ku aparam)\b/gi, replacement: 'after food (postprandial)' },
  { pattern: /\b(verum vayiru|saapattu mun|before food|empty stomach)\b/gi, replacement: 'before food (preprandial)' },
  { pattern: /\b(daily|thinamum)\s*(\d+)\s*(neram|time|times)\b/gi, replacement: '$2 times daily' },
  { pattern: /\b(adutha vaaram|next week|adutha maasam)\s*(vaanga|checkup)\b/gi, replacement: 'follow-up review scheduled' },

  // Clinical Investigations & Vitals
  { pattern: /\b(sugar test|raththa sugar|rbs|fbs)\b/gi, replacement: 'blood glucose evaluation' },
  { pattern: /\b(raththa test|blood test|lab test)\b/gi, replacement: 'blood investigations' },
  { pattern: /\b(bp normal|bp normal ah irukku|bp pathachu)\b/gi, replacement: 'blood pressure within normal limits' },
  { pattern: /\b(sugar adhigam|sugar high ah irukku)\b/gi, replacement: 'elevated blood glucose' },

  // Medical Acronyms Normalization
  { pattern: /\b\b(bp|b\.p\.)\b/gi, replacement: 'BP' },
  { pattern: /\b(ecg|e\.c\.g\.)\b/gi, replacement: 'ECG' },
  { pattern: /\b(cbc|c\.b\.c\.)\b/gi, replacement: 'CBC' },
  { pattern: /\b(mri)\b/gi, replacement: 'MRI' },
  { pattern: /\b(ct scan|ct)\b/gi, replacement: 'CT Scan' },
  { pattern: /\b(spo2|sp o2)\b/gi, replacement: 'SpO2' },
  { pattern: /\b(prn|sos|s\.o\.s\.)\b/gi, replacement: 'SOS' },
  { pattern: /\b(bd|b\.i\.d\.)\b/gi, replacement: 'BD (twice daily)' },
  { pattern: /\b(tid|t\.i\.d\.)\b/gi, replacement: 'TID (thrice daily)' },
  { pattern: /\b(od|o\.d\.)\b/gi, replacement: 'OD (once daily)' },
  { pattern: /\b(hba1c|hb a1c)\b/gi, replacement: 'HbA1c' },
  { pattern: /\b(mg|m\.g\.)\b/gi, replacement: 'mg' },
  { pattern: /\b(ml|m\.l\.)\b/gi, replacement: 'ml' },
];

export function normalizeTanglishToClinical(text) {
  if (!text) return '';
  let normalized = text;

  TANGLISH_MEDICAL_MAP.forEach(({ pattern, replacement }) => {
    normalized = normalized.replace(pattern, replacement);
  });

  normalized = normalized.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, prefix, char) => {
    return prefix + char.toUpperCase();
  });

  normalized = normalized
    .replace(/\s+full stop\b/gi, '.')
    .replace(/\s+period\b/gi, '.')
    .replace(/\s+comma\b/gi, ',')
    .replace(/\s+colon\b/gi, ':')
    .replace(/\s+next line\b/gi, '\n')
    .replace(/\s+new line\b/gi, '\n');

  return normalized.trim();
}

const SUPPORTED_LANGUAGES = [
  { code: 'tanglish', label: 'Tanglish (Tamil + English)', flag: '🗣️', tip: 'AI4Bharat IndicWhisper Tamil-English code-switching' },
  { code: 'en-IN', label: 'Indian English', flag: '🇮🇳', tip: 'AI4Bharat IndicASR Indian accent model' },
  { code: 'ta-IN', label: 'தமிழ் (Tamil)', flag: '🇮🇳', tip: 'AI4Bharat IndicWhisper native Tamil speech' },
  { code: 'en-US', label: 'US English', flag: '🌐', tip: 'Standard English' },
];

export const SpeechToTextRecorder = ({ onInsertText, initialText = '' }) => {
  const [isSupported, setIsSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribingAI, setIsTranscribingAI] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [selectedLang, setSelectedLang] = useState('tanglish');
  const [engineMode, setEngineMode] = useState('indicwhisper'); // 'indicwhisper' | 'browser'
  const [permissionError, setPermissionError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);

  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Initialize Speech Recognition for Live Streaming Preview
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
    recognition.maxAlternatives = 2;

    recognition.lang = selectedLang === 'tanglish' ? 'en-IN' : selectedLang;

    recognition.onstart = () => {
      setIsListening(true);
      setPermissionError(null);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          final += item[0].transcript + ' ';
        } else {
          interim += item[0].transcript;
        }
      }

      if (final) {
        let cleaned = final.trim();
        if (selectedLang === 'tanglish') {
          cleaned = normalizeTanglishToClinical(cleaned);
        }
        setTranscript((prev) => (prev ? `${prev} ${cleaned}` : cleaned));
      }
      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition status:', event.error);
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setPermissionError('Microphone permission was denied. Please allow microphone access in your browser settings.');
        shouldListenRef.current = false;
        setIsListening(false);
        stopAudioMonitoring();
      } else if (event.error === 'no-speech') {
        // Handled silently by keepalive
      } else if (event.error !== 'aborted') {
        setPermissionError(`Speech engine notice: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          setTimeout(() => {
            if (shouldListenRef.current) {
              try {
                recognition.start();
              } catch {
                setIsListening(false);
              }
            }
          }, 150);
        }
      } else {
        setIsListening(false);
        setInterimText('');
        stopAudioMonitoring();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      stopAudioMonitoring();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
    };
  }, [selectedLang]);

  // Audio level monitoring via Web Audio API + MediaRecorder capture
  const startAudioMonitoringAndRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 1. Audio level analyser
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((average / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // 2. High-quality MediaRecorder for AI4Bharat IndicWhisper
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : '',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250); // Slice every 250ms
    } catch (err) {
      console.warn('Microphone stream error:', err);
      setPermissionError('Could not access microphone. Please verify browser permissions.');
    }
  };

  const stopAudioMonitoring = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {
        // Ignore
      }
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  const startListening = async () => {
    setPermissionError(null);
    shouldListenRef.current = true;

    await startAudioMonitoringAndRecording();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {
        try {
          recognitionRef.current.stop();
          setTimeout(() => {
            if (shouldListenRef.current) recognitionRef.current.start();
          }, 100);
        } catch (e) {
          console.warn('Recognition start retry:', e);
        }
      }
    }
  };

  const stopListening = async () => {
    shouldListenRef.current = false;

    // Stop browser recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Recognition stop error:', err);
      }
    }

    // Stop MediaRecorder and trigger AI4Bharat IndicWhisper processing
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsTranscribingAI(true);

      setTimeout(async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const currentText = (transcript + (interimText ? ' ' + interimText : '')).trim();

          const res = await dictationApi.transcribeAudio(
            audioBlob,
            selectedLang,
            'tanglish',
            currentText
          );

          if (res?.text) {
            setTranscript(res.text);
          } else if (currentText) {
            setTranscript(normalizeTanglishToClinical(currentText));
          }
        } catch (err) {
          console.warn('AI4Bharat transcription notice:', err);
          // Fall back to local normalization if server pipeline is standalone
          setTranscript((prev) => normalizeTanglishToClinical(prev));
        } finally {
          setIsTranscribingAI(false);
          stopAudioMonitoring();
        }
      }, 350);
    } else {
      stopAudioMonitoring();
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

  const handleCopy = () => {
    const fullText = (transcript + (interimText ? ' ' + interimText : '')).trim();
    if (fullText) {
      navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConvertToClinical = async () => {
    setIsNormalizing(true);
    try {
      const res = await dictationApi.normalizeNotes(transcript);
      if (res?.formatted_text) {
        setTranscript(res.formatted_text);
      } else {
        setTranscript(normalizeTanglishToClinical(transcript));
      }
    } catch {
      setTranscript(normalizeTanglishToClinical(transcript));
    } finally {
      setIsNormalizing(false);
    }
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
          <strong>Browser Speech Recognition Not Supported:</strong> Open in Google Chrome, Edge, or Chromium for full AI4Bharat IndicWhisper dictation support.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg, 12px)',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
      }}
    >
      {/* Top Bar: Title, Engine Badge, Dialect Selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '0.85rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              position: 'relative',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: isListening ? '#ef4444' : '#0d9488',
              boxShadow: isListening ? '0 0 0 3px rgba(239, 68, 68, 0.25)' : 'none',
              transition: 'all 0.2s ease',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-navy, #0f172a)' }}>
                Speech-to-Text Clinical Dictation
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <Cpu size={11} />
                AI4Bharat IndicWhisper v2
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {isListening
                ? `Recording live • Neural processing active (${SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang)?.label})`
                : isTranscribingAI
                ? '✨ AI4Bharat IndicWhisper is compiling medical notes...'
                : 'Zero-latency Indian English, Tanglish, and Tamil clinical dictation'}
            </div>
          </div>
        </div>

        {/* Language / Dialect Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginRight: '0.2rem' }}>
            DIALECT:
          </span>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              disabled={isListening}
              onClick={() => setSelectedLang(lang.code)}
              className={`btn btn-sm ${selectedLang === lang.code ? 'btn-primary' : 'btn-outline'}`}
              style={{
                fontSize: '0.78rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '20px',
                opacity: isListening && selectedLang !== lang.code ? 0.6 : 1,
              }}
              title={lang.tip}
            >
              <span>{lang.flag}</span>
              <span style={{ marginLeft: '0.3rem' }}>{lang.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Control Buttons & Audio Visualizer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {!isListening ? (
            <button
              type="button"
              onClick={startListening}
              disabled={isTranscribingAI}
              className="btn btn-primary btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: 'var(--color-primary)',
                fontWeight: 600,
                boxShadow: '0 2px 4px rgba(13, 148, 136, 0.2)',
              }}
            >
              <Mic size={16} />
              <span>Start Dictation</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopListening}
              className="btn btn-danger btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontWeight: 600,
                animation: 'pulse 1.8s infinite',
              }}
            >
              <MicOff size={16} />
              <span>Stop & Transcribe</span>
            </button>
          )}

          {/* Real-time Voice Audio Wave Bars */}
          {isListening && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                height: '24px',
                padding: '0 0.5rem',
                backgroundColor: '#f1f5f9',
                borderRadius: '6px',
              }}
              title="Microphone input volume level"
            >
              {[15, 30, 50, 75, 45, 60, 25].map((factor, i) => {
                const height = Math.max(4, Math.min(20, Math.round((audioLevel * factor) / 40)));
                return (
                  <div
                    key={i}
                    style={{
                      width: '3px',
                      height: `${height}px`,
                      backgroundColor: audioLevel > 10 ? '#0d9488' : '#cbd5e1',
                      borderRadius: '2px',
                      transition: 'height 0.08s ease',
                    }}
                  />
                );
              })}
              <span style={{ fontSize: '0.72rem', color: '#0d9488', fontWeight: 700, marginLeft: '4px' }}>
                INDICWHISPER LIVE
              </span>
            </div>
          )}

          {isTranscribingAI && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#0284c7' }}>
              <RefreshCw size={14} className="animate-spin" />
              <span>AI4Bharat neural post-processing...</span>
            </div>
          )}
        </div>

        {/* Action Buttons for Transcription */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(transcript || interimText) && (
            <>
              {/* Tanglish to Clinical English Normalizer */}
              <button
                type="button"
                onClick={handleConvertToClinical}
                disabled={isNormalizing}
                className="btn btn-outline btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  borderColor: '#8b5cf6',
                  color: '#7c3aed',
                  backgroundColor: '#f5f3ff',
                }}
                title="AI4Bharat Clinical Normalizer: Automatically maps Tanglish and colloquial terms into formal clinical documentation"
              >
                <Sparkles size={14} />
                <span>{isNormalizing ? 'Formatting...' : 'Convert to Medical English'}</span>
              </button>

              <button
                type="button"
                onClick={handleInsert}
                className="btn btn-primary btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: '#0d9488',
                  borderColor: '#0d9488',
                }}
              >
                <CheckCircle size={15} />
                <span>Insert Into Notes</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="btn btn-outline btn-sm"
                title="Copy transcript to clipboard"
              >
                {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
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

      {/* Permission Alerts */}
      {permissionError && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: 'var(--radius-sm, 6px)',
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
            position: 'relative',
            padding: '0.85rem 1rem',
            backgroundColor: '#f8fafc',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border)',
            fontSize: '0.92rem',
            lineHeight: 1.6,
            color: 'var(--color-text-main)',
            minHeight: '65px',
            maxHeight: '160px',
            overflowY: 'auto',
          }}
        >
          <span style={{ fontWeight: 500 }}>{transcript}</span>
          {interimText && (
            <span style={{ color: '#0d9488', fontStyle: 'italic', opacity: 0.85 }}>
              {' '}{interimText}
            </span>
          )}
        </div>
      ) : (
        <div
          style={{
            padding: '0.65rem 0.85rem',
            backgroundColor: '#f8fafc',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px dashed var(--color-border)',
            fontSize: '0.8rem',
            color: 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <span>
            🎙️ <strong>AI4Bharat IndicWhisper Ready:</strong> Click <em>"Start Dictation"</em> and speak in <strong>Tanglish</strong>, <strong>Indian English</strong>, or <strong>Tamil</strong>.
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Tanglish code-switching + auto-punctuation supported hands-free.
          </span>
        </div>
      )}
    </div>
  );
};
