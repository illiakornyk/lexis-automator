"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Library, PackagePlus, Trash2, Loader2, Plus, Check, X, LayoutTemplate, Volume2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDecks } from "@/hooks/useDecks";
import { useTemplates } from "@/hooks/useTemplates";
import { useAuth } from "@/components/AuthProvider";
import { useExportJobsContext } from "@/contexts/ExportJobsContext";

export default function DecksPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { decks, isLoading, createDeck, deleteDeck } = useDecks();
  const { templates, isLoaded: templatesLoaded } = useTemplates();
  const { enqueue, isLoading: isEnqueuing } = useExportJobsContext();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "name-asc" | "name-desc">("date-desc");
  const [isCreating, setIsCreating] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const newDeckInputRef = useRef<HTMLInputElement>(null);
  const [bulkTemplateIds, setBulkTemplateIds] = useState<string[]>(["default-recognition"]);
  const [bulkAccent, setBulkAccent] = useState("US");
  const [bulkGender, setBulkGender] = useState("FEMALE");

  const sortedDecks = useMemo(() => {
    return [...decks].sort((a, b) => {
      switch (sortBy) {
        case "name-asc":  return a.name.localeCompare(b.name);
        case "name-desc": return b.name.localeCompare(a.name);
        case "date-asc":  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "date-desc": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [decks, sortBy]);

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

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => deleteDeck(id)));
    setSelectedIds(new Set());
    toast.success(`${ids.length} deck${ids.length !== 1 ? "s" : ""} deleted.`);
  };

  const handleBulkEnqueue = async () => {
    const created = await enqueue({
      deckIds: Array.from(selectedIds),
      templateIds: bulkTemplateIds,
      accent: bulkAccent,
      gender: bulkGender,
    });
    if (created.length > 0) {
      setSelectedIds(new Set());
      toast.success(`${created.length} deck${created.length !== 1 ? "s" : ""} added to export queue.`);
    }
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
            {decks.length > 1 && (
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="h-8 w-[140px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Newest first</SelectItem>
                  <SelectItem value="date-asc">Oldest first</SelectItem>
                  <SelectItem value="name-asc">Name A→Z</SelectItem>
                  <SelectItem value="name-desc">Name Z→A</SelectItem>
                </SelectContent>
              </Select>
            )}
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
                className="gap-1.5 text-slate-500"
              >
                <XCircle className="h-4 w-4" />
                Unselect all
              </Button>
            )}
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
            {sortedDecks.map((deck) => (
              <Card
                key={deck.id}
                className="hover:border-indigo-300 transition-all cursor-pointer"
                onClick={() => router.push(`/decks/${deck.id}`)}
              >
                <CardHeader className="py-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(deck.id)}
                      onCheckedChange={() => toggleSelect(deck.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 h-5 w-5 shrink-0"
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
                    onClick={(e) => { e.stopPropagation(); void deleteDeck(deck.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedIds.size >= 1 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)]">
          <div className="max-w-4xl mx-auto px-6 py-4">

            {/* Status row */}
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {selectedIds.size}
              </span>
              <span className="text-sm font-medium text-slate-700">
                deck{selectedIds.size !== 1 ? "s" : ""} selected
              </span>
            </div>

            {/* Three-zone row */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 sm:divide-x sm:divide-slate-200">

              {/* Zone 1 — Templates */}
              <div className="flex flex-col gap-2 sm:pr-6 sm:w-64 shrink-0">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <LayoutTemplate size={12} />
                  Templates
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                  {templatesLoaded ? (
                    templates.slice(0, 4).map((t) => (
                      <label key={t.id} className="flex items-center gap-1.5 cursor-pointer text-sm text-slate-600">
                        <Checkbox
                          checked={bulkTemplateIds.includes(t.id)}
                          onCheckedChange={() => toggleBulkTemplate(t.id)}
                        />
                        {t.name}
                      </label>
                    ))
                  ) : (
                    <span className="text-slate-400 text-sm">Loading…</span>
                  )}
                </div>
              </div>

              {/* Zone 2 — Voice */}
              <div className="flex flex-col gap-2 sm:px-6 shrink-0">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Volume2 size={12} />
                  Voice
                </p>
                <div className="flex items-center gap-1.5">
                  <Select value={bulkAccent} onValueChange={setBulkAccent}>
                    <SelectTrigger className="w-[120px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">🇺🇸 American</SelectItem>
                      <SelectItem value="GB">🇬🇧 British</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={bulkGender} onValueChange={setBulkGender}>
                    <SelectTrigger className="w-[105px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FEMALE">♀ Female</SelectItem>
                      <SelectItem value="MALE">♂ Male</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Zone 3 — Actions */}
              <div className="flex flex-col gap-2 sm:pl-6 shrink-0">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <PackagePlus size={12} />
                  Actions
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleBulkEnqueue}
                    disabled={isEnqueuing}
                    className="h-10 bg-indigo-600 hover:bg-indigo-700"
                  >
                    {isEnqueuing ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Queuing…</>
                    ) : (
                      <><PackagePlus className="mr-2 h-4 w-4" />Export to Anki</>
                    )}
                  </Button>
                  <Button
                    onClick={handleBulkDelete}
                    disabled={isEnqueuing}
                    variant="outline"
                    className="h-10 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete {selectedIds.size} deck{selectedIds.size !== 1 ? "s" : ""}
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
