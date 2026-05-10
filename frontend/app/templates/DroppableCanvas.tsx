import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableField } from "./SortableField";
import type { FieldType } from "@/lib/types/template";
import { MAX_FIELDS_PER_SIDE } from "./fieldMeta";

interface DroppableCanvasProps {
  id: string;
  title: string;
  items: { id: string; type: FieldType }[];
  onRemoveItem: (id: string) => void;
}

export function DroppableCanvas({ id, title, items, onRemoveItem }: DroppableCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const isFull = items.length >= MAX_FIELDS_PER_SIDE;

  return (
    <div className={`flex-1 border rounded-xl p-4 min-h-[300px] flex flex-col transition-colors ${isFull ? "bg-slate-100 border-slate-300" : "bg-slate-50 border-slate-200"}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </h3>
        <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${isFull ? "bg-red-100 text-red-600" : "bg-slate-200 text-slate-500"}`}>
          {items.length}/{MAX_FIELDS_PER_SIDE}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 rounded-lg transition-colors p-2 ${
          isFull
            ? "bg-slate-100 ring-2 ring-red-200 ring-dashed"
            : isOver
            ? "bg-slate-100 ring-2 ring-slate-300 ring-dashed"
            : "bg-transparent"
        }`}
      >
        <SortableContext id={id} items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm italic border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
              Drag fields here
            </div>
          ) : (
            items.map((item) => (
              <SortableField key={item.id} id={item.id} type={item.type} onRemove={onRemoveItem} />
            ))
          )}
        </SortableContext>
      </div>

      {isFull && (
        <p className="text-xs text-red-500 text-center mt-2">Maximum {MAX_FIELDS_PER_SIDE} fields reached</p>
      )}
    </div>
  );
}
