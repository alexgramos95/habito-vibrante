import { useState, useEffect } from "react";
import { Check, Trash2, Pencil, X, Receipt } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/I18nContext";
import { SHOPPING_CATEGORIES } from "@/data/types";
import { cn } from "@/lib/utils";

export interface ReviewItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  category?: string;
}

interface ReceiptReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ReviewItem[];
  onConfirm: (items: ReviewItem[]) => void;
}

export const ReceiptReviewModal = ({
  open,
  onOpenChange,
  items: initialItems,
  onConfirm,
}: ReceiptReviewModalProps) => {
  const { formatCurrency, locale } = useI18n();
  const [items, setItems] = useState<ReviewItem[]>(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", quantity: "", price: "", category: "" });

  // Sync items when modal opens with new items
  useEffect(() => {
    if (open && initialItems.length > 0) {
      setItems(initialItems);
      setEditingId(null);
    }
  }, [open, initialItems]);

  const total = items.reduce((sum, item) => sum + item.price, 0);

  const handleDelete = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const startEdit = (item: ReviewItem) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      quantity: item.quantity.toString(),
      price: item.price.toFixed(2),
      category: item.category || "",
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    
    setItems(items.map((item) =>
      item.id === editingId
        ? {
            ...item,
            name: editForm.name.trim(),
            quantity: parseInt(editForm.quantity, 10) || 1,
            price: parseFloat(editForm.price) || 0,
            category: editForm.category || undefined,
          }
        : item
    ));
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleConfirm = () => {
    // Filter out any items with empty names or zero prices
    const validItems = items.filter(item => item.name.trim() && item.price > 0);
    onConfirm(validItems);
    onOpenChange(false);
  };

  // Don't render if no items
  if (!open || items.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            {locale === "pt-PT" ? "Rever itens do talão" : "Review receipt items"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "p-3 rounded-lg border transition-all",
                editingId === item.id
                  ? "bg-secondary border-primary"
                  : "bg-secondary/50 border-border/30 hover:border-border"
              )}
            >
              {editingId === item.id ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{locale === "pt-PT" ? "Nome" : "Name"}</Label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="h-8"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{locale === "pt-PT" ? "Quantidade" : "Quantity"}</Label>
                      <Input
                        type="number"
                        min="1"
                        value={editForm.quantity}
                        onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{locale === "pt-PT" ? "Preço" : "Price"}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{locale === "pt-PT" ? "Categoria (opcional)" : "Category (optional)"}</Label>
                    <Select
                      value={editForm.category}
                      onValueChange={(value) => setEditForm({ ...editForm, category: value })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder={locale === "pt-PT" ? "Selecionar" : "Select"} />
                      </SelectTrigger>
                      <SelectContent>
                        {SHOPPING_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={cancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={saveEdit}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{item.quantity}x</span>
                      {item.category && (
                        <>
                          <span>•</span>
                          <span>{item.category}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="font-medium text-warning whitespace-nowrap">
                    {formatCurrency(item.price)}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEdit(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t pt-4 space-y-4">
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>{locale === "pt-PT" ? "Total" : "Total"}</span>
            <span className="text-warning">{formatCurrency(total)}</span>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {locale === "pt-PT" ? "Cancelar" : "Cancel"}
            </Button>
            <Button onClick={handleConfirm} disabled={items.length === 0}>
              <Check className="h-4 w-4 mr-2" />
              {locale === "pt-PT" ? "Confirmar itens" : "Confirm items"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
