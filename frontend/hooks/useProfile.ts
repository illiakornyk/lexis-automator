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
          .select('id, default_tts_accent, default_tts_gender, ai_key_id, ai_provider')
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

  return {
    profile,
    isLoading,
    updateProfile,
    saveAiKey,
    deleteAiKey,
  };
}
