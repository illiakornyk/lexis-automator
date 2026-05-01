# Saved Words / My Decks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add named deck persistence to Lexis Automator — users save selected definitions to Supabase-backed decks and later download them as `.apkg` or a multi-deck `.zip`.

**Architecture:** Supabase JS direct CRUD from frontend (same pattern as `useTemplates`/`useProfile`); two new NestJS endpoints handle file generation only, reading cards from DB via service-role key. DB triggers enforce 15-deck and 50-card limits.

**Tech Stack:** Next.js App Router, shadcn/ui (Popover + Command to install), NestJS, Supabase JS v2, `archiver` npm package.

---

## File Map

**New files:**
- `supabase/migrations/20260501000000_create_decks_and_saved_cards.sql`
- `backend/src/export/utils/anki-compiler.ts`
- `backend/src/export/dto/export-deck.dto.ts`
- `backend/src/export/dto/export-decks-archive.dto.ts`
- `frontend/lib/types/deck.ts`
- `frontend/hooks/useDecks.ts`
- `frontend/hooks/useDeckCards.ts`
- `frontend/hooks/useSaveToDecks.ts`
- `frontend/components/DeckCombobox.tsx`
- `frontend/app/decks/page.tsx`
- `frontend/app/decks/[id]/page.tsx`

**Modified files:**
- `backend/src/export/export.service.ts` — extract private `buildApkgFile`, add `exportDeck`, `exportDecksArchive`
- `backend/src/export/export.controller.ts` — add `POST /export/deck`, `POST /export/decks/archive`
- `frontend/lib/api.ts` — add `exportDeck`, `exportDecksArchive`
- `frontend/components/ExportBar.tsx` — add deck combobox + "Add to Deck" button
- `frontend/components/SearchHeader.tsx` — add "My Decks" nav link
- `frontend/hooks/useLexisAutomator.ts` — wire up deck state + handlers

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260501000000_create_decks_and_saved_cards.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Create decks table
CREATE TABLE public.decks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.decks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decks TO service_role;

CREATE POLICY "Users can view own decks" ON public.decks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own decks" ON public.decks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own decks" ON public.decks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own decks" ON public.decks
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_decks_user_id ON public.decks(user_id);

CREATE OR REPLACE FUNCTION public.check_deck_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.decks WHERE user_id = NEW.user_id) >= 15 THEN
    RAISE EXCEPTION 'Maximum deck limit (15) reached';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_deck_limit
  BEFORE INSERT ON public.decks
  FOR EACH ROW EXECUTE FUNCTION public.check_deck_limit();

-- Create saved_cards table
CREATE TABLE public.saved_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  part_of_speech TEXT NOT NULL,
  phonetic TEXT,
  definition TEXT NOT NULL,
  example TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_cards ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.saved_cards TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.saved_cards TO service_role;

CREATE POLICY "Users can view own saved cards" ON public.saved_cards
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved cards" ON public.saved_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved cards" ON public.saved_cards
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_saved_cards_deck_id ON public.saved_cards(deck_id);
CREATE INDEX idx_saved_cards_user_id ON public.saved_cards(user_id);

CREATE OR REPLACE FUNCTION public.check_card_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.saved_cards WHERE deck_id = NEW.deck_id) >= 50 THEN
    RAISE EXCEPTION 'Maximum card limit (50) per deck reached';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_card_limit
  BEFORE INSERT ON public.saved_cards
  FOR EACH ROW EXECUTE FUNCTION public.check_card_limit();
```

- [ ] **Step 2: Apply the migration**

```bash
cd /path/to/project && supabase db push
```

Expected: migration applies without errors, tables `decks` and `saved_cards` appear in Supabase dashboard.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260501000000_create_decks_and_saved_cards.sql
git commit -m "feat(db): add decks and saved_cards tables with RLS and limit triggers"
```

---

## Task 2: Backend — Install Dependencies & Add Env Vars

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/.env` and `backend/.env.example`

- [ ] **Step 1: Install packages**

```bash
cd backend && pnpm add @supabase/supabase-js archiver && pnpm add -D @types/archiver
```

Expected: packages appear in `node_modules`, `package.json` updated.

- [ ] **Step 2: Add env vars to `.env.example`**

Append to `backend/.env.example`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 3: Add the actual values to `backend/.env`** (get both from Supabase dashboard → Project Settings → API)

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/pnpm-lock.yaml backend/.env.example
git commit -m "feat(backend): add supabase-js and archiver dependencies"
```

---

## Task 3: Backend — Anki Compiler Utility

**Files:**
- Create: `backend/src/export/utils/anki-compiler.ts`

This ports the frontend `compileToAnkiHtml` logic so the backend can compile templates fetched from DB.

- [ ] **Step 1: Create the file**

