# Saved Words / My Decks Feature Design

**Date:** 2026-05-01
**Status:** Approved

## Overview

Instead of forcing users to download an Anki `.apkg` immediately after looking up a word, they can save selected definitions into named decks stored in Supabase. Later, from a "My Decks" page, they can review, manage, and download decks as `.apkg` files (single) or a `.zip` archive (multiple).

## Constraints

- Max **15 decks** per user
- Max **50 cards** per deck
- Duplicates (same word + definition in the same deck) are **allowed** but surfaced to the user via a toast warning
- Deck names: 1–50 characters, trimmed, no uniqueness requirement

## Architecture

**Approach:** Supabase-direct CRUD from the frontend (matching the existing `useTemplates`/`useProfile` pattern) + two new NestJS backend endpoints for file generation only.

---

## 1. Database Schema

### Migration: `create_decks_and_saved_cards`

#### `public.decks`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `user_id` | UUID FK → `auth.users` | `ON DELETE CASCADE` |
| `name` | TEXT NOT NULL | 1–50 chars |
| `created_at` | TIMESTAMPTZ | `DEFAULT now()` |
| `updated_at` | TIMESTAMPTZ | `DEFAULT now()` |

- RLS enabled: users can SELECT/INSERT/UPDATE/DELETE only their own rows
- `BEFORE INSERT` trigger rejects insert if user already has 15 decks
- Index on `(user_id)`

#### `public.saved_cards`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `user_id` | UUID FK → `auth.users` | `ON DELETE CASCADE` |
| `deck_id` | UUID FK → `decks` | `ON DELETE CASCADE` |
| `word` | TEXT NOT NULL | |
| `part_of_speech` | TEXT NOT NULL | |
| `phonetic` | TEXT | nullable |
| `definition` | TEXT NOT NULL | |
| `example` | TEXT | nullable |
| `created_at` | TIMESTAMPTZ | `DEFAULT now()` |

- RLS enabled: users can SELECT/INSERT/DELETE only their own rows
- `BEFORE INSERT` trigger rejects insert if deck already has 50 cards
- Index on `(deck_id)`, index on `(user_id)`
- No unique constraint — duplicates are permitted at the DB level

---

## 2. Frontend

### New Hooks

All hooks call Supabase JS directly, following the `useTemplates`/`useProfile` pattern.

**`useDecks`**
- Fetches user's decks with card counts (via a `saved_cards` count join)
- Exposes: `decks`, `isLoading`, `createDeck(name)`, `renameDeck(id, name)`, `deleteDeck(id)`
- `createDeck` is disabled client-side when deck count is already 15

**`useDeckCards(deckId)`**
- Fetches all `saved_cards` for a given deck
- Exposes: `cards`, `isLoading`, `removeCard(cardId)`

**`useSaveToDecks`**
- Called when user clicks "Add to Deck" in ExportBar
- Reads existing cards in the target deck to detect duplicate `(word, definition)` pairs
- Shows a toast warning listing duplicate count, but still inserts all cards
- Optimistically updates deck card count in `useDecks`, rolls back on error

### Modified Components

**`ExportBar`**
- New **searchable deck combobox** (shadcn `Popover` + `Command`) beside the Download button
  - Lists user's decks with card count (e.g. "Business English — 12/50")
  - Filters decks by name as user types
  - "+ Create new deck" option at bottom → inline name input → calls `createDeck`
  - Hidden entirely when user is not authenticated
  - "+ Create new deck" option hidden when user already has 15 decks
- New **"Add to Deck"** button: disabled when no definitions selected or no deck chosen

### New Pages & Components

**`/decks` page**
- Lists all decks as cards: name, card count badge, single-deck download button (clicking opens the deck detail page `/decks/[id]` where template and TTS settings are selected before download)
- Multi-select checkboxes on each deck card
- Sticky "Download X decks as ZIP" button appears when ≥2 decks are checked; clicking opens a modal with template selector and TTS settings before generating the archive
- Empty state: "No decks yet — search for a word and save your first card."
- Redirects to login if unauthenticated

**`/decks/[id]` page**
- Header: deck name, card count, rename action, delete deck action
- Download button with template selector (same template picker as main page) and TTS settings
- Cards displayed in a table: word, part of speech, phonetic, definition, example, delete button per row
- Empty state: "This deck is empty. Add cards from the search page."

**Navigation**
- "My Decks" link added to `SearchHeader`

---

## 3. Backend

Two new endpoints in NestJS, both behind `SupabaseAuthGuard`.

### `POST /export/deck`

```typescript
// Body
{
  deckId: string;
  templateIds: string[];   // selected at download time
  ttsSettings: { accent: 'US' | 'GB'; gender: 'MALE' | 'FEMALE' };
}
```

- Fetches all `saved_cards` for `deckId` using the Supabase service-role key (server-side)
- Fetches the specified templates by `templateIds` from `public.templates`
- Builds and returns a single `.apkg` blob using existing Anki generation logic
- Returns 400 if deck has 0 cards

### `POST /export/decks/archive`

```typescript
// Body
{
  deckIds: string[];
  templateIds: string[];
  ttsSettings: { accent: 'US' | 'GB'; gender: 'MALE' | 'FEMALE' };
}
```

- Generates one `.apkg` per deck by reusing the same internal generation function
- Zips all `.apkg` files into a single `.zip` using `archiver`
- Returns binary `.zip` with `Content-Disposition: attachment; filename="lexis_decks.zip"`

No new backend code for CRUD — all deck and card management goes through Supabase JS on the frontend.

---

## 4. Error Handling & Edge Cases

| Scenario | Handling |
|---|---|
| Deck at 50 cards | Client checks count before insert; shows toast error. DB trigger is hard backstop. |
| User at 15 decks | "+ Create new deck" hidden in dropdown. DB trigger is hard backstop. |
| Duplicate card | Frontend detects via read-before-write; shows warning toast but saves anyway. |
| Download with 0 cards | Backend returns 400; frontend shows toast error. |
| Unauthenticated access to `/decks` | Redirect to login page. |
| Deck export failure | Toast error with backend message. |
| Optimistic update failure | Roll back card count display; show toast error. |

---

## 5. Data Flow: "Add to Deck"

```
User selects definitions → clicks "Add to Deck"
  → useSaveToDecks reads existing deck cards (Supabase JS)
  → detects duplicates → shows warning toast if any
  → inserts new saved_cards rows (Supabase JS, one per selected definition)
  → optimistically updates deck card count in useDecks
  → on error: rolls back + toast
```

## 6. Data Flow: "Download Deck"

```
User clicks Download on /decks/[id]
  → frontend sends POST /export/deck { deckId, templateIds, ttsSettings }
  → backend fetches saved_cards from Supabase (service role)
  → backend fetches specified templates by templateIds
  → backend generates .apkg blob
  → frontend receives blob → triggers browser download
```
