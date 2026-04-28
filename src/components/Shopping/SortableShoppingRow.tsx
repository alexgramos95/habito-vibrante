import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { ShoppingItem } from "@/data/types";
import { cn } from "@/lib/utils";
import { Surface } from "@/components/ui/surface";

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
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
  };

  // Map state → Surface tone
  const tone =
    isSelected ? "accent" :
    item.done   ? "active" :
    "subtle";

  return (
    <Surface
      ref={setNodeRef}
      style={style}
      tone={tone}
      size="compact"
      className={cn(
        "flex items-center gap-1 group select-none",
        isDragging && "opacity-60 shadow-lg z-10",
      )}
    >
      {/* Tap area for check / long-press selection */}
      <div
        role="button"
        onClick={() => onItemClick(item)}
        onPointerDown={(e) => {
          if (e.pointerType !== 'touch') onLongPressStart(item.id);
        }}
        onPointerUp={onLongPressCancel}
        onPointerLeave={onLongPressCancel}
        onPointerCancel={onLongPressCancel}
        onTouchStart={() => onLongPressStart(item.id)}
        onTouchEnd={onLongPressCancel}
        onTouchMove={onLongPressCancel}
        onContextMenu={(e) => e.preventDefault()}
        className="flex-1 min-w-0 flex items-center gap-2 cursor-pointer"
      >
        <div className="flex-1 min-w-0 text-left">
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
        </div>
      </div>

      {/* Action buttons - always visible on mobile, hover on desktop */}
      <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
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
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item);
          }}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-destructive/60 hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Dedicated drag handle on the RIGHT side */}
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={reorderHandleAriaLabel}
        onClick={(e) => e.stopPropagation()}
        className="h-9 w-7 -mr-1 flex items-center justify-center text-muted-foreground/50 hover:text-foreground touch-none cursor-grab active:cursor-grabbing shrink-0"
      >
        <GripVertical className="h-5 w-5" />
      </button>
    </Surface>
  );
};