```typescript
import { SupabaseClient } from '@supabase/supabase-js';

type FieldType = 'Word' | 'PartOfSpeech' | 'Phonetic' | 'Definition' | 'Example' | 'Audio' | 'TypeIn' | 'Cloze';

const FIELD_SNIPPETS: Record<FieldType, string> = {
  Word: '<div style="text-align:center; font-size: 24px; font-weight: bold;">{{Word}}</div>',
  PartOfSpeech: '<span style="color: gray; padding-right: 8px;">{{PartOfSpeech}}</span>',
  Phonetic: '<span style="color: gray;">{{Phonetic}}</span>',
  Definition: '<div style="text-align:left; font-size: 18px; margin-top: 12px; margin-bottom: 12px;"><b>Definition:</b> {{Definition}}</div>',
  Example: '<div style="text-align:left; font-style: italic; color: #555; margin-top: 12px; margin-bottom: 12px;">"{{Example}}"</div>',
  Audio: '<div style="margin-top: 16px;">{{Audio}}</div>',
  TypeIn: '<div style="margin-top: 16px;">{{type:Word}}</div>',
  Cloze: '{{cloze:Text}}',
};

interface TemplateRaw {
  name: string;
  isCloze: boolean;
  frontFields: FieldType[];
  backFields: FieldType[];
}

const DEFAULT_TEMPLATES_MAP: Record<string, TemplateRaw> = {
  'default-recognition': {
    name: 'Recognition',
    isCloze: false,
    frontFields: ['Word', 'PartOfSpeech', 'Phonetic'],
    backFields: ['Word', 'Definition', 'Example', 'Audio'],
  },
  'default-production': {
    name: 'Production',
    isCloze: false,
    frontFields: ['Definition'],
    backFields: ['Word', 'PartOfSpeech', 'Phonetic', 'Example', 'Audio'],
  },
  'default-type-in': {
    name: 'Type-In',
    isCloze: false,
    frontFields: ['Definition', 'TypeIn'],
    backFields: ['Definition', 'TypeIn', 'PartOfSpeech', 'Phonetic', 'Example', 'Audio'],
  },
  'default-cloze': {
    name: 'Cloze',
    isCloze: true,
    frontFields: ['Cloze'],
    backFields: ['Cloze', 'Audio'],
  },
};

export interface CompiledTemplate {
  name: string;
  is_cloze: boolean;
  qfmt: string;
  afmt: string;
}

function compileRaw(raw: TemplateRaw): CompiledTemplate {
  if (raw.isCloze) {
    return {
      name: raw.name,
      is_cloze: true,
      qfmt: '{{cloze:Text}}',
      afmt: '{{cloze:Text}}<br><br><div style="text-align:left;">{{Extra}}</div><div style="margin-top:16px;">{{Audio}}</div>',
    };
  }
  return {
    name: raw.name,
    is_cloze: false,
    qfmt: raw.frontFields.map((f) => FIELD_SNIPPETS[f]).join('\n'),
    afmt: raw.backFields.map((f) => FIELD_SNIPPETS[f]).join('\n'),
  };
}

export async function resolveAndCompileTemplates(
  templateIds: string[],
  supabase: SupabaseClient,
): Promise<CompiledTemplate[]> {
  const compiled: CompiledTemplate[] = [];

  for (const id of templateIds) {
    if (id.startsWith('default-')) {
      const raw = DEFAULT_TEMPLATES_MAP[id];
      if (raw) compiled.push(compileRaw(raw));
    }
  }

  const customIds = templateIds.filter((id) => !id.startsWith('default-'));
  if (customIds.length > 0) {
    const { data } = await supabase.from('templates').select('*').in('id', customIds);
    if (data) {
      for (const row of data) {
        compiled.push(
          compileRaw({
            name: row.name,
            isCloze: row.is_cloze,
            frontFields: row.front_fields as FieldType[],
            backFields: row.back_fields as FieldType[],
          }),
        );
      }
    }
  }

  if (compiled.length === 0) {
    compiled.push(compileRaw(DEFAULT_TEMPLATES_MAP['default-recognition']));
  }

  return compiled;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/export/utils/anki-compiler.ts
git commit -m "feat(backend): add anki template compiler utility"
```

---

## Task 4: Backend — New DTOs

**Files:**
- Create: `backend/src/export/dto/export-deck.dto.ts`
- Create: `backend/src/export/dto/export-decks-archive.dto.ts`

- [ ] **Step 1: Create `export-deck.dto.ts`**

```typescript
import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TtsSettingsDto } from './export-anki.dto';

export class ExportDeckDto {
  @IsString()
  deckId: string;

  @IsArray()
  @IsString({ each: true })
  templateIds: string[];

  @ValidateNested()
  @Type(() => TtsSettingsDto)
  ttsSettings: TtsSettingsDto;
}
```

- [ ] **Step 2: Create `export-decks-archive.dto.ts`**

```typescript
import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TtsSettingsDto } from './export-anki.dto';

export class ExportDecksArchiveDto {
  @IsArray()
  @IsString({ each: true })
  deckIds: string[];

  @IsArray()
  @IsString({ each: true })
  templateIds: string[];

  @ValidateNested()
  @Type(() => TtsSettingsDto)
  ttsSettings: TtsSettingsDto;
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/export/dto/export-deck.dto.ts backend/src/export/dto/export-decks-archive.dto.ts
git commit -m "feat(backend): add ExportDeckDto and ExportDecksArchiveDto"
```

---

## Task 5: Backend — Refactor ExportService + Add New Methods

**Files:**
- Modify: `backend/src/export/export.service.ts`

