"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Tables } from '@/lib/types/database.types';
import type { CustomTemplate, FieldType } from '@/lib/types/template';
import { DEFAULT_TEMPLATES } from '@/lib/types/template';

export function useTemplates() {
    const { user, isLoading: authLoading } = useAuth();
    const [templates, setTemplates] = useState<CustomTemplate[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const supabase = createClient();

    const mapDbToTemplate = (row: Tables<'templates'>): CustomTemplate => ({
        id: row.id,
        name: row.name,
        isCloze: row.is_cloze,
        frontFields: row.front_fields as FieldType[],
        backFields: row.back_fields as FieldType[],
    });

    useEffect(() => {
        if (authLoading) return;

        const loadTemplates = async () => {
            if (!user) {
                // Logged out: use localStorage
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
                return;
            }

            // Logged in: fetch from Supabase
            try {
                const { data, error } = await supabase
                    .from('templates')
                    .select('*')
                    .order('created_at', { ascending: true });

                if (error) throw error;

                // Auto-migrate local templates if DB is empty
                const stored = localStorage.getItem('lexis-automator-templates');
                if (stored && (!data || data.length === 0)) {
                    try {
                        const parsed = JSON.parse(stored) as CustomTemplate[];
                        const customOnly = parsed.filter(t => !t.id.startsWith('default-'));

                        if (customOnly.length > 0) {
                            const inserts = customOnly.map(t => ({
                                user_id: user.id,
                                name: t.name,
                                is_cloze: t.isCloze,
                                front_fields: t.frontFields,
                                back_fields: t.backFields
                            }));

                            const { error: insertError } = await supabase.from('templates').insert(inserts);
                            if (!insertError) {
                                toast.success("Successfully synced your local templates to the cloud!");
                                // Re-fetch after insert
                                const { data: newData } = await supabase.from('templates').select('*').order('created_at', { ascending: true });
                                if (newData) {
                                    setTemplates([...DEFAULT_TEMPLATES, ...newData.map(mapDbToTemplate)]);
                                    setIsLoaded(true);
                                    return;
                                }
                            }
                        }
                    } catch (e) {
                        console.error("Migration failed", e);
                    }
                }

                if (data && data.length > 0) {
                    setTemplates([...DEFAULT_TEMPLATES, ...data.map(mapDbToTemplate)]);
                } else {
                    setTemplates(DEFAULT_TEMPLATES);
                }
            } catch (err) {
                console.error("Error loading templates:", err);
                setTemplates(DEFAULT_TEMPLATES);
            } finally {
                setIsLoaded(true);
            }
        };

        loadTemplates();
    }, [user, authLoading, supabase]);

    const addTemplate = async (template: CustomTemplate) => {
        // Optimistic UI update
        setTemplates(prev => [...prev, template]);

        if (!user) {
            const newTemplates = [...templates, template];
            localStorage.setItem('lexis-automator-templates', JSON.stringify(newTemplates));
            return;
        }

        try {
            const { data, error } = await supabase.from('templates').insert({
                user_id: user.id,
                name: template.name,
                is_cloze: template.isCloze,
                front_fields: template.frontFields,
                back_fields: template.backFields,
            }).select().single();

            if (error) throw error;

            // Update with the real UUID from DB
            if (data) {
                setTemplates(prev => prev.map(t => t.id === template.id ? mapDbToTemplate(data) : t));
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to save template to cloud";
            toast.error(message);
            console.error(error);
            // Revert optimistic update
            setTemplates(templates);
        }
    };

    const updateTemplate = async (updatedTemplate: CustomTemplate) => {
        // Optimistic UI update
        setTemplates(prev => prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));

        if (!user) {
            const newTemplates = templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t);
            localStorage.setItem('lexis-automator-templates', JSON.stringify(newTemplates));
            return;
        }

        if (updatedTemplate.id.startsWith('default-')) return; // Safety check

        try {
            const { error } = await supabase
                .from('templates')
                .update({
                    name: updatedTemplate.name,
                    is_cloze: updatedTemplate.isCloze,
                    front_fields: updatedTemplate.frontFields,
                    back_fields: updatedTemplate.backFields,
                })
                .eq('id', updatedTemplate.id)
                .eq('user_id', user.id);

            if (error) throw error;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to update template in cloud";
            toast.error(message);
            console.error(error);
            // Revert optimistic update
            setTemplates(templates);
        }
    };

    const deleteTemplate = async (id: string) => {
        if (id.startsWith('default-')) return; // Safety check

        // Optimistic UI update
        setTemplates(prev => prev.filter(t => t.id !== id));

        if (!user) {
            const newTemplates = templates.filter(t => t.id !== id);
            localStorage.setItem('lexis-automator-templates', JSON.stringify(newTemplates));
            return;
        }

        try {
            const { error } = await supabase
                .from('templates')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to delete template from cloud";
            toast.error(message);
            console.error(error);
            // Revert optimistic update
            setTemplates(templates);
        }
    };

    return {
        templates,
        isLoaded,
        addTemplate,
        updateTemplate,
        deleteTemplate
    };
}
