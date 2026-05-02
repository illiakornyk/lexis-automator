import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';

export interface UserProfile {
  id: string;
  default_tts_accent: string;
  default_tts_gender: string;
  openai_api_key: string | null;
}

const DEFAULT_PROFILE: UserProfile = {
  id: '',
  default_tts_accent: 'US',
  default_tts_gender: 'FEMALE',
  openai_api_key: null,
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
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          // If the profile doesn't exist yet (trigger might have been delayed), 
          // we can gracefully handle it or retry.
          if (error.code !== 'PGRST116') {
             console.error('Error loading profile:', error);
          }
          setProfile({ ...DEFAULT_PROFILE, id: user.id });
        } else if (data) {
          setProfile(data as UserProfile);
        }
      } catch (err) {
        console.error('Error in loadProfile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user, authLoading, supabase]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;

    // Optimistic UI update
    const previousProfile = profile;
    setProfile(prev => ({ ...prev, ...updates }));

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          ...profile,
          ...updates,
          id: user.id,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success('Settings saved successfully!');
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      toast.error('Failed to save settings.');
      // Revert optimistic update
      setProfile(previousProfile);
    }
  };

  return {
    profile,
    isLoading,
    updateProfile,
  };
}
