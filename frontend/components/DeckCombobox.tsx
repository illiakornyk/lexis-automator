"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Deck } from "@/lib/types/deck";

interface DeckComboboxProps {
  decks: Deck[];
  selectedDeckId: string | null;
  onSelectDeck: (deckId: string) => void;
  onCreateDeck: (name: string) => Promise<void>;
  isLoading: boolean;
  defaultNewDeckName?: string;
}

export function DeckCombobox({
  decks,
  selectedDeckId,
  onSelectDeck,
  onCreateDeck,
  isLoading,
  defaultNewDeckName = "",
}: DeckComboboxProps) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const selectedDeck = decks.find((d) => d.id === selectedDeckId);
  const canCreateMore = decks.length < 15;

  const openCreateForm = () => {
    setNewDeckName(defaultNewDeckName);
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!newDeckName.trim()) return;
    setIsCreating(true);
    await onCreateDeck(newDeckName.trim());
    setNewDeckName("");
    setShowCreate(false);
    setIsCreating(false);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setShowCreate(false); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
          disabled={isLoading}
        >
          <span className="truncate">
            {selectedDeck
              ? `${selectedDeck.name} (${selectedDeck.cardCount}/50)`
              : "Select deck..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0">
        <Command>
          <CommandInput placeholder="Search decks..." />
          <CommandList>
            <CommandEmpty>No decks found.</CommandEmpty>

            {canCreateMore && (
              <>
                <CommandGroup>
                  {showCreate ? (
                    <div className="flex gap-1 p-1">
                      <Input
                        value={newDeckName}
                        onChange={(e) => setNewDeckName(e.target.value)}
                        placeholder="Deck name..."
                        className="h-7 text-sm"
                        maxLength={50}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreate();
                          if (e.key === "Escape") setShowCreate(false);
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-7 px-2"
                        onClick={handleCreate}
                        disabled={isCreating}
                      >
                        {isCreating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <CommandItem onSelect={openCreateForm}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create new deck
                    </CommandItem>
                  )}
                </CommandGroup>
                {decks.length > 0 && <CommandSeparator />}
              </>
            )}

            <CommandGroup>
              {decks.map((deck) => (
                <CommandItem
                  key={deck.id}
                  value={deck.name}
                  onSelect={() => {
                    onSelectDeck(deck.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      selectedDeckId === deck.id ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <span className="truncate flex-1">{deck.name}</span>
                  <span className="ml-1 text-xs text-slate-400">
                    {deck.cardCount}/50
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
