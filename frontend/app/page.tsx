"use client";

import React, { useState } from "react";
import { Search, Download, RefreshCw, CheckCircle2, BookOpen, Volume2, Loader2 } from "lucide-react";
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
  const [generatingExamples, setGeneratingExamples] = useState<Record<string, boolean>>({});

  // Card type toggles for Anki export
  const [includeRecognition, setIncludeRecognition] = useState(true);
  const [includeProduction, setIncludeProduction] = useState(false);
  const [includeCloze, setIncludeCloze] = useState(false);
  const [includeTypeIn, setIncludeTypeIn] = useState(false);
  const [isExporting, setIsExporting] = useState(false);


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

  const handleGenerateExample = async (defId: string, mIdx: number, dIdx: number, definitionStr: string) => {
    setGeneratingExamples(prev => ({ ...prev, [defId]: true }));
    try {
      const res = await LexisApi.generateExample(wordData!.word, definitionStr);
      
      // Update wordData optimally so it renders immediately
      setWordData(prev => {
        if (!prev) return prev;
        const newData = JSON.parse(JSON.stringify(prev)) as DictionaryEntry;
        newData.meanings[mIdx].definitions[dIdx].example = res.example;
        return newData;
      });
      toast.success("AI Example generated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate example.");
    } finally {
       setGeneratingExamples(prev => ({ ...prev, [defId]: false }));
    }
  };



  const handleDownload = async () => {
    if (!wordData) return;

    // Validate: at least one card type must be selected
    if (!includeRecognition && !includeProduction && !includeCloze && !includeTypeIn) {
      toast.error("Please select at least one card type.");
      return;
    }

    // Build cards array from selected definitions
    const cards: Array<{ word: string; partOfSpeech: string; phonetic: string; definition: string; example: string }> = [];
    
    for (const defId of selectedDefs) {
      // Parse defId format: "partOfSpeech-mIdx-dIdx"
      const parts = defId.split('-');
      const mIdx = parseInt(parts[parts.length - 2]);
      const dIdx = parseInt(parts[parts.length - 1]);
      const meaning = wordData.meanings[mIdx];
      const def = meaning?.definitions[dIdx];

      if (!def) continue;

      // Require an example for export
      if (!def.example) {
        toast.error(`Please generate an example for: "${def.definition.slice(0, 50)}..."`);
        return;
      }

      const phonetic = wordData.phonetics?.find(p => p.text)?.text || '';

      cards.push({
        word: wordData.word,
        partOfSpeech: meaning.partOfSpeech,
        phonetic,
        definition: def.definition,
        example: def.example,
      });
    }

    setIsExporting(true);
    try {
      const blob = await LexisApi.exportAnki({
        deckName: `Lexis - ${wordData.word}`,
        cards,
        ttsSettings: { accent, gender },
        includeRecognition,
        includeProduction,
        includeCloze,
        includeTypeIn,
      });

      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lexis_${wordData.word}.apkg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Anki deck downloaded successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export Anki deck.');
    } finally {
      setIsExporting(false);
    }
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
                              <Button 
                                variant={def.example ? "outline" : "default"}
                                size="sm" 
                                className={`h-8 shadow-sm ${def.example ? 'text-slate-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                onClick={() => handleGenerateExample(defId, mIdx, dIdx, def.definition)}
                                disabled={generatingExamples[defId]}
                              >
                                <RefreshCw className={`mr-2 h-3 w-3 ${generatingExamples[defId] ? 'animate-spin' : ''}`} /> 
                                {def.example ? 'Regenerate Example' : 'AI Generate Example'}
                              </Button>
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
          <div className="max-w-4xl mx-auto flex flex-col gap-3">
            {/* Top row: Selected count + TTS Settings */}
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
              <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-bold shrink-0">
                {selectedDefs.length} Selected
              </span>
              <span className="hidden sm:inline text-slate-400">|</span>
              <span className="hidden sm:inline">TTS:</span>
              <Select value={accent} onValueChange={setAccent}>
                <SelectTrigger className="w-[110px] h-9">
                  <SelectValue placeholder="Accent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">American</SelectItem>
                  <SelectItem value="GB">British</SelectItem>
                </SelectContent>
              </Select>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="w-[100px] h-9">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="MALE">Male</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bottom row: Card type toggles + Download button */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="text-slate-500 font-medium">Card Types:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={includeRecognition} onCheckedChange={(v) => setIncludeRecognition(!!v)} />
                  <span className="text-slate-700">Recognition</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={includeProduction} onCheckedChange={(v) => setIncludeProduction(!!v)} />
                  <span className="text-slate-700">Production</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={includeCloze} onCheckedChange={(v) => setIncludeCloze(!!v)} />
                  <span className="text-slate-700">Cloze</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={includeTypeIn} onCheckedChange={(v) => setIncludeTypeIn(!!v)} />
                  <span className="text-slate-700">Type-In</span>
                </label>
              </div>

              <Button 
                onClick={handleDownload} 
                disabled={isExporting}
                className="w-full md:w-auto h-10 px-8 bg-indigo-600 hover:bg-indigo-700 shadow-md"
              >
                {isExporting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Download className="mr-2 h-4 w-4" /> Download Anki Deck</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
