import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { FieldType } from "@/hooks/useTemplates";

interface SortableFieldProps {
  id: string;
  type: FieldType;
  onRemove: (id: string) => void;
}

export function SortableField({ id, type, onRemove }: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-3 shadow-sm mb-2 group"
    >
      <div className="flex items-center gap-3">
        <button
          className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </button>
        <span className="font-medium text-slate-700">{type}</span>
      </div>
      <button
        onClick={() => onRemove(id)}
        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X size={18} />
      </button>
    </div>
  );
}
