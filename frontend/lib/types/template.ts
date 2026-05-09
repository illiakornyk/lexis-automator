export type FieldType =
  | 'Word'
  | 'PartOfSpeech'
  | 'Phonetic'
  | 'Definition'
  | 'Example'
  | 'Audio'
  | 'Image'
  | 'Cloze'
  | 'TypeIn';

export interface CustomTemplate {
  id: string;
  name: string;
  isCloze: boolean;
  frontFields: FieldType[];
  backFields: FieldType[];
}

export const DEFAULT_TEMPLATES: CustomTemplate[] = [
  {
    id: 'default-recognition',
    name: 'Recognition',
    isCloze: false,
    frontFields: ['Word', 'PartOfSpeech', 'Phonetic'],
    backFields: ['Word', 'Definition', 'Example', 'Audio'],
  },
  {
    id: 'default-production',
    name: 'Production',
    isCloze: false,
    frontFields: ['Definition'],
    backFields: ['Word', 'PartOfSpeech', 'Phonetic', 'Example', 'Audio'],
  },
  {
    id: 'default-type-in',
    name: 'Type-In',
    isCloze: false,
    frontFields: ['Definition', 'TypeIn'],
    backFields: ['Definition', 'TypeIn', 'PartOfSpeech', 'Phonetic', 'Example', 'Audio'],
  },
  {
    id: 'default-cloze',
    name: 'Cloze',
    isCloze: true,
    frontFields: ['Cloze'],
    backFields: ['Cloze', 'Audio'],
  },
];
