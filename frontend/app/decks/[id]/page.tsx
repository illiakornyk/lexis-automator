"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  ImageIcon,
  Loader2,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useDecks } from "@/hooks/useDecks";
import { useDeckCards } from "@/hooks/useDeckCards";
import { useTemplates } from "@/hooks/useTemplates";
import { useAuth } from "@/components/AuthProvider";
import { CardImagePicker } from "@/components/CardImagePicker";
import { LexisApi } from "@/lib/api";
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
  const { cards, isLoading: cardsLoading, removeCard, updateCardImage } = useDeckCards(deckId);
  const { templates, isLoaded: templatesLoaded } = useTemplates();

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(["default-recognition"]);
  const [accent, setAccent] = useState("US");
  const [gender, setGender] = useState("FEMALE");
  const [isExporting, setIsExporting] = useState(false);
  const [pickerCardId, setPickerCardId] = useState<string | null>(null);
  const [imageSignedUrls, setImageSignedUrls] = useState<Record<string, string>>({});

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

  const openPicker = async (cardId: string, imagePath: string | null) => {
    if (imagePath && !imageSignedUrls[cardId]) {
      try {
        const url = await LexisApi.getImageSignedUrl(imagePath);
        setImageSignedUrls((prev) => ({ ...prev, [cardId]: url }));
      } catch {
        // preview unavailable — picker still opens
      }
    }
    setPickerCardId(cardId);
  };

  const handleImageSaved = (cardId: string, imagePath: string | null) => {
    updateCardImage(cardId, imagePath);
    if (!imagePath) {
      setImageSignedUrls((prev) => { const next = { ...prev }; delete next[cardId]; return next; });
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

  const handleDownload = async () => {
    if (cards.length === 0) {
      toast.error("This deck has no cards to export.");
      return;
    }
    setIsExporting(true);
    try {
      const blob = await LexisApi.exportDeck({
        deckId,
        templateIds: selectedTemplateIds,
        ttsSettings: { accent, gender },
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${deck.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.apkg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Deck downloaded!");
    } catch (err: any) {
      toast.error(err.message || "Failed to download deck.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/decks">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

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
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="bg-white border rounded-xl p-4 flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-slate-600">Templates:</span>
          {templatesLoaded &&
            templates.map((t) => (
              <label key={t.id} className="flex items-center gap-1.5 cursor-pointer text-sm">
                <Checkbox
                  checked={selectedTemplateIds.includes(t.id)}
                  onCheckedChange={() => toggleTemplate(t.id)}
                />
                <span className="text-slate-700">{t.name}</span>
              </label>
            ))}
          <Select value={accent} onValueChange={setAccent}>
            <SelectTrigger className="w-[110px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="US">American</SelectItem>
              <SelectItem value="GB">British</SelectItem>
            </SelectContent>
          </Select>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="MALE">Male</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleDownload}
            disabled={isExporting || cards.length === 0}
            className="ml-auto bg-indigo-600 hover:bg-indigo-700"
          >
            {isExporting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
            ) : (
              <><Download className="mr-2 h-4 w-4" /> Download .apkg</>
            )}
          </Button>
        </div>

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
                  <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">
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
                    <td className="px-4 py-3 text-slate-500 italic hidden md:table-cell max-w-xs">
                      <span className="line-clamp-2">{card.example || "—"}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <button
                        className="rounded-md overflow-hidden border border-slate-200 hover:border-indigo-400 transition-colors"
                        onClick={() => openPicker(card.id, card.imagePath)}
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

      {pickerCardId && (
        <CardImagePicker
          open={!!pickerCardId}
          onOpenChange={(open) => { if (!open) setPickerCardId(null); }}
          cardId={pickerCardId}
          currentImagePath={cards.find((c) => c.id === pickerCardId)?.imagePath ?? null}
          onImageSaved={(imagePath) => handleImageSaved(pickerCardId, imagePath)}
        />
      )}
    </div>
  );
}
