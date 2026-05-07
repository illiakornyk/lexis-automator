import { CustomTemplate, FieldType } from '@/hooks/useTemplates';

const FIELD_SNIPPETS: Record<FieldType, string> = {
  Word: '<div class="lx-word">{{Word}}</div>',
  PartOfSpeech: '<div class="lx-meta"><span class="lx-pos">{{PartOfSpeech}}</span></div>',
  Phonetic: '<div class="lx-meta"><span class="lx-phonetic">{{Phonetic}}</span></div>',
  Definition: '<div class="lx-definition"><b>Definition:</b> {{Definition}}</div>',
  Example: '<div class="lx-example">&ldquo;{{Example}}&rdquo;</div>',
  Audio: '<div class="lx-audio">{{Audio}}</div>',
  Image: '<div class="lx-image">{{#Image}}{{Image}}{{/Image}}</div>',
  TypeIn: '<div class="lx-typein">{{type:Word}}</div>',
  Cloze: '{{cloze:Text}}',
};

export function compileToAnkiHtml(template: CustomTemplate) {
  let qfmt = '';
  let afmt = '';

  if (template.isCloze) {
    // Cloze is highly specific in Anki, so we enforce its template structure
    qfmt = '{{cloze:Text}}';
    afmt = '{{cloze:Text}}<br><br><div style="text-align:left;">{{Extra}}</div><div style="margin-top:16px;">{{Audio}}</div>';
  } else {
    // Generate Front (Question format)
    qfmt = template.frontFields.map((field) => FIELD_SNIPPETS[field]).join('\n');
    
    // Generate Back (Answer format)
    // In Anki, it's common to show the front side on the back, separated by an HR.
    // If we want to emulate Anki's default behavior, we could prepend {{FrontSide}}<hr id="answer">.
    // But since this is a visual builder where they explicitly define the back fields, 
    // we will strictly render what they dropped in the Back Canvas.
    
    let backHtml = template.backFields.map((field) => FIELD_SNIPPETS[field]).join('\n');
    
    // Anki requires an <hr id="answer"> to separate front/back visually if {{FrontSide}} is used,
    // but since we are redefining the whole back, we just use the raw blocks.
    // However, if there's a TypeIn field, Anki expects it on both front and back.
    afmt = backHtml;
  }

  return {
    name: template.name,
    is_cloze: template.isCloze,
    qfmt,
    afmt,
  };
}
