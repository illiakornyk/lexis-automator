"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, CheckCircle2, LayoutTemplate, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

interface SearchHeaderProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export function SearchHeader({ searchQuery, onSearchQueryChange, onSearch, isLoading }: SearchHeaderProps) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out successfully");
      router.refresh();
    }
  };

  return (
    <header className="bg-white border-b py-6 px-4 md:px-8 mb-8 sticky top-0 z-10 shadow-sm">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="bg-indigo-600 rounded-md p-2 flex items-center justify-center">
              <CheckCircle2 color="white" size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-indigo-900 hidden sm:block">Lexis Automator</h1>
          </Link>
          <Link href="/templates" className="ml-2">
            <Button variant="ghost" size="icon" className="text-slate-500 hover:bg-indigo-50 hover:text-indigo-600">
              <LayoutTemplate size={20} />
            </Button>
          </Link>
        </div>

        <form onSubmit={onSearch} className="flex relative w-full md:w-96 flex-1 max-w-md mx-4">
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

        <div className="flex items-center gap-3">
          {authLoading ? (
            <div className="h-9 w-20 bg-slate-100 animate-pulse rounded-md"></div>
          ) : user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600 hidden sm:block">
                {user.email}
              </span>
              <Link href="/settings">
                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-indigo-600">
                  <User size={20} />
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="text-slate-500"
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
