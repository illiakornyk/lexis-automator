"use client";

import React from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchHeaderProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export function SearchHeader({ searchQuery, onSearchQueryChange, onSearch, isLoading }: SearchHeaderProps) {
  return (
    <div className="px-4 md:px-8 py-8">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-indigo-900 text-center mb-2">
          Look up any word
        </h2>
        <p className="text-slate-500 text-center mb-6 text-sm">
          Search for a definition, generate examples, and save cards to your decks.
        </p>
        <form onSubmit={onSearch} className="flex relative">
          <Input
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search a word (e.g., ephemeral)..."
            className="pr-12 shadow-sm rounded-full bg-white h-12 text-base"
            disabled={isLoading}
          />
          <Button
            disabled={isLoading}
            type="submit"
            size="icon"
            className="absolute right-0 top-0 h-12 w-12 rounded-l-none rounded-r-full bg-indigo-600 hover:bg-indigo-700"
          >
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
