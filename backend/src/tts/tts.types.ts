import { Accent, Gender } from './dto/generate-tts.dto';

const VOICE_MAP: Record<Accent, Record<Gender, string>> = {
  [Accent.US]: {
    [Gender.FEMALE]: 'en-US-Journey-F',
    [Gender.MALE]: 'en-US-Journey-D',
  },
  [Accent.GB]: {
    [Gender.FEMALE]: 'en-GB-Journey-F',
    [Gender.MALE]: 'en-GB-Journey-D',
  },
};

const LANGUAGE_CODE: Record<Accent, string> = {
  [Accent.US]: 'en-US',
  [Accent.GB]: 'en-GB',
};

export function resolveVoice(
  accent: Accent,
  gender: Gender,
): { name: string; languageCode: string } {
  return {
    name: VOICE_MAP[accent][gender],
    languageCode: LANGUAGE_CODE[accent],
  };
}
