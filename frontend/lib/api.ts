import type { DictionaryEntry } from '@/lib/types/dictionary';
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
    const response = await fetch(`${API_BASE_URL}/dictionary/${encodeURIComponent(word)}`, {
      headers: { ...(await getAuthHeaders()) },
    });
    return handleResponse<DictionaryEntry[]>(response);
  },

  /**
   * Generates an example sentence using the LLM via the backend.
   */
  async generateExample(word: string, definition: string): Promise<{ example: string }> {
    const response = await fetch(`${API_BASE_URL}/ai/example`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify({ word, definition }),
    });
    return handleResponse<{ example: string }>(response);
  },

  /**
   * Generates MP3/WebM audio for a text string using Google TTS via the backend.
   */
  async generateAudio(text: string, accent: 'US' | 'GB' = 'US', gender: 'MALE' | 'FEMALE' = 'FEMALE'): Promise<{ audioBase64: string }> {
    const response = await fetch(`${API_BASE_URL}/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
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

  async searchImages(q: string, page = 1): Promise<Array<{ id: string; previewUrl: string; webformatUrl: string }>> {
    const params = new URLSearchParams({ q, page: String(page) });
    const response = await fetch(`${API_BASE_URL}/images/search?${params}`, {
      headers: { ...(await getAuthHeaders()) },
    });
    return handleResponse(response);
  },

  async saveImageFromUrl(cardId: string, url: string): Promise<{ imagePath: string }> {
    const response = await fetch(`${API_BASE_URL}/images/save-from-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify({ cardId, url }),
    });
    return handleResponse(response);
  },

  async uploadImage(cardId: string, file: File): Promise<{ imagePath: string }> {
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(`${API_BASE_URL}/images/upload/${encodeURIComponent(cardId)}`, {
      method: 'POST',
      headers: { ...(await getAuthHeaders()) },
      body: form,
    });
    return handleResponse(response);
  },

  async removeImage(cardId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/images/${encodeURIComponent(cardId)}`, {
      method: 'DELETE',
      headers: { ...(await getAuthHeaders()) },
    });
    await handleResponse(response);
  },

  async getImageSignedUrl(storagePath: string): Promise<string> {
    const params = new URLSearchParams({ path: storagePath });
    const response = await fetch(`${API_BASE_URL}/images/signed-url?${params}`, {
      headers: { ...(await getAuthHeaders()) },
    });
    const data = await handleResponse<{ url: string }>(response);
    return data.url;
  },

  // --- Export Jobs ---

  async createExportJobs(payload: {
    deckIds: string[];
    templateIds: string[];
    accent: string;
    gender: string;
  }): Promise<ExportJob[]> {
    const response = await fetch(`${API_BASE_URL}/export-jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  async getExportJobs(): Promise<ExportJob[]> {
    const response = await fetch(`${API_BASE_URL}/export-jobs`, {
      headers: { ...(await getAuthHeaders()) },
    });
    return handleResponse(response);
  },

  async getExportJobDownloadUrl(jobId: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/export-jobs/${jobId}/download`, {
      headers: { ...(await getAuthHeaders()) },
    });
    const data = await handleResponse<{ url: string }>(response);
    return data.url;
  },

  async deleteExportJob(jobId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/export-jobs/${jobId}`, {
      method: 'DELETE',
      headers: { ...(await getAuthHeaders()) },
    });
    if (response.status !== 204) await handleResponse(response);
  },
};

export interface ExportJob {
  id: string;
  deck_id: string | null;
  deck_name: string;
  status: 'pending' | 'processing' | 'done' | 'failed' | 'cancelled';
  error_message: string | null;
  attempts: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string;
}
