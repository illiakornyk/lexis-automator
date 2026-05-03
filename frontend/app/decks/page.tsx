"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Library, Download, Trash2, Loader2, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDecks } from "@/hooks/useDecks";
import { useTemplates } from "@/hooks/useTemplates";
import { useAuth } from "@/components/AuthProvider";
import { LexisApi } from "@/lib/api";
import { toast } from "sonner";

export default function DecksPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { decks, isLoading, createDeck, deleteDeck } = useDecks();
  const { templates, isLoaded: templatesLoaded } = useTemplates();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const newDeckInputRef = useRef<HTMLInputElement>(null);
  const [bulkTemplateIds, setBulkTemplateIds] = useState<string[]>(["default-recognition"]);
  const [bulkAccent, setBulkAccent] = useState("US");
  const [bulkGender, setBulkGender] = useState("FEMALE");

  if (authLoading) return null;
  if (!user) {
    router.push("/login");
    return null;
  }

  const startCreating = () => {
    setNewDeckName("");
    setIsCreating(true);
    setTimeout(() => newDeckInputRef.current?.focus(), 0);
  };

  const confirmCreate = async () => {
    if (!newDeckName.trim()) { setIsCreating(false); return; }
    await createDeck(newDeckName);
    setIsCreating(false);
    setNewDeckName("");
  };

  const cancelCreate = () => { setIsCreating(false); setNewDeckName(""); };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBulkTemplate = (id: string) => {
    setBulkTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleBulkDownload = async () => {
    if (selectedIds.size < 2) return;
    setIsExporting(true);
    try {
      const blob = await LexisApi.exportDecksArchive({
        deckIds: Array.from(selectedIds),
        templateIds: bulkTemplateIds,
        ttsSettings: { accent: bulkAccent, gender: bulkGender },
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "lexis_decks.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Archive downloaded!");
    } catch (err: any) {
      toast.error(err.message || "Failed to download archive.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteDeck(id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Library className="h-7 w-7 text-indigo-600" />
          <h1 className="text-2xl font-bold text-indigo-900">My Decks</h1>
          <Badge variant="outline" className="ml-1">{decks.length}/15</Badge>

          <div className="ml-auto flex items-center gap-2">
            {isCreating ? (
              <>
                <Input
                  ref={newDeckInputRef}
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="Deck name..."
                  className="w-44 h-8 text-sm"
                  maxLength={50}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmCreate();
                    if (e.key === "Escape") cancelCreate();
                  }}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={confirmCreate}>
                  <Check className="h-4 w-4 text-indigo-600" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelCreate}>
                  <X className="h-4 w-4 text-slate-400" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={startCreating}
                disabled={decks.length >= 15}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                New Deck
              </Button>
            )}
          </div>
        </div>

        {decks.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <Library className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600">No decks yet</h3>
            <p className="text-slate-500 mb-4">
              Create an empty deck or search for a word to save your first card.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={startCreating} className="gap-1.5">
                <Plus className="h-4 w-4" />
                New Deck
              </Button>
              <Link href="/">
                <Button className="bg-indigo-600 hover:bg-indigo-700">Go to Search</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {decks.map((deck) => (
              <Link key={deck.id} href={`/decks/${deck.id}`}>
                <Card className="hover:border-indigo-300 transition-all cursor-pointer">
                  <CardHeader className="py-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedIds.has(deck.id)}
                        onCheckedChange={() => toggleSelect(deck.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{deck.name}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={deck.cardCount >= 50 ? "border-red-200 text-red-600" : ""}
                      >
                        {deck.cardCount}/50
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="py-0 pb-4 flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-red-500"
                      onClick={(e) => handleDelete(deck.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {selectedIds.size >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-50">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-slate-600">
              {selectedIds.size} decks selected
            </span>
            <div className="flex flex-wrap gap-3 items-center text-sm">
              <span className="text-slate-500">Templates:</span>
              {templatesLoaded &&
                templates.slice(0, 4).map((t) => (
                  <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={bulkTemplateIds.includes(t.id)}
                      onCheckedChange={() => toggleBulkTemplate(t.id)}
                    />
                    <span className="text-slate-700">{t.name}</span>
                  </label>
                ))}
              <Select value={bulkAccent} onValueChange={setBulkAccent}>
                <SelectTrigger className="w-[110px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">American</SelectItem>
                  <SelectItem value="GB">British</SelectItem>
                </SelectContent>
              </Select>
              <Select value={bulkGender} onValueChange={setBulkGender}>
                <SelectTrigger className="w-[100px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="MALE">Male</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleBulkDownload}
              disabled={isExporting}
              className="ml-auto bg-indigo-600 hover:bg-indigo-700"
            >
              {isExporting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><Download className="mr-2 h-4 w-4" /> Download {selectedIds.size} Decks as ZIP</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
