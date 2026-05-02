"use client";

import { useState, useRef } from "react";
import { Search, Link, Upload, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LexisApi } from "@/lib/api";
import { toast } from "sonner";

type Tab = "search" | "url" | "upload";

interface PixabayImage {
  id: string;
  previewUrl: string;
  webformatUrl: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  currentImagePath: string | null;
  onImageSaved: (imagePath: string | null) => void;
}

export function CardImagePicker({
  open,
  onOpenChange,
  cardId,
  currentImagePath,
  onImageSaved,
}: Props) {
  const [tab, setTab] = useState<Tab>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PixabayImage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const images = await LexisApi.searchImages(query.trim());
      setResults(images);
    } catch {
      toast.error("Image search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const saveFromUrl = async (url: string) => {
    setIsSaving(true);
    try {
      const { imagePath } = await LexisApi.saveImageFromUrl(cardId, url);
      onImageSaved(imagePath);
      onOpenChange(false);
      toast.success("Image saved.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save image.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error("File must be under 1 MB.");
      return;
    }
    setIsSaving(true);
    try {
      const { imagePath } = await LexisApi.uploadImage(cardId, file);
      onImageSaved(imagePath);
      onOpenChange(false);
      toast.success("Image uploaded.");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    setIsSaving(true);
    try {
      await LexisApi.removeImage(cardId);
      onImageSaved(null);
      onOpenChange(false);
      toast.success("Image removed.");
    } catch {
      toast.error("Failed to remove image.");
    } finally {
      setIsSaving(false);
    }
  };

  const tabClass = (t: Tab) =>
    `px-3 py-1.5 text-sm rounded-md transition-colors ${
      tab === t
        ? "bg-indigo-600 text-white"
        : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Set card image</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
          <button className={tabClass("search")} onClick={() => setTab("search")}>
            <Search className="inline h-3.5 w-3.5 mr-1" />Search
          </button>
          <button className={tabClass("url")} onClick={() => setTab("url")}>
            <Link className="inline h-3.5 w-3.5 mr-1" />URL
          </button>
          <button className={tabClass("upload")} onClick={() => setTab("upload")}>
            <Upload className="inline h-3.5 w-3.5 mr-1" />Upload
          </button>
        </div>

        {tab === "search" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search Pixabay..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button
                onClick={handleSearch}
                disabled={isSearching || !query.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 shrink-0"
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
              {results.map((img) => (
                <button
                  key={img.id}
                  className="rounded-md overflow-hidden border-2 border-transparent hover:border-indigo-500 transition-all"
                  onClick={() => saveFromUrl(img.webformatUrl)}
                  disabled={isSaving}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.previewUrl}
                    alt=""
                    className="w-full h-16 object-cover"
                  />
                </button>
              ))}
              {results.length === 0 && !isSearching && (
                <p className="col-span-4 text-center text-slate-400 text-sm py-4">
                  Search for images above
                </p>
              )}
            </div>
          </div>
        )}

        {tab === "url" && (
          <div className="space-y-3">
            <Input
              placeholder="https://example.com/image.jpg"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveFromUrl(urlValue)}
            />
            <Button
              onClick={() => saveFromUrl(urlValue)}
              disabled={isSaving || !urlValue.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save from URL
            </Button>
          </div>
        )}

        {tab === "upload" && (
          <div className="space-y-3">
            <div
              className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p className="text-sm text-slate-500">Click to select an image (max 1 MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            {isSaving && (
              <div className="flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              </div>
            )}
          </div>
        )}

        {currentImagePath && (
          <div className="border-t pt-3 flex items-center gap-2">
            <span className="text-xs text-slate-500 flex-1">Image attached</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700"
              onClick={handleRemove}
              disabled={isSaving}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />Remove
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
