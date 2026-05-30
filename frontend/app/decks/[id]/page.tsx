"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ImageIcon,
  LayoutTemplate,
  Loader2,
  PackagePlus,
  Pencil,
  Sparkles,
  Trash2,
  Volume2,
  X,
  Check,
} from "lucide-react";
import { ExportIcon } from "@/components/icons/ExportIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ExampleActions } from "@/components/ExampleActions";
import { ExampleEditDialog } from "@/components/ExampleEditDialog";
import { useDecks } from "@/hooks/useDecks";
import { useDeckCards } from "@/hooks/useDeckCards";
import { useTemplates } from "@/hooks/useTemplates";
import { useAuth } from "@/components/AuthProvider";
import { CardImagePicker } from "@/components/CardImagePicker";
import { LexisApi } from "@/lib/api";
import { useExportJobsContext } from "@/contexts/ExportJobsContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";

export default function DeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: deckId } = use(params);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { decks, isLoading: decksLoading, renameDeck, deleteDeck } = useDecks();
  const { cards, isLoading: cardsLoading, removeCard, updateCardImage, updateCardExample } = useDeckCards(deckId);
  const { templates, isLoaded: templatesLoaded } = useTemplates();

  const { enqueue, isLoading: isEnqueuing } = useExportJobsContext();

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(["default-recognition"]);
  const [accent, setAccent] = useState("US");
  const [gender, setGender] = useState("FEMALE");
  const [pickerCardId, setPickerCardId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [generatingCardIds, setGeneratingCardIds] = useState<Set<string>>(new Set());
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [imageSignedUrls, setImageSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const toFetch = cards.filter((c) => c.imagePath);
    if (toFetch.length === 0) return;
    toFetch.forEach(async (c) => {
      try {
        const url = await LexisApi.getImageSignedUrl(c.imagePath!);
        setImageSignedUrls((prev) => prev[c.id] ? prev : { ...prev, [c.id]: url });
      } catch {
        // preview unavailable
      }
    });
  }, [cards]);

  if (authLoading || decksLoading) return null;
  if (!user) {
    router.push("/login");
    return null;
  }

  const deck = decks.find((d) => d.id === deckId);
  if (!deck) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Deck not found.</p>
      </div>
    );
  }

  const openPicker = (cardId: string) => setPickerCardId(cardId);

  const handleImageSaved = async (cardId: string, imagePath: string | null) => {
    updateCardImage(cardId, imagePath);
    if (!imagePath) {
      setImageSignedUrls((prev) => { const next = { ...prev }; delete next[cardId]; return next; });
    } else {
      try {
        const url = await LexisApi.getImageSignedUrl(imagePath);
        setImageSignedUrls((prev) => ({ ...prev, [cardId]: url }));
      } catch {
        // preview unavailable
      }
    }
  };

  const toggleTemplate = (id: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleRename = async () => {
    await renameDeck(deckId, renameValue);
    setIsRenaming(false);
  };

  const handleDelete = async () => {
    await deleteDeck(deckId);
    router.push("/decks");
  };

  const handleGenerateExample = async (cardId: string, word: string, definition: string) => {
    setGeneratingCardIds((prev) => new Set([...prev, cardId]));
    try {
      const res = await LexisApi.generateExample(word, definition);
      await updateCardExample(cardId, res.example, true);
      toast.success("Example generated.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate example.");
    } finally {
      setGeneratingCardIds((prev) => { const next = new Set(prev); next.delete(cardId); return next; });
    }
  };

  const handleGenerateAllMissing = async () => {
    const missing = cards.filter((c) => !c.example);
    if (missing.length === 0) return;
    setIsGeneratingAll(true);
    setGeneratingCardIds((prev) => new Set([...prev, ...missing.map((c) => c.id)]));

    const generateOne = async (card: (typeof missing)[number]) => {
      try {
        const res = await LexisApi.generateExample(card.word, card.definition);
        await updateCardExample(card.id, res.example, true);
        return true;
      } catch {
        toast.error(`Failed to generate example for "${card.word}".`);
        return false;
      } finally {
        setGeneratingCardIds((prev) => { const next = new Set(prev); next.delete(card.id); return next; });
      }
    };

    // Run with a concurrency cap so we don't hit LLM rate limits.
    const CONCURRENCY = 5;
    const queue = [...missing];
    let successCount = 0;
    const worker = async () => {
      let card: (typeof missing)[number] | undefined;
      while ((card = queue.shift())) {
        if (await generateOne(card)) successCount++;
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, missing.length) }, worker));

    setIsGeneratingAll(false);
    if (successCount > 0) toast.success(`Generated ${successCount} example${successCount !== 1 ? "s" : ""}.`);
  };

  const handleEnqueue = async () => {
    if (cards.length === 0) {
      toast.error("This deck has no cards to export.");
      return;
    }
    const created = await enqueue({
      deckIds: [deckId],
      templateIds: selectedTemplateIds,
      accent,
      gender,
    });
    if (created.length > 0) {
      toast.success("Added to export queue — check the panel in the bottom-right.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Link href="/decks" className="hover:text-indigo-600 transition-colors">Decks</Link>
          <span>›</span>
          <span className="text-slate-800 font-medium truncate max-w-xs">{deck.name}</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {isRenaming ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="max-w-xs"
                maxLength={50}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") setIsRenaming(false);
                }}
              />
              <Button size="icon" variant="ghost" onClick={handleRename}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setIsRenaming(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <h1 className="text-2xl font-bold text-indigo-900 flex-1">{deck.name}</h1>
          )}

          <Badge variant="outline">{cards.length}/50 cards</Badge>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setRenameValue(deck.name);
              setIsRenaming(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-red-500"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="bg-white border rounded-xl px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 sm:divide-x sm:divide-slate-200">

            {/* Zone 1 — Templates */}
            <div className="flex flex-col gap-2 sm:pr-6 sm:w-[35%] min-w-0">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <LayoutTemplate size={12} />
                Templates
              </p>
              <div className="grid grid-cols-1 gap-y-1.5 items-start max-h-32 overflow-y-auto pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent">
                {templatesLoaded ? (
                  templates.map((t) => (
                    <label key={t.id} className="flex items-start gap-1.5 cursor-pointer text-sm text-slate-600 min-w-0" title={t.name}>
                      <Checkbox
                        checked={selectedTemplateIds.includes(t.id)}
                        onCheckedChange={() => toggleTemplate(t.id)}
                        className="shrink-0 mt-0.5"
                      />
                      <span className="break-words leading-snug">{t.name}</span>
                    </label>
                  ))
                ) : (
                  <span className="text-slate-400 text-sm">Loading…</span>
                )}
              </div>
            </div>

            {/* Zone 2 — Voice */}
            <div className="flex flex-col gap-2 sm:px-6 sm:w-[30%]">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <Volume2 size={12} />
                Voice
              </p>
              <div className="flex flex-col gap-2">
                <Select value={accent} onValueChange={setAccent}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">🇺🇸 American</SelectItem>
                    <SelectItem value="GB">🇬🇧 British</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FEMALE">♀ Female</SelectItem>
                    <SelectItem value="MALE">♂ Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Zone 3 — Export */}
            <div className="flex flex-col gap-2 sm:pl-6 sm:w-[35%] sm:flex-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <PackagePlus size={12} />
                Export
              </p>
              <div>
                <Button
                  onClick={handleEnqueue}
                  disabled={isEnqueuing || cards.length === 0}
                  className="w-full h-12 text-sm bg-indigo-600 hover:bg-indigo-700"
                >
                  {isEnqueuing ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Preparing…</>
                  ) : (
                    <><ExportIcon className="mr-2 h-5 w-5" />Download Anki Deck</>
                  )}
                </Button>
              </div>
            </div>

          </div>
        </div>

        {!cardsLoading && cards.filter((c) => !c.example).length > 0 && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <span className="text-sm text-amber-700">
              {cards.filter((c) => !c.example).length} card{cards.filter((c) => !c.example).length !== 1 ? "s are" : " is"} missing an example sentence
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateAllMissing}
              disabled={isGeneratingAll}
              className="border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0 ml-4"
            >
              {isGeneratingAll
                ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Generating…</>
                : <><Sparkles className="mr-1.5 h-4 w-4" />Generate all</>
              }
            </Button>
          </div>
        )}

        {cardsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <p className="text-slate-500">This deck is empty. Add cards from the search page.</p>
            <Link href="/" className="mt-4 inline-block">
              <Button className="bg-indigo-600 hover:bg-indigo-700">Go to Search</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Word</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">
                    POS
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Definition</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">
                    Example
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">
                    Image
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card, i) => (
                  <tr
                    key={card.id}
                    className={`border-b last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {card.word}
                      {card.phonetic && (
                        <span className="block text-xs text-slate-400">{card.phonetic}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                      {card.partOfSpeech}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs">
                      <span className="line-clamp-2">{card.definition}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell max-w-xs">
                      {card.example ? (
                        <div className="flex items-start gap-1.5">
                          {card.exampleIsAi && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-indigo-400" />
                              </TooltipTrigger>
                              <TooltipContent>AI-generated example</TooltipContent>
                            </Tooltip>
                          )}
                          <span className="line-clamp-2 text-slate-500 italic flex-1">{card.example}</span>
                          <ExampleActions
                            isGenerating={generatingCardIds.has(card.id)}
                            onRegenerate={() => handleGenerateExample(card.id, card.word, card.definition)}
                            onEdit={() => setEditingCardId(card.id)}
                            onClear={() => updateCardExample(card.id, "")}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            disabled={generatingCardIds.has(card.id)}
                            onClick={() => handleGenerateExample(card.id, card.word, card.definition)}
                          >
                            {generatingCardIds.has(card.id)
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <><Sparkles className="h-3.5 w-3.5 mr-1" />Generate</>
                            }
                          </Button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                disabled={generatingCardIds.has(card.id)}
                                onClick={() => setEditingCardId(card.id)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Write your own example</TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <button
                        className="rounded-md overflow-hidden border border-slate-200 hover:border-indigo-400 transition-colors"
                        onClick={() => openPicker(card.id)}
                        title={card.imagePath ? "Change image" : "Add image"}
                      >
                        {imageSignedUrls[card.id] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageSignedUrls[card.id]}
                            alt=""
                            className="w-12 h-12 object-cover"
                          />
                        ) : (
                          <div className={`w-12 h-12 flex items-center justify-center ${card.imagePath ? "bg-indigo-50" : "bg-slate-50"}`}>
                            <ImageIcon className={`h-5 w-5 ${card.imagePath ? "text-indigo-400" : "text-slate-300"}`} />
                          </div>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-red-500 h-8 w-8"
                        onClick={() => removeCard(card.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={`Delete "${deck.name}"?`}
        description="This will permanently delete the deck and all its cards. This action cannot be undone."
        confirmLabel="Delete deck"
        onConfirm={handleDelete}
      />

      {pickerCardId && (
        <CardImagePicker
          open={!!pickerCardId}
          onOpenChange={(open) => { if (!open) setPickerCardId(null); }}
          cardId={pickerCardId}
          word={cards.find((c) => c.id === pickerCardId)?.word ?? ""}
          currentImagePath={cards.find((c) => c.id === pickerCardId)?.imagePath ?? null}
          onImageSaved={(imagePath) => handleImageSaved(pickerCardId, imagePath)}
        />
      )}

      {editingCardId && (
        <ExampleEditDialog
          open={!!editingCardId}
          onOpenChange={(open) => { if (!open) setEditingCardId(null); }}
          word={cards.find((c) => c.id === editingCardId)?.word ?? ""}
          initialValue={cards.find((c) => c.id === editingCardId)?.example ?? ""}
          onSave={(example) => updateCardExample(editingCardId, example, false)}
        />
      )}
    </div>
  );
}
