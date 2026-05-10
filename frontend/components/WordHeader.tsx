"use client";

import { useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Phonetic } from "@/lib/types/dictionary";

interface WordHeaderProps {
  word: string;
  phonetics: Phonetic[];
}

export function WordHeader({ word, phonetics }: WordHeaderProps) {
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function playAudio(url: string) {
    if (playingUrl === url) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingUrl(url);
    audio.onended = () => setPlayingUrl(null);
    audio.onerror = () => setPlayingUrl(null);
    void audio.play();
  }

  const validPhonetics = phonetics.filter((p) => p.audio && p.audio.trim() !== "");
  const usPhonetic = validPhonetics.find((p) => p.audio?.match(/-us\.mp3$/));
  const ukPhonetic = validPhonetics.find((p) => p.audio?.match(/-uk\.mp3$/));

  const fallbackText = phonetics.find((p) => p.text)?.text;
  const usText = usPhonetic?.text || fallbackText;
  const ukText = ukPhonetic?.text || fallbackText;

  const renderPhonetics = () => {
    if (!phonetics || phonetics.length === 0) return null;

    // If neither US nor UK found, try a fallback audio
    if (!usPhonetic && !ukPhonetic) {
      const firstAudio = validPhonetics[0];
      return firstAudio ? (
        <div className="flex items-center gap-3 mt-2">
          {fallbackText && <span className="text-slate-500">{fallbackText}</span>}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs rounded-full px-3 gap-1.5"
            disabled={playingUrl === firstAudio.audio}
            onClick={() => playAudio(firstAudio.audio!)}
          >
            <Volume2 className={`h-3.5 w-3.5 ${playingUrl === firstAudio.audio ? "animate-pulse text-indigo-600" : ""}`} />
            Play
          </Button>
        </div>
      ) : fallbackText ? (
        <p className="text-slate-500 mt-1">{fallbackText}</p>
      ) : null;
    }

    // If both transcriptions match, group them on one line
    if (usText === ukText) {
      return (
        <div className="flex items-center gap-3 mt-2">
          {usText && <span className="text-slate-500">{usText}</span>}
          <div className="flex gap-2">
            {ukPhonetic && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs rounded-full px-3 gap-1.5"
                disabled={playingUrl === ukPhonetic.audio}
                onClick={() => playAudio(ukPhonetic.audio!)}
              >
                <Volume2 className={`h-3.5 w-3.5 ${playingUrl === ukPhonetic.audio ? "animate-pulse text-indigo-600" : ""}`} />
                🇬🇧
              </Button>
            )}
            {usPhonetic && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs rounded-full px-3 gap-1.5"
                disabled={playingUrl === usPhonetic.audio}
                onClick={() => playAudio(usPhonetic.audio!)}
              >
                <Volume2 className={`h-3.5 w-3.5 ${playingUrl === usPhonetic.audio ? "animate-pulse text-indigo-600" : ""}`} />
                🇺🇸
              </Button>
            )}
          </div>
        </div>
      );
    }

    // Different transcriptions — separate lines
    return (
      <div className="flex flex-col gap-2 mt-2">
        {ukPhonetic && (
          <div className="flex items-center gap-3">
            {ukText && <span className="text-slate-500">{ukText}</span>}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs rounded-full px-3 gap-1.5"
              disabled={playingUrl === ukPhonetic.audio}
              onClick={() => playAudio(ukPhonetic.audio!)}
            >
              <Volume2 className={`h-3.5 w-3.5 ${playingUrl === ukPhonetic.audio ? "animate-pulse text-indigo-600" : ""}`} />
              🇬🇧
            </Button>
          </div>
        )}
        {usPhonetic && (
          <div className="flex items-center gap-3">
            {usText && <span className="text-slate-500">{usText}</span>}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs rounded-full px-3 gap-1.5"
              disabled={playingUrl === usPhonetic.audio}
              onClick={() => playAudio(usPhonetic.audio!)}
            >
              <Volume2 className={`h-3.5 w-3.5 ${playingUrl === usPhonetic.audio ? "animate-pulse text-indigo-600" : ""}`} />
              🇺🇸
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <h2 className="font-heading text-4xl font-bold capitalize text-slate-800 tracking-tight">{word}</h2>
      {renderPhonetics()}
    </div>
  );
}
