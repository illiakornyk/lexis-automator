"use client";

import { useState, useRef } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Phonetic } from "@/lib/types";

interface WordHeaderProps {
  word: string;
  phonetics: Phonetic[];
}

export function WordHeader({ word, phonetics }: WordHeaderProps) {
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = (url: string) => {
    if (playingUrl) return;

    setPlayingUrl(url);
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onended = () => {
      setPlayingUrl(null);
      audioRef.current = null;
    };

    audio.onerror = () => {
      setPlayingUrl(null);
      audioRef.current = null;
    };

    audio.play().catch(() => {
      setPlayingUrl(null);
      audioRef.current = null;
    });
  };
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
          {fallbackText && <span className="text-stone-500">{fallbackText}</span>}
          <Button variant="outline" size="sm" className="h-7 text-xs rounded-full px-3 border-stone-300 text-stone-500 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => playAudio(firstAudio.audio!)} disabled={playingUrl !== null}>
            Play <Volume2 className="ml-1 h-3 w-3" />
          </Button>
        </div>
      ) : fallbackText ? (
        <p className="text-stone-500 mt-1">{fallbackText}</p>
      ) : null;
    }

    // If both transcriptions match, group them on one line
    if (usText === ukText) {
      return (
        <div className="flex items-center gap-3 mt-2">
          {usText && <span className="text-stone-500">{usText}</span>}
          <div className="flex gap-2">
            {ukPhonetic && (
              <Button variant="outline" size="sm" className="h-7 text-xs rounded-full px-3 border-stone-300 text-stone-500 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => playAudio(ukPhonetic.audio!)} disabled={playingUrl !== null}>
                🇬🇧 UK <Volume2 className="ml-1 h-3 w-3" />
              </Button>
            )}
            {usPhonetic && (
              <Button variant="outline" size="sm" className="h-7 text-xs rounded-full px-3 border-stone-300 text-stone-500 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => playAudio(usPhonetic.audio!)} disabled={playingUrl !== null}>
                🇺🇸 US <Volume2 className="ml-1 h-3 w-3" />
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
            {ukText && <span className="text-stone-500">{ukText}</span>}
            <Button variant="outline" size="sm" className="h-7 text-xs rounded-full px-3 border-stone-300 text-stone-500 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => playAudio(ukPhonetic.audio!)} disabled={playingUrl !== null}>
              🇬🇧 UK <Volume2 className="ml-1 h-3 w-3" />
            </Button>
          </div>
        )}
        {usPhonetic && (
          <div className="flex items-center gap-3">
            {usText && <span className="text-stone-500">{usText}</span>}
            <Button variant="outline" size="sm" className="h-7 text-xs rounded-full px-3 border-stone-300 text-stone-500 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => playAudio(usPhonetic.audio!)} disabled={playingUrl !== null}>
              🇺🇸 US <Volume2 className="ml-1 h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <h2 className="font-heading text-4xl font-bold capitalize text-stone-900 tracking-tight">{word}</h2>
      {renderPhonetics()}
    </div>
  );
}
