import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { ShoppingItem } from "@/data/types";
import { cn } from "@/lib/utils";

interface SortableShoppingRowProps {
  item: ShoppingItem;
  isSelected: boolean;
  formatCurrency: (n: number) => string;
  onItemClick: (item: ShoppingItem) => void;
  onLongPressStart: (id: string) => void;
  onLongPressCancel: () => void;
  onEdit: (item: ShoppingItem) => void;
  onDelete: (item: ShoppingItem) => void;
  reorderHandleAriaLabel: string;
}

export const SortableShoppingRow = ({
  item,
  isSelected,
  formatCurrency,
  onItemClick,
  onLongPressStart,
  onLongPressCancel,
  onEdit,
  onDelete,
  reorderHandleAriaLabel,
}: SortableShoppingRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-3 rounded-xl border-2 transition-all group select-none",
        isDragging && "opacity-60 shadow-lg z-10 relative",
        isSelected
          ? "bg-primary/5 border-primary/40"
          : item.done
          ? "bg-primary/10 border-primary/50 shadow-[0_0_12px_hsl(var(--primary)/0.15)]"
          : "bg-card/50 border-border/30 hover:bg-secondary/40",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={reorderHandleAriaLabel}
        className="h-7 w-5 -ml-1 flex items-center justify-center text-muted-foreground/50 hover:text-foreground touch-none cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onItemClick(item)}
        onPointerDown={() => onLongPressStart(item.id)}
        onPointerUp={onLongPressCancel}
        onPointerLeave={onLongPressCancel}
        onPointerCancel={onLongPressCancel}
        onContextMenu={(e) => e.preventDefault()}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium truncate transition-colors",
              item.done && "line-through text-primary/70 font-semibold",
            )}
          >
            {item.nome}
          </p>
          {item.price > 0 && (
            <span
              className={cn(
                "text-xs font-medium shrink-0 transition-colors",
                item.done ? "text-primary/60" : "text-warning",
              )}
            >
              {formatCurrency(item.price)}
            </span>
          )}
        </div>
        {item.quantidade && (
          <p className="text-xs text-muted-foreground truncate">
            {item.quantidade}
          </p>
        )}
      </button>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item);
          }}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-destructive/60 hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
