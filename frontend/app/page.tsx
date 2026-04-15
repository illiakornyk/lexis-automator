"use client";

import React, { useState } from "react";
import { Search, Download, FileAudio, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function LexisAutomatorUI() {
  const [searchQuery, setSearchQuery] = useState("hello");
  const [selectedDefs, setSelectedDefs] = useState<string[]>(["def-1"]);

  const toggleSelection = (id: string) => {
    setSelectedDefs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    toast("Searching for " + searchQuery + "...");
  };

  const handleDownload = () => {
    toast.success("Downloading Anki package!");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32">
      {/* HEADER SECTION */}
      <header className="bg-white border-b py-6 px-4 md:px-8 mb-8 sticky top-0 z-10">
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
              className="pr-12 shadow-sm rounded-full"
            />
            <Button type="submit" size="icon" className="absolute right-0 top-0 rounded-l-none rounded-r-full">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-4xl mx-auto px-4 md:px-8 space-y-8">
        
        {/* WORD HEADER */}
        <div>
          <h2 className="text-4xl font-extrabold capitalize text-slate-800 tracking-tight">hello</h2>
          <p className="text-slate-500 mt-1">/həˈloʊ/</p>
        </div>

        {/* DEFINITIONS BY PART OF SPEECH */}
        <div className="space-y-6">
          {/* Noun Section */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="default" className="text-sm px-3 py-1 bg-blue-100 text-blue-800 hover:bg-blue-200 shadow-none border-blue-200">
                Noun
              </Badge>
              <Separator className="flex-1" />
            </div>
            
            <div className="grid gap-4">
              {/* Definition Card 1 */}
              <Card className={`transition-all duration-200 ${selectedDefs.includes("def-1") ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/50" : "hover:border-slate-300"}`}>
                <CardHeader className="py-4">
                  <div className="flex items-start gap-4">
                    <Checkbox 
                      checked={selectedDefs.includes("def-1")} 
                      onCheckedChange={() => toggleSelection("def-1")} 
                      className="mt-1" 
                    />
                    <div>
                      <CardTitle className="text-lg font-medium leading-tight">An utterance of 'hello'; a greeting.</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-0 pb-4 ml-8">
                  <div className="bg-white border rounded-md p-3 text-sm text-slate-600 mb-3 italic">
                    "She gave me a warm hello when I walked in."
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 shadow-sm">
                      <RefreshCw className="mr-2 h-3 w-3" /> Regenerate Example
                    </Button>
                    <Button variant="secondary" size="sm" className="h-8 shadow-sm">
                      <FileAudio className="mr-2 h-3 w-3" /> Generate Audio
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Verb Section */}
          <section className="pt-4">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="default" className="text-sm px-3 py-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 shadow-none border-emerald-200">
                Verb
              </Badge>
              <Separator className="flex-1" />
            </div>
            
            <div className="grid gap-4">
              {/* Definition Card 2 */}
              <Card className={`transition-all duration-200 ${selectedDefs.includes("def-2") ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/50" : "hover:border-slate-300"}`}>
                <CardHeader className="py-4">
                  <div className="flex items-start gap-4">
                    <Checkbox 
                      checked={selectedDefs.includes("def-2")} 
                      onCheckedChange={() => toggleSelection("def-2")} 
                      className="mt-1" 
                    />
                    <div>
                      <CardTitle className="text-lg font-medium leading-tight text-slate-700">To greet with 'hello'.</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-0 pb-4 ml-8">
                  <div className="bg-slate-100 border border-slate-200 border-dashed rounded-md p-3 text-sm text-slate-500 mb-3 flex items-center justify-between">
                    <span>No example sentence found in dictionary.</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="default" size="sm" className="h-8 shadow-sm bg-indigo-600 hover:bg-indigo-700">
                      <RefreshCw className="mr-2 h-3 w-3" /> AI Generate Example
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>

      </main>

      {/* STICKY BOTTOM BAR (Only show if definitions are selected) */}
      {selectedDefs.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-50">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
              <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-bold">
                {selectedDefs.length} Selected
              </span>
              <span>TTS Settings:</span>
              <Select defaultValue="US">
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue placeholder="Accent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">American</SelectItem>
                  <SelectItem value="GB">British</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="FEMALE">
                <SelectTrigger className="w-[120px] h-9">
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
