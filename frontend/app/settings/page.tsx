"use client";

import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Save, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading, updateProfile } = useProfile();
  const router = useRouter();

  const [accent, setAccent] = useState('US');
  const [gender, setGender] = useState('FEMALE');
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load profile data into local state when it arrives
  useEffect(() => {
    if (!profileLoading) {
      setAccent(profile.default_tts_accent);
      setGender(profile.default_tts_gender);
      setApiKey(profile.openai_api_key || '');
    }
  }, [profile, profileLoading]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updateProfile({
      default_tts_accent: accent,
      default_tts_gender: gender,
      openai_api_key: apiKey.trim() === '' ? null : apiKey.trim(),
    });
    setIsSaving(false);
  };

  if (authLoading || profileLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-900">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
            Account Settings
          </h1>
        </div>

        <form onSubmit={handleSave} className="bg-neutral-800/50 p-8 rounded-2xl border border-neutral-700/50 backdrop-blur-xl space-y-8 shadow-2xl">
          
          {/* TTS Preferences Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-neutral-200 border-b border-neutral-700 pb-2">
              Default TTS Preferences
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">
                  Voice Accent
                </label>
                <select 
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="US">American English (US)</option>
                  <option value="GB">British English (GB)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">
                  Voice Gender
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer bg-neutral-900 px-4 py-3 rounded-lg border border-neutral-700 hover:border-blue-500/50 flex-1 transition-colors">
                    <input 
                      type="radio" 
                      name="gender" 
                      value="FEMALE" 
                      checked={gender === 'FEMALE'}
                      onChange={(e) => setGender(e.target.value)}
                      className="text-blue-500 focus:ring-blue-500 bg-neutral-800 border-neutral-600"
                    />
                    <span className="text-neutral-200">Female</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer bg-neutral-900 px-4 py-3 rounded-lg border border-neutral-700 hover:border-blue-500/50 flex-1 transition-colors">
                    <input 
                      type="radio" 
                      name="gender" 
                      value="MALE" 
                      checked={gender === 'MALE'}
                      onChange={(e) => setGender(e.target.value)}
                      className="text-blue-500 focus:ring-blue-500 bg-neutral-800 border-neutral-600"
                    />
                    <span className="text-neutral-200">Male</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Integrations Section */}
          <div className="space-y-6 pt-4">
            <h2 className="text-xl font-semibold text-neutral-200 border-b border-neutral-700 pb-2">
              Advanced Integrations
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                OpenAI API Key (Optional)
              </label>
              <input 
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-neutral-100 placeholder-neutral-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              <p className="mt-2 text-xs text-neutral-500">
                If provided, this key will be used to generate your example sentences instead of the global server key. Securely encrypted and isolated via Row Level Security.
              </p>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Preferences</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
