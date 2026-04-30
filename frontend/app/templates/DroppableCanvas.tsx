import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableField } from "./SortableField";
import { FieldType } from "@/hooks/useTemplates";

interface DroppableCanvasProps {
  id: string;
  title: string;
  items: { id: string; type: FieldType }[];
  onRemoveItem: (id: string) => void;
}

export function DroppableCanvas({ id, title, items, onRemoveItem }: DroppableCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 min-h-[300px] flex flex-col">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 text-center">
        {title}
      </h3>
      
      <div 
        ref={setNodeRef} 
        className={`flex-1 rounded-lg transition-colors p-2 ${isOver ? "bg-slate-100 ring-2 ring-slate-300 ring-dashed" : "bg-transparent"}`}
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
    </div>
  );
}
