import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { FieldType } from "@/hooks/useTemplates";

interface DraggablePaletteItemProps {
  type: FieldType;
}

export function DraggablePaletteItem({ type }: DraggablePaletteItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: {
      type,
      isPaletteItem: true,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing mb-2 ${
        isDragging ? "opacity-50 border-blue-400 ring-2 ring-blue-100" : "hover:border-slate-300"
      }`}
    >
      <GripVertical size={18} className="text-slate-400" />
      <span className="font-medium text-slate-700">{type}</span>
    </div>
  );
}
