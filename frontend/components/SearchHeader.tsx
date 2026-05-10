"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchHeaderProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  isLoading: boolean;
}

export function SearchHeader({ searchQuery, onSearchQueryChange, onSearch, isLoading }: SearchHeaderProps) {
  return (
    <div className="px-4 md:px-8 py-10">
      <div className="max-w-2xl mx-auto">
        <h2 className="font-heading text-3xl font-bold text-indigo-900 text-center mb-2">
          Look up any word
        </h2>
        <p className="text-stone-500 text-center mb-6 text-sm">
          Search for a definition, generate examples, and save cards to your decks.
        </p>
        <form
          onSubmit={(e) => { e.preventDefault(); onSearch(); }}
          className="flex rounded-lg overflow-hidden border border-stone-300 shadow-md shadow-stone-200/80 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all duration-200"
        >
          <Input
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search a word (e.g., ephemeral)..."
            className="h-12 text-base bg-white border-0 text-stone-900 placeholder:text-stone-400 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
            disabled={isLoading}
          />
          <Button
            disabled={isLoading}
            type="submit"
            size="icon"
            className="h-12 w-14 rounded-none shrink-0 border-0 bg-amber-500 hover:bg-amber-400 text-white"
          >
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