Refactor `generateApkg` to extract a private `buildApkgFile` method. Then add `exportDeck` and `exportDecksArchive` that reuse it.

- [ ] **Step 1: Replace the entire `export.service.ts`**

```typescript
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ExportAnkiDto, CardDataDto, TtsSettingsDto } from './dto/export-anki.dto';
import { ExportDeckDto } from './dto/export-deck.dto';
import { ExportDecksArchiveDto } from './dto/export-decks-archive.dto';
import { CompiledTemplate, resolveAndCompileTemplates } from './utils/anki-compiler';
import { TtsService } from '../tts/tts.service';
import { Accent, Gender } from '../tts/dto/generate-tts.dto';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createReadStream } from 'fs';
import { PassThrough } from 'stream';
import * as archiver from 'archiver';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly httpService: HttpService,
    private readonly ttsService: TtsService,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  private async buildApkgFile(
    deckName: string,
    cards: CardDataDto[],
    ttsSettings: TtsSettingsDto,
    templates: CompiledTemplate[],
    tempDir: string,
  ): Promise<string> {
    const pythonPayload: any = {
      deck_name: deckName,
      deck_uuid: uuidv4(),
      templates,
      cards: [],
    };

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const ttsText = card.example?.trim() || card.word;
      let filepath: string | null = null;

      try {
        const audioBase64 = await this.ttsService.generateAudio(
          ttsText,
          ttsSettings.accent as Accent,
          ttsSettings.gender as Gender,
        );
        const filename = `${card.word}_${i}.webm`.replace(/[^a-z0-9_.]/gi, '_');
        filepath = path.join(tempDir, filename);
        await fs.writeFile(filepath, Buffer.from(audioBase64, 'base64'));
      } catch {
        this.logger.warn(`TTS failed for card "${card.word}", skipping audio.`);
      }

      pythonPayload.cards.push({
        word: card.word,
        partOfSpeech: card.partOfSpeech,
        phonetic: card.phonetic,
        definition: card.definition,
        example: card.example || '',
        audio_path: filepath,
      });
    }

    const pythonServiceUrl = process.env.ANKI_EXPORTER_URL || 'http://127.0.0.1:8000';
    this.logger.log(`Requesting APKG generation for deck: ${deckName}`);
    const response = await firstValueFrom(
      this.httpService.post(`${pythonServiceUrl}/generate`, pythonPayload),
    );
    return response.data.file_path;
  }

  async generateApkg(exportDto: ExportAnkiDto) {
    const tempDir = path.join(process.cwd(), 'temp', `export-${uuidv4()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      const apkgPath = await this.buildApkgFile(
        exportDto.deckName,
        exportDto.cards,
        exportDto.ttsSettings,
        exportDto.templates,
        tempDir,
      );
      const fileStream = createReadStream(apkgPath);
      const cleanup = () =>
        fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      return { fileStream, cleanup };
    } catch (error) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      this.logger.error('Failed to generate APKG:', error);
      throw error;
    }
  }

  async exportDeck(dto: ExportDeckDto) {
    const { data: deck, error: deckError } = await this.supabase
      .from('decks')
      .select('name')
      .eq('id', dto.deckId)
      .single();

    if (deckError || !deck) throw new BadRequestException('Deck not found');

    const { data: rawCards, error: cardsError } = await this.supabase
      .from('saved_cards')
      .select('*')
      .eq('deck_id', dto.deckId)
      .order('created_at', { ascending: true });

    if (cardsError) throw new BadRequestException('Failed to fetch cards');
    if (!rawCards || rawCards.length === 0)
      throw new BadRequestException('Deck has no cards');

    const cards: CardDataDto[] = rawCards.map((c) => ({
      word: c.word,
      partOfSpeech: c.part_of_speech,
      phonetic: c.phonetic || '',
      definition: c.definition,
      example: c.example || '',
    }));

    const templates = await resolveAndCompileTemplates(dto.templateIds, this.supabase);

    const tempDir = path.join(process.cwd(), 'temp', `export-${uuidv4()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      const apkgPath = await this.buildApkgFile(
        deck.name,
        cards,
        dto.ttsSettings,
        templates,
        tempDir,
      );
      const fileStream = createReadStream(apkgPath);
      const cleanup = () =>
        fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      return { fileStream, cleanup, deckName: deck.name };
    } catch (error) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
  }

  async exportDecksArchive(dto: ExportDecksArchiveDto) {
    const templates = await resolveAndCompileTemplates(dto.templateIds, this.supabase);
    const tempDirs: string[] = [];
    const apkgEntries: Array<{ filePath: string; archiveName: string }> = [];

    for (const deckId of dto.deckIds) {
      const { data: deck } = await this.supabase
        .from('decks')
        .select('name')
        .eq('id', deckId)
        .single();
      if (!deck) continue;

      const { data: rawCards } = await this.supabase
        .from('saved_cards')
        .select('*')
        .eq('deck_id', deckId)
        .order('created_at', { ascending: true });
      if (!rawCards || rawCards.length === 0) continue;

      const cards: CardDataDto[] = rawCards.map((c) => ({
        word: c.word,
        partOfSpeech: c.part_of_speech,
        phonetic: c.phonetic || '',
        definition: c.definition,
        example: c.example || '',
      }));

      const tempDir = path.join(process.cwd(), 'temp', `export-${uuidv4()}`);
      await fs.mkdir(tempDir, { recursive: true });
      tempDirs.push(tempDir);

      const apkgPath = await this.buildApkgFile(
        deck.name,
        cards,
        dto.ttsSettings,
        templates,
        tempDir,
      );
      apkgEntries.push({
        filePath: apkgPath,
        archiveName: `${deck.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.apkg`,
      });
    }

    if (apkgEntries.length === 0)
      throw new BadRequestException('No valid decks to export');

    const cleanup = () =>
      Promise.all(
        tempDirs.map((d) => fs.rm(d, { recursive: true, force: true }).catch(() => {})),
      );

    const archive = archiver.create('zip', { zlib: { level: 6 } });
    const passThrough = new PassThrough();
    archive.pipe(passThrough);

    for (const entry of apkgEntries) {
      archive.file(entry.filePath, { name: entry.archiveName });
    }

    archive.on('end', () => cleanup());
    archive.on('error', () => cleanup());
    archive.finalize();

    return { stream: passThrough };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/export/export.service.ts
git commit -m "feat(backend): refactor ExportService, add exportDeck and exportDecksArchive"
```

---

## Task 6: Backend — New Controller Routes

**Files:**
- Modify: `backend/src/export/export.controller.ts`

- [ ] **Step 1: Replace `export.controller.ts`**

```typescript
import { Controller, Post, Body, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ExportService } from './export.service';
import { ExportAnkiDto } from './dto/export-anki.dto';
import { ExportDeckDto } from './dto/export-deck.dto';
import { ExportDecksArchiveDto } from './dto/export-decks-archive.dto';
import { SupabaseAuthGuard } from '../guards/supabase-auth.guard';

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('anki')
  @UseGuards(SupabaseAuthGuard)
  async exportAnki(
    @Body() exportDto: ExportAnkiDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { fileStream, cleanup } = await this.exportService.generateApkg(exportDto);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${exportDto.deckName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'deck'}.apkg"`,
    });
    res.on('finish', () => cleanup());
    res.on('close', () => cleanup());
    return new StreamableFile(fileStream);
  }

  @Post('deck')
  @UseGuards(SupabaseAuthGuard)
  async exportDeck(
    @Body() dto: ExportDeckDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { fileStream, cleanup, deckName } = await this.exportService.exportDeck(dto);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${deckName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.apkg"`,
    });
    res.on('finish', () => cleanup());
    res.on('close', () => cleanup());
    return new StreamableFile(fileStream);
  }

  @Post('decks/archive')
  @UseGuards(SupabaseAuthGuard)
  async exportDecksArchive(
    @Body() dto: ExportDecksArchiveDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream } = await this.exportService.exportDecksArchive(dto);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="lexis_decks.zip"',
    });
    return new StreamableFile(stream);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start backend and smoke-test existing endpoint still works**

