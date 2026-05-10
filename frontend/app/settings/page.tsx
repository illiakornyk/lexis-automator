"use client";

import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Save, Loader2, Volume2, Key, Globe, User, X, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LLM_PROVIDERS = [
  { value: 'openai',      label: 'OpenAI' },
  { value: 'anthropic',   label: 'Anthropic' },
  { value: 'gemini',      label: 'Google Gemini' },
  { value: 'openrouter',  label: 'OpenRouter' },
] as const;

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const {
    profile,
    isLoading: profileLoading,
    updateProfile,
    saveAiKey,
    deleteAiKey,
    saveGoogleTtsKey,
    deleteGoogleTtsKey,
  } = useProfile();
  const router = useRouter();

  const [accent, setAccent] = useState('US');
  const [gender, setGender] = useState('FEMALE');
  const [apiKey, setApiKey] = useState('');
  const [apiProvider, setApiProvider] = useState('openai');
  const [googleTtsKey, setGoogleTtsKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isDeletingKey, setIsDeletingKey] = useState(false);
  const [isSavingTtsKey, setIsSavingTtsKey] = useState(false);
  const [isDeletingTtsKey, setIsDeletingTtsKey] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!profileLoading) {
      setAccent(profile.default_tts_accent);
      setGender(profile.default_tts_gender);
      setApiProvider(profile.ai_provider ?? 'openai');
    }
  }, [profile, profileLoading]);

  const handleSaveVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updateProfile({ default_tts_accent: accent, default_tts_gender: gender });
    setIsSaving(false);
  };

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    setIsSavingKey(true);
    await saveAiKey(apiKey.trim(), apiProvider);
    setApiKey('');
    setIsSavingKey(false);
  };

  const handleDeleteKey = async () => {
    setIsDeletingKey(true);
    await deleteAiKey();
    setApiProvider('openai');
    setIsDeletingKey(false);
  };

  const handleSaveTtsKey = async () => {
    if (!googleTtsKey.trim()) return;
    setIsSavingTtsKey(true);
    await saveGoogleTtsKey(googleTtsKey.trim());
    setGoogleTtsKey('');
    setIsSavingTtsKey(false);
  };

  const handleDeleteTtsKey = async () => {
    setIsDeletingTtsKey(true);
    await deleteGoogleTtsKey();
    setIsDeletingTtsKey(false);
  };

  if (authLoading || profileLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-indigo-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">{user.email}</p>
        </div>

        {/* TTS Preferences */}
        <form onSubmit={handleSaveVoice} className="bg-white border rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b">
            <Volume2 className="h-4 w-4 text-indigo-600" />
            <h2 className="font-semibold text-slate-800">Voice preferences</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-slate-400" />
                Accent
              </Label>
              <Select value={accent} onValueChange={setAccent}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">🇺🇸 American English</SelectItem>
                  <SelectItem value="GB">🇬🇧 British English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                Gender
              </Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FEMALE">♀ Female</SelectItem>
                  <SelectItem value="MALE">♂ Male</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={isSaving} className="w-full h-12 text-base bg-indigo-600 hover:bg-indigo-700">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save preferences
          </Button>
        </form>

        {/* AI API Key */}
        <div className="bg-white border rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b">
            <Key className="h-4 w-4 text-indigo-600" />
            <h2 className="font-semibold text-slate-800">AI API key</h2>
            <span className="ml-auto text-xs text-slate-400 font-normal">Optional</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={apiProvider} onValueChange={setApiProvider}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LLM_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>API key</Label>
              {profile.has_ai_key && !apiKey ? (
                <div className="flex items-center gap-2">
                  <Input
                    value="••••••••••••••••••••••••"
                    readOnly
                    className="flex-1 text-slate-400 font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 border-red-200 text-red-500 hover:bg-red-50"
                    onClick={handleDeleteKey}
                    disabled={isDeletingKey}
                    title="Remove key"
                  >
                    {isDeletingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <Input
                  type="password"
                  placeholder="Paste your API key…"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  autoComplete="off"
                />
              )}
            </div>

            <p className="text-xs text-slate-400">
              When provided, your key is used for example sentence generation instead of the shared server key.
              Stored encrypted in Supabase Vault — never readable after saving.
            </p>
            <p className="text-xs text-slate-400">
              Supported providers:{' '}
              {LLM_PROVIDERS.map((p, i) => (
                <span key={p.value}>
                  <span className="text-slate-500 font-medium">{p.label}</span>
                  {i < LLM_PROVIDERS.length - 1 ? ', ' : '.'}
                </span>
              ))}
            </p>

            {apiKey && (
              <Button
                type="button"
                onClick={handleSaveKey}
                disabled={isSavingKey}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {isSavingKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                Save API key
              </Button>
            )}
          </div>
        </div>

        {/* Google TTS API Key */}
        <div className="bg-white border rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b">
            <Mic className="h-4 w-4 text-indigo-600" />
            <h2 className="font-semibold text-slate-800">Google TTS API key</h2>
            <span className="ml-auto text-xs text-slate-400 font-normal">Optional</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>API key</Label>
              {profile.has_google_tts_key && !googleTtsKey ? (
                <div className="flex items-center gap-2">
                  <Input
                    value="••••••••••••••••••••••••"
                    readOnly
                    className="flex-1 text-slate-400 font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 border-red-200 text-red-500 hover:bg-red-50"
                    onClick={handleDeleteTtsKey}
                    disabled={isDeletingTtsKey}
                    title="Remove key"
                  >
                    {isDeletingTtsKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <Input
                  type="password"
                  placeholder="Paste your Google Cloud API key…"
                  value={googleTtsKey}
                  onChange={(e) => setGoogleTtsKey(e.target.value)}
                  autoComplete="off"
                />
              )}
            </div>

            <p className="text-xs text-slate-400">
              When provided, your key is used for audio generation during Anki export instead of the shared server credentials.
              Stored encrypted in Supabase Vault — never readable after saving.
            </p>
            <p className="text-xs text-slate-400">
              Requires a Google Cloud API key with the <span className="text-slate-500 font-medium">Cloud Text-to-Speech API</span> enabled.
            </p>

            {googleTtsKey && (
              <Button
                type="button"
                onClick={handleSaveTtsKey}
                disabled={isSavingTtsKey}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {isSavingTtsKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}
                Save TTS key
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
