import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

type FieldType = 'Word' | 'PartOfSpeech' | 'Phonetic' | 'Definition' | 'Example' | 'Audio' | 'Image' | 'TypeIn' | 'Cloze';

const FIELD_SNIPPETS: Record<FieldType, string> = {
  Word: '<div style="text-align:center; font-size: 24px; font-weight: bold;">{{Word}}</div>',
  PartOfSpeech: '<span style="color: gray; padding-right: 8px;">{{PartOfSpeech}}</span>',
  Phonetic: '<span style="color: gray;">{{Phonetic}}</span>',
  Definition: '<div style="text-align:left; font-size: 18px; margin-top: 12px; margin-bottom: 12px;"><b>Definition:</b> {{Definition}}</div>',
  Example: '<div style="text-align:left; font-style: italic; color: #555; margin-top: 12px; margin-bottom: 12px;">"{{Example}}"</div>',
  Audio: '<div style="margin-top: 16px;">{{Audio}}</div>',
  Image: '<div style="margin-top: 12px; text-align: center;">{{#Image}}{{Image}}{{/Image}}</div>',
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
    backFields: ['Word', 'Definition', 'Example', 'Image', 'Audio'],
  },
  'default-production': {
    name: 'Production',
    isCloze: false,
    frontFields: ['Definition'],
    backFields: ['Word', 'PartOfSpeech', 'Phonetic', 'Example', 'Image', 'Audio'],
  },
  'default-type-in': {
    name: 'Type-In',
    isCloze: false,
    frontFields: ['Definition', 'TypeIn'],
    backFields: ['Definition', 'TypeIn', 'PartOfSpeech', 'Phonetic', 'Example', 'Image', 'Audio'],
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
  supabase: SupabaseClient<Database>,
): Promise<CompiledTemplate[]> {
  const resultMap = new Map<string, CompiledTemplate>();

  const customIds = templateIds.filter((id) => !id.startsWith('default-'));
  if (customIds.length > 0) {
    const { data } = await supabase.from('templates').select('*').in('id', customIds);
    if (data) {
      for (const row of data) {
        resultMap.set(
          row.id,
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

  const compiled = templateIds
    .map((id) => {
      if (id.startsWith('default-')) {
        const raw = DEFAULT_TEMPLATES_MAP[id];
        return raw ? compileRaw(raw) : null;
      }
      return resultMap.get(id) ?? null;
    })
    .filter((t): t is CompiledTemplate => t !== null);

  if (compiled.length === 0) {
    compiled.push(compileRaw(DEFAULT_TEMPLATES_MAP['default-recognition']));
  }

  return compiled;
}
