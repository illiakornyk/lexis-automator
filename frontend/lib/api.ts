import { DictionaryEntry } from './types';
import { createClient } from './supabase';

// In Next.js, env variables prefixed with NEXT_PUBLIC_ are available in the browser.
// Fallback to localhost:3000 if not set in .env.local
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(response.status, errorData.message || response.statusText);
  }
  return response.json();
}

/**
 * Frontend API Client Abstraction
 */
export const LexisApi = {
  /**
   * Fetches definitions for a given word from the backend.
   */
  async getDefinition(word: string): Promise<DictionaryEntry[]> {
    const response = await fetch(`${API_BASE_URL}/dictionary/${encodeURIComponent(word)}`);
    return handleResponse<DictionaryEntry[]>(response);
  },

  /**
   * Generates an example sentence using the LLM via the backend.
   */
  async generateExample(word: string, definition: string, apiKey?: string | null): Promise<{ example: string }> {
    const response = await fetch(`${API_BASE_URL}/dictionary/example`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, definition, apiKey }),
    });
    return handleResponse<{ example: string }>(response);
  },

  /**
   * Generates MP3/WebM audio for a text string using Google TTS via the backend.
   */
  async generateAudio(text: string, accent: 'US' | 'GB' = 'US', gender: 'MALE' | 'FEMALE' = 'FEMALE'): Promise<{ audioBase64: string }> {
    const response = await fetch(`${API_BASE_URL}/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, accent, gender }),
    });
    return handleResponse<{ audioBase64: string }>(response);
  },

  /**
   * Exports selected definitions as an Anki .apkg deck via the backend.
   * Returns a Blob of the binary .apkg file.
   */
  async exportAnki(payload: {
    deckName: string;
    cards: Array<{
      word: string;
      partOfSpeech: string;
      phonetic: string;
      definition: string;
      example: string;
    }>;
    ttsSettings: { accent: string; gender: string };
    templates: Array<{
      name: string;
      is_cloze: boolean;
      qfmt: string;
      afmt: string;
    }>;
  }): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/export/anki`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData.message || 'Failed to generate Anki deck.');
    }
    return response.blob();
  },

  async exportDeck(payload: {
    deckId: string;
    templateIds: string[];
    ttsSettings: { accent: string; gender: string };
  }): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/export/deck`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData.message || 'Failed to export deck.');
    }
    return response.blob();
  },

  async exportDecksArchive(payload: {
    deckIds: string[];
    templateIds: string[];
    ttsSettings: { accent: string; gender: string };
  }): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/export/decks/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData.message || 'Failed to export archive.');
    }
    return response.blob();
  },
};
