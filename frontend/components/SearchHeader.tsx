"use client";

import React from "react";
import { Search, CheckCircle2 } from "lucide-react";
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
    <header className="bg-white border-b py-6 px-4 md:px-8 mb-8 sticky top-0 z-10 shadow-sm">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 rounded-md p-2 flex items-center justify-center">
            <CheckCircle2 color="white" size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-indigo-900">Lexis Automator</h1>
        </div>

        <form onSubmit={onSearch} className="flex relative w-full md:w-96">
          <Input
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
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
  );
}
