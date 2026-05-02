export interface Deck {
  id: string;
  name: string;
  cardCount: number;
  createdAt: string;
}

export interface SavedCard {
  id: string;
  deckId: string;
  word: string;
  partOfSpeech: string;
  phonetic: string | null;
  definition: string;
  example: string | null;
  createdAt: string;
}