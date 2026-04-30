"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { ArrowLeft, Save, Plus, Trash2, GripVertical } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { useTemplates, CustomTemplate, FieldType } from "@/hooks/useTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { DraggablePaletteItem } from "./DraggablePaletteItem";
import { DroppableCanvas } from "./DroppableCanvas";
import { SortableField } from "./SortableField";

const AVAILABLE_FIELDS: FieldType[] = [
  "Word",
  "PartOfSpeech",
  "Phonetic",
  "Definition",
  "Example",
  "Audio",
  "TypeIn",
  "Cloze",
];

interface CanvasItem {
  id: string;
  type: FieldType;
}

export default function TemplatesPage() {
  const { templates, isLoaded, addTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  // Local state for the currently editing template
  const [name, setName] = useState("");
  const [isCloze, setIsCloze] = useState(false);
  const [frontItems, setFrontItems] = useState<CanvasItem[]>([]);
  const [backItems, setBackItems] = useState<CanvasItem[]>([]);

  // Dnd state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<FieldType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Load template into local state
  useEffect(() => {
    if (!isLoaded) return;
    
    if (activeTemplateId) {
      const t = templates.find((t) => t.id === activeTemplateId);
      if (t) {
        setName(t.name);
        setIsCloze(t.isCloze);
        setFrontItems(t.frontFields.map((f) => ({ id: uuidv4(), type: f })));
        setBackItems(t.backFields.map((f) => ({ id: uuidv4(), type: f })));
      }
    } else {
      handleNewTemplate();
    }
  }, [activeTemplateId, isLoaded]);

  const handleNewTemplate = () => {
    setActiveTemplateId(null);
    setName("New Template");
    setIsCloze(false);
    setFrontItems([]);
    setBackItems([]);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Template name cannot be empty");
      return;
    }

    const newTemplate: CustomTemplate = {
      id: activeTemplateId || `custom-${uuidv4()}`,
      name: name.trim(),
      isCloze,
      frontFields: frontItems.map((i) => i.type),
      backFields: backItems.map((i) => i.type),
    };

    if (activeTemplateId) {
      updateTemplate(newTemplate);
      toast.success("Template updated!");
    } else {
      addTemplate(newTemplate);
      setActiveTemplateId(newTemplate.id);
      toast.success("Template created!");
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplate(id);
      if (activeTemplateId === id) {
        handleNewTemplate();
      }
      toast.success("Template deleted");
    }
  };

  // --- DND Handlers ---
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    if (active.data.current?.isPaletteItem) {
      setActiveType(active.data.current.type);
    } else {
      const item = [...frontItems, ...backItems].find((i) => i.id === active.id);
      if (item) setActiveType(item.type);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    // We only care about dragOver for cross-container sorting
    if (active.data.current?.isPaletteItem) return;

    const activeContainer = active.data.current?.sortable?.containerId;
    const overContainer = over.data.current?.sortable?.containerId || over.id;

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    const setItems = {
      front: setFrontItems,
      back: setBackItems,
    };

    setItems[activeContainer as "front" | "back"]((prevActive: CanvasItem[]) => {
      const activeIndex = prevActive.findIndex((i) => i.id === active.id);
      const itemToMove = prevActive[activeIndex];
      if (!itemToMove) return prevActive;
      
      setItems[overContainer as "front" | "back"]((prevOver: CanvasItem[]) => {
        const overIndex = prevOver.findIndex((i) => i.id === over.id);
        const newIndex = overIndex >= 0 ? overIndex : prevOver.length;
        
        const newOverItems = [...prevOver];
        newOverItems.splice(newIndex, 0, itemToMove);
        return newOverItems;
      });

      const newActiveItems = [...prevActive];
      newActiveItems.splice(activeIndex, 1);
      return newActiveItems;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // 1. Palette to Canvas
    if (active.data.current?.isPaletteItem) {
      const type = active.data.current.type as FieldType;
      const newItem = { id: uuidv4(), type };
      
      const overContainer = over.data.current?.sortable?.containerId || over.id;
      
      if (overContainer === "front") {
        setFrontItems((prev) => [...prev, newItem]);
      } else if (overContainer === "back") {
        setBackItems((prev) => [...prev, newItem]);
      }
      return;
    }

    // 2. Sorting within the same container
    const activeContainer = active.data.current?.sortable?.containerId;
    const overContainer = over.data.current?.sortable?.containerId || over.id;

    if (activeContainer && activeContainer === overContainer) {
      const items = activeContainer === "front" ? frontItems : backItems;
      const oldIndex = items.findIndex((i) => i.id === activeId);
      const newIndex = items.findIndex((i) => i.id === overId);

      if (oldIndex !== newIndex) {
        if (activeContainer === "front") {
          setFrontItems((prev) => arrayMove(prev, oldIndex, newIndex));
        } else {
          setBackItems((prev) => arrayMove(prev, oldIndex, newIndex));
        }
      }
    }
  };

  const handleRemoveItem = (id: string) => {
    setFrontItems((prev) => prev.filter((i) => i.id !== id));
    setBackItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft size={20} className="text-slate-500" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
              Template Builder
            </h1>
          </div>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full">
            <Save size={18} className="mr-2" /> Save Template
          </Button>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-200 bg-white p-4 overflow-y-auto hidden md:block">
          <Button onClick={handleNewTemplate} variant="outline" className="w-full mb-6 border-dashed border-2">
            <Plus size={16} className="mr-2" /> New Template
          </Button>

          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Saved Templates</h3>
          <div className="space-y-1">
            {templates.map((t) => (
              <div
                key={t.id}
                onClick={() => setActiveTemplateId(t.id)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors group ${
                  activeTemplateId === t.id ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-slate-50 text-slate-600"
                }`}
              >
                <span className="truncate">{t.name}</span>
                {!t.id.startsWith("default-") && (
                  <button
                    onClick={(e) => handleDelete(t.id, e)}
                    className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Builder Area */}
        <main className="flex-1 flex flex-col md:flex-row p-6 gap-8 overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {/* Palette */}
            <div className="w-full md:w-56 flex-shrink-0">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Fields</h3>
              <p className="text-xs text-slate-400 mb-4">Drag fields to the canvas</p>
              <div className="space-y-2">
                {AVAILABLE_FIELDS.map((type) => (
                  <DraggablePaletteItem key={type} type={type} />
                ))}
              </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 flex flex-col">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8 flex flex-wrap gap-6 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-slate-500 mb-2 block">Template Name</Label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="text-lg font-medium h-12"
                  />
                </div>
                <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <Switch id="cloze-mode" checked={isCloze} onCheckedChange={setIsCloze} />
                  <Label htmlFor="cloze-mode" className="font-medium cursor-pointer">
                    Cloze Note Mode
                  </Label>
                </div>
              </div>

              <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-[500px]">
                <DroppableCanvas id="front" title="Front Side (Question)" items={frontItems} onRemoveItem={handleRemoveItem} />
                <DroppableCanvas id="back" title="Back Side (Answer)" items={backItems} onRemoveItem={handleRemoveItem} />
              </div>
            </div>

            {/* Overlay for dragging item */}
            <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
              {activeId ? (
                <div className="flex items-center gap-3 bg-white border-2 border-blue-400 rounded-lg p-3 shadow-xl opacity-90 scale-105">
                  <GripVertical size={18} className="text-slate-400" />
                  <span className="font-medium text-slate-700">{activeType}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </main>
      </div>
    </div>
  );
}
