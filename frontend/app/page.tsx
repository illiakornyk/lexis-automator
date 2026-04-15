"use client";

import React, { useState } from "react";
import { Search, Download, FileAudio, RefreshCw, CheckCircle2, BookOpen, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { LexisApi } from "@/lib/api";
import { DictionaryEntry, Meaning } from "@/lib/types";

export default function LexisAutomatorUI() {
  const [searchQuery, setSearchQuery] = useState("");
  const [wordData, setWordData] = useState<DictionaryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDefs, setSelectedDefs] = useState<string[]>([]);
  
  const [accent, setAccent] = useState("US");
  const [gender, setGender] = useState("FEMALE");

  const toggleSelection = (id: string) => {
    setSelectedDefs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setWordData(null);
    setSelectedDefs([]); // Clear selections on new search

    try {
      const data = await LexisApi.getDefinition(searchQuery.trim());
      if (data && data.length > 0) {
        setWordData(data[0]);
      } else {
        toast.error("No definitions found for this word.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch word definition.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    toast.success("Downloading Anki package logic not yet implemented!");
  };

  // Helper to color-code part of speech badges
  const getPosBadgeColor = (pos: string) => {
    switch (pos.toLowerCase()) {
      case "noun": return "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200";
      case "verb": return "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200";
      case "adjective": return "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200";
      case "adverb": return "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32">
      {/* HEADER SECTION */}
      <header className="bg-white border-b py-6 px-4 md:px-8 mb-8 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 rounded-md p-2 flex items-center justify-center">
              <CheckCircle2 color="white" size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-indigo-900">Lexis Automator</h1>
          </div>
          
          <form onSubmit={handleSearch} className="flex relative w-full md:w-96">
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search a word (e.g., hello)..." 
              className="pr-12 shadow-sm rounded-full bg-slate-50"
              disabled={isLoading}
            />
            <Button disabled={isLoading} type="submit" size="icon" className="absolute right-0 top-0 rounded-l-none rounded-r-full">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-4xl mx-auto px-4 md:px-8 space-y-8">
        
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-6">
            <Skeleton className="h-12 w-48 rounded" />
            <Skeleton className="h-6 w-32 rounded" />
            <div className="space-y-4 pt-4">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          </div>
        )}

        {!isLoading && !wordData && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <BookOpen className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600">No Word Selected</h3>
            <p className="text-slate-500">Search for a word above to see its definitions.</p>
          </div>
        )}

        {/* RESULTS AREA */}
        {!isLoading && wordData && (
          <>
            {/* WORD HEADER */}
            <div>
              <h2 className="text-4xl font-extrabold capitalize text-slate-800 tracking-tight">{wordData.word}</h2>
              
              {/* Dynamic Phonetics Rendering */}
              {(() => {
                if (!wordData.phonetics || wordData.phonetics.length === 0) return null;
                
                const validPhonetics = wordData.phonetics.filter(p => p.audio && p.audio.trim() !== "");
                const usPhonetic = validPhonetics.find(p => p.audio?.match(/-us\.mp3$/));
                const ukPhonetic = validPhonetics.find(p => p.audio?.match(/-uk\.mp3$/));
                
                const playAudio = (url: string) => new Audio(url).play();

                const fallbackText = wordData.phonetics.find(p => p.text)?.text;
                const usText = usPhonetic?.text || fallbackText;
                const ukText = ukPhonetic?.text || fallbackText;

                // If neither US nor UK found BUT there's a fallback audio
                if (!usPhonetic && !ukPhonetic) {
                   const firstAudio = validPhonetics[0];
                   return firstAudio ? (
                     <div className="flex items-center gap-3 mt-2">
                       {fallbackText && <span className="text-slate-500">{fallbackText}</span>}
                       <Button variant="outline" size="sm" className="h-7 text-xs rounded-full px-3" onClick={() => playAudio(firstAudio.audio!)}>
                         Play <Volume2 className="ml-1 h-3 w-3"/>
                       </Button>
                     </div>
                   ) : fallbackText ? (
                     <p className="text-slate-500 mt-1">{fallbackText}</p>
                   ) : null;
                }

                // If text is exactly the same or missing, group them.
                if (usText === ukText) {
                  return (
                    <div className="flex items-center gap-3 mt-2">
                      {usText && <span className="text-slate-500">{usText}</span>}
                      <div className="flex gap-2">
                        {ukPhonetic && (
                          <Button variant="outline" size="sm" className="h-7 text-xs rounded-full px-3" onClick={() => playAudio(ukPhonetic.audio!)}>
                            UK <Volume2 className="ml-1 h-3 w-3"/>
                          </Button>
                        )}
                        {usPhonetic && (
                          <Button variant="outline" size="sm" className="h-7 text-xs rounded-full px-3" onClick={() => playAudio(usPhonetic.audio!)}>
                            US <Volume2 className="ml-1 h-3 w-3"/>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                }

                // Different transcriptions, render separate lines
                return (
                  <div className="flex flex-col gap-2 mt-2">
                    {ukPhonetic && (
                      <div className="flex items-center gap-3">
                        {ukText && <span className="text-slate-500">{ukText}</span>}
                        <Button variant="outline" size="sm" className="h-7 text-xs rounded-full px-3" onClick={() => playAudio(ukPhonetic.audio!)}>
                          UK <Volume2 className="ml-1 h-3 w-3"/>
                        </Button>
                      </div>
                    )}
                    {usPhonetic && (
                      <div className="flex items-center gap-3">
                        {usText && <span className="text-slate-500">{usText}</span>}
                        <Button variant="outline" size="sm" className="h-7 text-xs rounded-full px-3" onClick={() => playAudio(usPhonetic.audio!)}>
                          US <Volume2 className="ml-1 h-3 w-3"/>
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* DEFINITIONS BY PART OF SPEECH */}
            <div className="space-y-8">
              {wordData.meanings.map((meaning: Meaning, mIdx: number) => (
                <section key={`meaning-${mIdx}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <Badge variant="outline" className={`text-sm px-3 py-1 shadow-none ${getPosBadgeColor(meaning.partOfSpeech)}`}>
                      {meaning.partOfSpeech}
                    </Badge>
                    <Separator className="flex-1" />
                  </div>
                  
                  <div className="grid gap-4">
                    {meaning.definitions.map((def, dIdx: number) => {
                      const defId = `${meaning.partOfSpeech}-${mIdx}-${dIdx}`;
                      const isSelected = selectedDefs.includes(defId);
                      
                      return (
                        <Card key={defId} className={`transition-all duration-200 ${isSelected ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/50" : "hover:border-slate-300"}`}>
                          <CardHeader className="py-4">
                            <div className="flex items-start gap-4">
                              <Checkbox 
                                id={`check-${defId}`}
                                checked={isSelected} 
                                onCheckedChange={() => toggleSelection(defId)} 
                                className="mt-1" 
                              />
                              <div className="grid gap-1.5 flex-1">
                                <label htmlFor={`check-${defId}`} className="text-lg font-medium leading-tight cursor-pointer">
                                  {def.definition}
                                </label>
                              </div>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="py-0 pb-4 ml-8">
                            {def.example ? (
                              <div className="bg-white border rounded-md p-3 text-sm text-slate-600 mb-3 italic shadow-sm">
                                "{def.example}"
                              </div>
                            ) : (
                              <div className="bg-slate-100 border border-slate-200 border-dashed rounded-md p-3 text-sm text-slate-500 mb-3">
                                No example sentence found in dictionary.
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                              {def.example ? (
                                <>
                                  <Button variant="outline" size="sm" className="h-8 shadow-sm text-slate-600" onClick={() => toast('LLM Gen stub')}>
                                    <RefreshCw className="mr-2 h-3 w-3" /> Regenerate Example
                                  </Button>
                                  <Button variant="secondary" size="sm" className="h-8 shadow-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200" onClick={() => toast('TTS logic stub')}>
                                    <FileAudio className="mr-2 h-3 w-3" /> Generate Audio
                                  </Button>
                                </>
                              ) : (
                                <Button variant="default" size="sm" className="h-8 shadow-sm bg-indigo-600 hover:bg-indigo-700" onClick={() => toast('LLM Gen stub')}>
                                  <RefreshCw className="mr-2 h-3 w-3" /> AI Generate Example
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </main>

      {/* STICKY BOTTOM BAR (Only show if definitions are selected) */}
      {selectedDefs.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-50">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
              <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-bold shrink-0">
                {selectedDefs.length} Selected
              </span>
              <span className="hidden sm:inline">TTS Settings:</span>
              <Select value={accent} onValueChange={setAccent}>
                <SelectTrigger className="w-[110px] md:w-[120px] h-9">
                  <SelectValue placeholder="Accent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">American</SelectItem>
                  <SelectItem value="GB">British</SelectItem>
                </SelectContent>
              </Select>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="w-[110px] md:w-[120px] h-9">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="MALE">Male</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleDownload} className="w-full md:w-auto h-10 px-8 bg-indigo-600 hover:bg-indigo-700 shadow-md">
              <Download className="mr-2 h-4 w-4" /> Download Anki ZIP
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
