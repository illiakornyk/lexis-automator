import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';

export interface UserProfile {
  id: string;
  default_tts_accent: string;
  default_tts_gender: string;
  has_ai_key: boolean;
  ai_provider: string | null;
  has_google_tts_key: boolean;
}

export interface UpdateProfilePayload {
  default_tts_accent?: string;
  default_tts_gender?: string;
}

const DEFAULT_PROFILE: UserProfile = {
  id: '',
  default_tts_accent: 'US',
  default_tts_gender: 'FEMALE',
  has_ai_key: false,
  ai_provider: null,
  has_google_tts_key: false,
};

export function useProfile() {
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (authLoading) return;

    const loadProfile = async () => {
      if (!user) {
        setProfile(DEFAULT_PROFILE);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, default_tts_accent, default_tts_gender, ai_key_id, ai_provider, google_tts_key_id')
          .eq('id', user.id)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') {
            console.error('Error loading profile:', error);
          }
          setProfile({ ...DEFAULT_PROFILE, id: user.id });
        } else if (data) {
          setProfile({
            id: data.id,
            default_tts_accent: data.default_tts_accent,
            default_tts_gender: data.default_tts_gender,
            has_ai_key: data.ai_key_id !== null,
            ai_provider: data.ai_provider,
            has_google_tts_key: data.google_tts_key_id !== null,
          });
        }
      } catch (err) {
        console.error('Error in loadProfile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user, authLoading, supabase]);

  const updateProfile = async (updates: UpdateProfilePayload) => {
    if (!user) return;

    const previousProfile = profile;
    setProfile(prev => ({ ...prev, ...updates }));

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Settings saved.');
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast.error('Failed to save settings.');
      setProfile(previousProfile);
    }
  };

  const saveAiKey = async (keyValue: string, provider: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('upsert_ai_key', {
        key_value: keyValue,
        key_provider: provider,
      });
      if (error) throw error;
      setProfile(prev => ({ ...prev, has_ai_key: true, ai_provider: provider }));
      toast.success('API key saved securely.');
    } catch (err) {
      console.error('Failed to save AI key:', err);
      toast.error('Failed to save API key.');
    }
  };

  const deleteAiKey = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('delete_ai_key');
      if (error) throw error;
      setProfile(prev => ({ ...prev, has_ai_key: false, ai_provider: null }));
      toast.success('API key removed.');
    } catch (err) {
      console.error('Failed to delete AI key:', err);
      toast.error('Failed to remove API key.');
    }
  };

  const saveGoogleTtsKey = async (keyValue: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('upsert_google_tts_key', {
        key_value: keyValue,
      });
      if (error) throw error;
      setProfile(prev => ({ ...prev, has_google_tts_key: true }));
      toast.success('Google TTS key saved securely.');
    } catch (err) {
      console.error('Failed to save Google TTS key:', err);
      toast.error('Failed to save Google TTS key.');
    }
  };

  const deleteGoogleTtsKey = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('delete_google_tts_key');
      if (error) throw error;
      setProfile(prev => ({ ...prev, has_google_tts_key: false }));
      toast.success('Google TTS key removed.');
    } catch (err) {
      console.error('Failed to delete Google TTS key:', err);
      toast.error('Failed to remove Google TTS key.');
    }
  };

  return {
    profile,
    isLoading,
    updateProfile,
    saveAiKey,
    deleteAiKey,
    saveGoogleTtsKey,
    deleteGoogleTtsKey,
  };
}
