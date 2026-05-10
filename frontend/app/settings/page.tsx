"use client";

import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Save, Loader2, Volume2, Key, Globe, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading, updateProfile } = useProfile();
  const router = useRouter();

  const [accent, setAccent] = useState('US');
  const [gender, setGender] = useState('FEMALE');
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

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

        <form onSubmit={handleSave} className="space-y-4">

          {/* TTS Preferences */}
          <div className="bg-white border rounded-xl p-6 space-y-5">
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
          </div>

          {/* API Key */}
          <div className="bg-white border rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b">
              <Key className="h-4 w-4 text-indigo-600" />
              <h2 className="font-semibold text-slate-800">AI API key</h2>
              <span className="ml-auto text-xs text-slate-400 font-normal">Optional</span>
            </div>

            <div className="space-y-1.5">
              <Input
                type="password"
                placeholder="API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-slate-400">
                When provided, your key is used for example sentence generation instead of the shared server key.
                Stored encrypted and isolated by Row Level Security.
              </p>
              <p className="text-xs text-slate-400">
                Supported providers: <span className="text-slate-500 font-medium">OpenAI</span>, <span className="text-slate-500 font-medium">Anthropic</span>, <span className="text-slate-500 font-medium">Google Gemini</span>, <span className="text-slate-500 font-medium">OpenRouter</span>.
              </p>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSaving}
            className="w-full h-12 text-base bg-indigo-600 hover:bg-indigo-700"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save preferences
          </Button>

        </form>
      </div>
    </div>
  );
}