```bash
cd backend && pnpm start:dev
# In another terminal:
curl -X POST http://localhost:3000/export/deck \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer INVALID_TOKEN" \
  -d '{"deckId":"test","templateIds":[],"ttsSettings":{"accent":"US","gender":"FEMALE"}}'
```

Expected: `401 Unauthorized` (auth guard is working).

- [ ] **Step 4: Commit**

```bash
git add backend/src/export/export.controller.ts
git commit -m "feat(backend): add POST /export/deck and POST /export/decks/archive routes"
```

---

## Task 7: Frontend — Deck Types

**Files:**
- Create: `frontend/lib/types/deck.ts`

- [ ] **Step 1: Create the file**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/types/deck.ts
git commit -m "feat(frontend): add Deck and SavedCard types"
```

---

## Task 8: Frontend — useDecks Hook

**Files:**
- Create: `frontend/hooks/useDecks.ts`

- [ ] **Step 1: Create the file**

```typescript
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { Deck } from '@/lib/types/deck';

export function useDecks() {
  const { user, isLoading: authLoading } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchDecks = useCallback(async () => {
    if (!user) {
      setDecks([]);
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('decks')
        .select('*, saved_cards(count)')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setDecks(
        (data || []).map((d) => ({
          id: d.id,
          name: d.name,
          cardCount: (d.saved_cards as any[])[0]?.count ?? 0,
          createdAt: d.created_at,
        })),
      );
    } catch (err) {
      console.error('Error loading decks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (authLoading) return;
    fetchDecks();
  }, [authLoading, fetchDecks]);

  const createDeck = async (name: string): Promise<Deck | null> => {
    if (!user) return null;
    if (decks.length >= 15) {
      toast.error('Maximum of 15 decks reached.');
      return null;
    }
    const trimmed = name.trim().slice(0, 50);
    if (!trimmed) return null;

    try {
      const { data, error } = await supabase
        .from('decks')
        .insert({ user_id: user.id, name: trimmed })
        .select()
        .single();
      if (error) throw error;
      const newDeck: Deck = { id: data.id, name: data.name, cardCount: 0, createdAt: data.created_at };
      setDecks((prev) => [...prev, newDeck]);
      return newDeck;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create deck.');
      return null;
    }
  };

  const renameDeck = async (id: string, name: string) => {
    const trimmed = name.trim().slice(0, 50);
    if (!trimmed) return;
    const previous = decks;
    setDecks((prev) => prev.map((d) => (d.id === id ? { ...d, name: trimmed } : d)));
    try {
      const { error } = await supabase
        .from('decks')
        .update({ name: trimmed, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    } catch {
      toast.error('Failed to rename deck.');
      setDecks(previous);
    }
  };

  const deleteDeck = async (id: string) => {
    const previous = decks;
    setDecks((prev) => prev.filter((d) => d.id !== id));
    try {
      const { error } = await supabase.from('decks').delete().eq('id', id);
      if (error) throw error;
    } catch {
      toast.error('Failed to delete deck.');
      setDecks(previous);
    }
  };

  const incrementCardCount = (deckId: string, by: number) => {
    setDecks((prev) =>
      prev.map((d) => (d.id === deckId ? { ...d, cardCount: d.cardCount + by } : d)),
    );
  };

  return { decks, isLoading, createDeck, renameDeck, deleteDeck, incrementCardCount, refetch: fetchDecks };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/hooks/useDecks.ts
git commit -m "feat(frontend): add useDecks hook"
```

---

## Task 9: Frontend — useDeckCards Hook

**Files:**
- Create: `frontend/hooks/useDeckCards.ts`

- [ ] **Step 1: Create the file**

```typescript
"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { SavedCard } from '@/lib/types/deck';

export function useDeckCards(deckId: string) {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchCards = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_cards')
        .select('*')
        .eq('deck_id', deckId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setCards(
        (data || []).map((c) => ({
          id: c.id,
          deckId: c.deck_id,
          word: c.word,
          partOfSpeech: c.part_of_speech,
          phonetic: c.phonetic,
          definition: c.definition,
          example: c.example,
          createdAt: c.created_at,
        })),
      );
    } catch (err) {
      console.error('Error loading cards:', err);
    } finally {
      setIsLoading(false);
    }
  }, [deckId, supabase]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const removeCard = async (cardId: string) => {
    const previous = cards;
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    try {
      const { error } = await supabase.from('saved_cards').delete().eq('id', cardId);
      if (error) throw error;
    } catch {
      toast.error('Failed to remove card.');
      setCards(previous);
    }
  };

  return { cards, isLoading, removeCard };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/hooks/useDeckCards.ts
git commit -m "feat(frontend): add useDeckCards hook"
```

---

## Task 10: Frontend — useSaveToDecks Hook

**Files:**
- Create: `frontend/hooks/useSaveToDecks.ts`

- [ ] **Step 1: Create the file**

```typescript
"use client";

import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';

export interface CardToSave {
  word: string;
  partOfSpeech: string;
  phonetic: string;
  definition: string;
  example: string;
}

export function useSaveToDecks() {
  const { user } = useAuth();
  const supabase = createClient();

  const saveCards = async (
    deckId: string,
    deckCardCount: number,
    cards: CardToSave[],
  ): Promise<boolean> => {
    if (!user) {
      toast.error('Please sign in to save cards.');
      return false;
    }
    if (deckCardCount + cards.length > 50) {
      toast.error(`This deck can only hold ${50 - deckCardCount} more card(s).`);
      return false;
    }

    const { data: existing } = await supabase
      .from('saved_cards')
      .select('word, definition')
      .eq('deck_id', deckId);

    const existingSet = new Set(
      (existing || []).map((c) => `${c.word}::${c.definition}`),
    );
    const duplicateCount = cards.filter((c) =>
      existingSet.has(`${c.word}::${c.definition}`),
    ).length;

    if (duplicateCount > 0) {
      toast.warning(`${duplicateCount} duplicate(s) found — saving anyway.`);
    }

    const rows = cards.map((c) => ({
      user_id: user.id,
      deck_id: deckId,
      word: c.word,
      part_of_speech: c.partOfSpeech,
      phonetic: c.phonetic || null,
      definition: c.definition,
      example: c.example || null,
    }));

    const { error } = await supabase.from('saved_cards').insert(rows);
    if (error) {
      toast.error(error.message || 'Failed to save cards.');
      return false;
    }

    toast.success(`${cards.length} card(s) saved to deck!`);
    return true;
  };

  return { saveCards };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/hooks/useSaveToDecks.ts
git commit -m "feat(frontend): add useSaveToDecks hook with duplicate detection"
```

---

## Task 11: Frontend — Add API Methods

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Add `exportDeck` and `exportDecksArchive` to `LexisApi` in `frontend/lib/api.ts`**

Append inside the `LexisApi` object, after `exportAnki`:

```typescript
  async exportDeck(payload: {
    deckId: string;
    templateIds: string[];
    ttsSettings: { accent: string; gender: string };
  }): Promise<Blob> {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    const response = await fetch(`${API_BASE_URL}/export/deck`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData.message || 'Failed to export deck.');
    }
    return response.blob();
  },

  async exportDecksArchive(payload: {
    deckIds: string[];
    templateIds: string[];
    ttsSettings: { accent: string; gender: string };
  }): Promise<Blob> {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    const response = await fetch(`${API_BASE_URL}/export/decks/archive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData.message || 'Failed to export archive.');
    }
    return response.blob();
  },
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat(frontend): add exportDeck and exportDecksArchive to LexisApi"
```

---

## Task 12: Frontend — Install shadcn Popover + Command

**Files:**
- Create: `frontend/components/ui/popover.tsx` (auto-generated by shadcn)
- Create: `frontend/components/ui/command.tsx` (auto-generated by shadcn)

- [ ] **Step 1: Install components**

```bash
cd frontend && npx shadcn@latest add popover command
```

Expected: two new files appear in `frontend/components/ui/`.

- [ ] **Step 2: Commit**

```bash
git add frontend/components/ui/popover.tsx frontend/components/ui/command.tsx
git commit -m "feat(frontend): add shadcn popover and command components"
```

---

## Task 13: Frontend — DeckCombobox Component

**Files:**
- Create: `frontend/components/DeckCombobox.tsx`

- [ ] **Step 1: Create the file**

```tsx
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
}

export function DeckCombobox({
  decks,
  selectedDeckId,
  onSelectDeck,
  onCreateDeck,
  isLoading,
}: DeckComboboxProps) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const selectedDeck = decks.find((d) => d.id === selectedDeckId);
  const canCreateMore = decks.length < 15;

  const handleCreate = async () => {
    if (!newDeckName.trim()) return;
    setIsCreating(true);
    await onCreateDeck(newDeckName.trim());
    setNewDeckName("");
    setShowCreate(false);
    setIsCreating(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
            {canCreateMore && (
              <>
                <CommandSeparator />
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
                    <CommandItem onSelect={() => setShowCreate(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create new deck
                    </CommandItem>
                  )}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/DeckCombobox.tsx
git commit -m "feat(frontend): add DeckCombobox component"
```

---

## Task 14: Frontend — Wire Deck State into useLexisAutomator + Modify ExportBar

**Files:**
- Modify: `frontend/hooks/useLexisAutomator.ts`
- Modify: `frontend/components/ExportBar.tsx`

- [ ] **Step 1: Add deck imports and state to `useLexisAutomator.ts`**

Add at the top of the imports block:
```typescript
import { useDecks } from "./useDecks";
import { useSaveToDecks, CardToSave } from "./useSaveToDecks";
import { parseDefId } from "@/lib/utils/dictionary";
```

Add inside the hook body after the TTS settings block:
```typescript
  const { decks, isLoading: decksLoading, createDeck, incrementCardCount } = useDecks();
  const { saveCards } = useSaveToDecks();
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
```

Add the `handleSaveToDeck` handler after `handleDownload`:
```typescript
  const handleSaveToDeck = async () => {
    if (!wordData || !selectedDeckId) return;
    const deck = decks.find((d) => d.id === selectedDeckId);
    if (!deck) return;

    const cards: CardToSave[] = [];
    for (const defId of selectedDefs) {
      const { mIdx, dIdx } = parseDefId(defId);
      const meaning = wordData.meanings[mIdx];
      const def = meaning?.definitions[dIdx];
      if (!def) continue;
      cards.push({
        word: wordData.word,
        partOfSpeech: meaning.partOfSpeech,
        phonetic: wordData.phonetics?.find((p) => p.text)?.text || "",
        definition: def.definition,
        example: def.example || "",
      });
    }

    setIsSaving(true);
    const success = await saveCards(selectedDeckId, deck.cardCount, cards);
    if (success) incrementCardCount(selectedDeckId, cards.length);
    setIsSaving(false);
  };
```

Add to the return object:
```typescript
    decks,
    decksLoading,
    selectedDeckId,
    setSelectedDeckId,
    isSaving,
    handleSaveToDeck,
    createDeck,
```

- [ ] **Step 2: Update `ExportBar.tsx` — add new props and UI**

Replace the entire file:

```tsx
"use client";

import React from "react";
import { Download, Loader2, Sparkles, BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomTemplate } from "@/hooks/useTemplates";
import { DeckCombobox } from "@/components/DeckCombobox";
import { Deck } from "@/lib/types/deck";

interface ExportBarProps {
  selectedCount: number;
  missingExamplesCount: number;
  accent: string;
  gender: string;
  onAccentChange: (value: string) => void;
  onGenderChange: (value: string) => void;
  templates: CustomTemplate[];
  isLoaded: boolean;
  selectedTemplateIds: string[];
  onTemplateToggle: (id: string) => void;
  isExporting: boolean;
  isGeneratingAll: boolean;
  onDownload: () => void;
  onGenerateAllMissing: () => void;
  // Deck props
  decks: Deck[];
  decksLoading: boolean;
  selectedDeckId: string | null;
  onSelectDeck: (id: string) => void;
  onCreateDeck: (name: string) => Promise<void>;
  isSaving: boolean;
  onSaveToDeck: () => void;
}

export function ExportBar({
  selectedCount,
  missingExamplesCount,
  accent,
  gender,
  onAccentChange,
  onGenderChange,
  templates,
  isLoaded,
  selectedTemplateIds,
  onTemplateToggle,
  isExporting,
  isGeneratingAll,
  onDownload,
  onGenerateAllMissing,
  decks,
  decksLoading,
  selectedDeckId,
  onSelectDeck,
  onCreateDeck,
  isSaving,
  onSaveToDeck,
}: ExportBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-50">
      <div className="max-w-4xl mx-auto flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
          <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-bold shrink-0">
            {selectedCount} Selected
          </span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="hidden sm:inline">TTS:</span>
          <Select value={accent} onValueChange={onAccentChange}>
            <SelectTrigger className="w-[110px] h-9">
              <SelectValue placeholder="Accent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="US">American</SelectItem>
              <SelectItem value="GB">British</SelectItem>
            </SelectContent>
          </Select>
          <Select value={gender} onValueChange={onGenderChange}>
            <SelectTrigger className="w-[100px] h-9">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="MALE">Male</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-slate-500 font-medium">Templates:</span>
            {isLoaded ? (
              templates.map((t) => (
                <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={selectedTemplateIds.includes(t.id)}
                    onCheckedChange={() => onTemplateToggle(t.id)}
                  />
                  <span className="text-slate-700">{t.name}</span>
                </label>
              ))
            ) : (
              <span className="text-slate-400 text-sm">Loading templates...</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
            {missingExamplesCount > 0 && (
              <Button
                onClick={onGenerateAllMissing}
                disabled={isGeneratingAll || isExporting}
                variant="outline"
                className="flex-1 md:flex-none h-10 px-4 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                {isGeneratingAll ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating {missingExamplesCount}...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Generate {missingExamplesCount} Missing</>
                )}
              </Button>
            )}

            <div className="flex items-center gap-2">
              <DeckCombobox
                decks={decks}
                selectedDeckId={selectedDeckId}
                onSelectDeck={onSelectDeck}
                onCreateDeck={onCreateDeck}
                isLoading={decksLoading}
              />
              <Button
                onClick={onSaveToDeck}
                disabled={isSaving || !selectedDeckId}
                variant="outline"
                className="h-10 px-4 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
              >
                {isSaving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><BookmarkPlus className="mr-2 h-4 w-4" /> Add to Deck</>
                )}
              </Button>
            </div>

            <Button
              onClick={onDownload}
              disabled={isExporting || isGeneratingAll}
              className="flex-1 md:flex-none h-10 px-8 bg-indigo-600 hover:bg-indigo-700 shadow-md"
            >
              {isExporting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><Download className="mr-2 h-4 w-4" /> Download Anki Deck</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `app/page.tsx` to pass the new ExportBar props**

In `frontend/app/page.tsx`, destructure the new values from `useLexisAutomator` and pass them to `ExportBar`:

```tsx
  const {
    // ... existing destructured values ...
    decks,
    decksLoading,
    selectedDeckId,
    setSelectedDeckId,
    isSaving,
    handleSaveToDeck,
    createDeck,
  } = useLexisAutomator();
```

Add to the `<ExportBar>` JSX:
```tsx
        decks={decks}
        decksLoading={decksLoading}
        selectedDeckId={selectedDeckId}
        onSelectDeck={setSelectedDeckId}
        onCreateDeck={async (name) => { await createDeck(name); }}
        isSaving={isSaving}
        onSaveToDeck={handleSaveToDeck}
```

- [ ] **Step 4: Start frontend dev server and verify the ExportBar renders without errors**

```bash
cd frontend && pnpm dev
```

Open `http://localhost:3001` (or whichever port), search a word, select a definition. The ExportBar should show the deck combobox and "Add to Deck" button. Sign in to see decks load.

- [ ] **Step 5: Commit**

```bash
git add frontend/hooks/useLexisAutomator.ts frontend/components/ExportBar.tsx frontend/app/page.tsx
git commit -m "feat(frontend): wire deck save flow into ExportBar"
```

---

## Task 15: Frontend — Add My Decks Nav Link

**Files:**
- Modify: `frontend/components/SearchHeader.tsx`

- [ ] **Step 1: Add Library icon link to `SearchHeader.tsx`**

In the imports, add `Library` to the lucide-react import:
```typescript
import { Search, CheckCircle2, LayoutTemplate, User, Library } from "lucide-react";
```

After the existing `LayoutTemplate` link (line 45–49), add:
```tsx
          <Link href="/decks" className="ml-1">
            <Button variant="ghost" size="icon" className="text-slate-500 hover:bg-indigo-50 hover:text-indigo-600">
              <Library size={20} />
            </Button>
          </Link>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/SearchHeader.tsx
git commit -m "feat(frontend): add My Decks nav link to SearchHeader"
```

---

## Task 16: Frontend — /decks Page

**Files:**
- Create: `frontend/app/decks/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Library,
  Download,
  Trash2,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDecks } from "@/hooks/useDecks";
import { useTemplates } from "@/hooks/useTemplates";
import { useAuth } from "@/components/AuthProvider";
import { LexisApi } from "@/lib/api";
import { toast } from "sonner";

export default function DecksPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { decks, isLoading, deleteDeck } = useDecks();
  const { templates, isLoaded: templatesLoaded } = useTemplates();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [bulkTemplateIds, setBulkTemplateIds] = useState<string[]>(["default-recognition"]);
  const [bulkAccent, setBulkAccent] = useState("US");
  const [bulkGender, setBulkGender] = useState("FEMALE");

  if (authLoading) return null;
  if (!user) {
    router.push("/login");
    return null;
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleBulkTemplate = (id: string) => {
    setBulkTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleBulkDownload = async () => {
    if (selectedIds.size < 2) return;
    setIsExporting(true);
    try {
      const blob = await LexisApi.exportDecksArchive({
        deckIds: Array.from(selectedIds),
        templateIds: bulkTemplateIds,
        ttsSettings: { accent: bulkAccent, gender: bulkGender },
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "lexis_decks.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Archive downloaded!");
    } catch (err: any) {
      toast.error(err.message || "Failed to download archive.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    await deleteDeck(id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Library className="h-7 w-7 text-indigo-600" />
          <h1 className="text-2xl font-bold text-indigo-900">My Decks</h1>
          <Badge variant="outline" className="ml-auto">
            {decks.length}/15
          </Badge>
        </div>

        {decks.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <Library className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600">No decks yet</h3>
            <p className="text-slate-500 mb-4">
              Search for a word and save your first card.
            </p>
            <Link href="/">
              <Button className="bg-indigo-600 hover:bg-indigo-700">Go to Search</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {decks.map((deck) => (
              <Link key={deck.id} href={`/decks/${deck.id}`}>
                <Card className="hover:border-indigo-300 transition-all cursor-pointer">
                  <CardHeader className="py-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedIds.has(deck.id)}
                        onCheckedChange={() => toggleSelect(deck.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{deck.name}</p>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {deck.cardCount} card{deck.cardCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={deck.cardCount >= 50 ? "border-red-200 text-red-600" : ""}
                      >
                        {deck.cardCount}/50
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="py-0 pb-4 flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-red-500"
                      onClick={(e) => handleDelete(deck.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {selectedIds.size >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-50">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-slate-600">
              {selectedIds.size} decks selected
            </span>
            <div className="flex flex-wrap gap-3 items-center text-sm">
              <span className="text-slate-500">Templates:</span>
              {templatesLoaded &&
                templates.slice(0, 4).map((t) => (
                  <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={bulkTemplateIds.includes(t.id)}
                      onCheckedChange={() => toggleBulkTemplate(t.id)}
                    />
                    <span className="text-slate-700">{t.name}</span>
                  </label>
                ))}
              <Select value={bulkAccent} onValueChange={setBulkAccent}>
                <SelectTrigger className="w-[110px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">American</SelectItem>
                  <SelectItem value="GB">British</SelectItem>
                </SelectContent>
              </Select>
              <Select value={bulkGender} onValueChange={setBulkGender}>
                <SelectTrigger className="w-[100px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="MALE">Male</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleBulkDownload}
              disabled={isExporting}
              className="ml-auto bg-indigo-600 hover:bg-indigo-700"
            >
              {isExporting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><Download className="mr-2 h-4 w-4" /> Download {selectedIds.size} Decks as ZIP</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the page renders at `/decks`** — start dev server, navigate to the page, confirm empty state shows for a new user.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/decks/page.tsx
git commit -m "feat(frontend): add /decks page with multi-select bulk download"
```

---

## Task 17: Frontend — /decks/[id] Page

**Files:**
- Create: `frontend/app/decks/[id]/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
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
  const { cards, isLoading: cardsLoading, removeCard } = useDeckCards(deckId);
  const { templates, isLoaded: templatesLoaded } = useTemplates();

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(["default-recognition"]);
  const [accent, setAccent] = useState("US");
  const [gender, setGender] = useState("FEMALE");
  const [isExporting, setIsExporting] = useState(false);

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
        {/* Header */}
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

        {/* Download settings */}
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

        {/* Cards table */}
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
    </div>
  );
}
```

- [ ] **Step 2: Verify the page renders** — navigate to `/decks/[some-real-id]`, confirm deck name, card table, and download button are visible.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/decks/\[id\]/page.tsx
git commit -m "feat(frontend): add /decks/[id] detail page with card table and download"
```

---

## Self-Review Checklist

- **Spec coverage:**
  - ✅ DB: `decks` + `saved_cards` tables with triggers — Task 1
  - ✅ 15 deck / 50 card limits — Task 1 (DB triggers) + Tasks 8/10 (client guards)
  - ✅ Duplicate detection + toast warning — Task 10 (`useSaveToDecks`)
  - ✅ Searchable deck dropdown in ExportBar — Tasks 12/13/14
  - ✅ "Add to Deck" button — Task 14
  - ✅ `/decks` page with deck list, multi-select, bulk ZIP download — Task 16
  - ✅ `/decks/[id]` page with card table, rename, delete, single download — Task 17
  - ✅ My Decks nav link — Task 15
  - ✅ Backend `POST /export/deck` — Tasks 5/6
  - ✅ Backend `POST /export/decks/archive` — Tasks 5/6
  - ✅ Templates selected at download time — Tasks 16/17 (template checkboxes on both pages)

- **Type consistency:** `CardDataDto` used in Tasks 5/6 matches the class defined in `export-anki.dto.ts`. `CompiledTemplate` exported from `anki-compiler.ts` in Task 3 and consumed in Task 5. `Deck`/`SavedCard` defined in Task 7 and used in Tasks 8/9/10/13/14/16/17.

- **No placeholders:** All steps contain actual code or exact commands.
