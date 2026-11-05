import { apiClient } from './client';

export const dictationApi = {
  // Get AI4Bharat IndicWhisper configuration & metadata
  getDictationInfo: async () => {
    return apiClient.get('/dictation/info');
  },

  // Transcribe audio using AI4Bharat IndicWhisper ASR
  transcribeAudio: async (audioBlob, language = 'en-IN', mode = 'tanglish', rawText = '') => {
    const formData = new FormData();
    if (audioBlob) {
      formData.append('audio', audioBlob, 'dictation.webm');
    }
    if (rawText) {
      formData.append('raw_text', rawText);
    }
    formData.append('language', language);
    formData.append('mode', mode);

    return apiClient.post('/dictation/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Normalize Tanglish to clinical notes
  normalizeNotes: async (text) => {
    const formData = new FormData();
    formData.append('text', text);
    return apiClient.post('/dictation/normalize', formData);
  },
};

