import { useState, useEffect } from 'react';

export type FieldType = 'Word' | 'PartOfSpeech' | 'Phonetic' | 'Definition' | 'Example' | 'Audio' | 'Cloze' | 'TypeIn';

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
    backFields: ['Word', 'Definition', 'Example', 'Audio']
  },
  {
    id: 'default-production',
    name: 'Production',
    isCloze: false,
    frontFields: ['Definition'],
    backFields: ['Word', 'PartOfSpeech', 'Phonetic', 'Example', 'Audio']
  },
  {
    id: 'default-type-in',
    name: 'Type-In',
    isCloze: false,
    frontFields: ['Definition', 'TypeIn'],
    backFields: ['Definition', 'TypeIn', 'PartOfSpeech', 'Phonetic', 'Example', 'Audio']
  },
  {
    id: 'default-cloze',
    name: 'Cloze',
    isCloze: true,
    frontFields: ['Cloze'],
    backFields: ['Cloze', 'Audio']
  }
];

export function useTemplates() {
  const [templates, setTemplates] = useState<CustomTemplate[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load from local storage
    const stored = localStorage.getItem('lexis-automator-templates');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTemplates(parsed);
        } else {
           setTemplates(DEFAULT_TEMPLATES);
        }
      } catch (e) {
        setTemplates(DEFAULT_TEMPLATES);
      }
    } else {
      setTemplates(DEFAULT_TEMPLATES);
    }
    setIsLoaded(true);
  }, []);

  const saveTemplates = (newTemplates: CustomTemplate[]) => {
    setTemplates(newTemplates);
    localStorage.setItem('lexis-automator-templates', JSON.stringify(newTemplates));
  };

  const addTemplate = (template: CustomTemplate) => {
    saveTemplates([...templates, template]);
  };

  const updateTemplate = (updatedTemplate: CustomTemplate) => {
    saveTemplates(templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
  };

  const deleteTemplate = (id: string) => {
    saveTemplates(templates.filter(t => t.id !== id));
  };

  return {
    templates,
    isLoaded,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    saveTemplates
  };
}
