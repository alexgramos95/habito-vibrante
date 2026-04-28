import { useState, useRef } from "react";
import { format, startOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { pt, enUS as enUSLocale } from "date-fns/locale";
import { ShoppingCart, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";
import { Navigation } from "@/components/Layout/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ShoppingItem, SHOPPING_CATEGORIES } from "@/data/types";
import { addShoppingItem, updateShoppingItem, toggleShoppingItem, deleteShoppingItem, reorderShoppingItems } from "@/data/storage";
import { getShoppingItemsForWeek } from "@/logic/computations";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useData } from "@/contexts/DataContext";
import { ReceiptScanner } from "@/components/Shopping/ReceiptScanner";
import { ReceiptReviewModal, ReviewItem } from "@/components/Shopping/ReceiptReviewModal";
import { SortableShoppingRow } from "@/components/Shopping/SortableShoppingRow";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

const Compras = () => {
  const { toast } = useToast();
  const { t, locale, formatCurrency } = useI18n();
  const dateLocale = locale === 'pt-PT' ? pt : enUSLocale;
  const { state, setState } = useData();
  const [selectedWeek, setSelectedWeek] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1, locale: dateLocale })
  );
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [formData, setFormData] = useState({ nome: "", quantidade: "", categoria: "", price: "" });
  const [pendingReceiptItems, setPendingReceiptItems] = useState<ReviewItem[]>([]);
  const [showReceiptReview, setShowReceiptReview] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const weekStartDate = format(selectedWeek, "yyyy-MM-dd");
  const { items, doneCount, totalCount } = getShoppingItemsForWeek(state, weekStartDate);

  const weeklyTotal = items.reduce((sum, item) => sum + (item.price || 0), 0);
  const weeklyDoneTotal = items.filter(item => item.done).reduce((sum, item) => sum + (item.price || 0), 0);

  const monthStart = startOfMonth(selectedWeek);
  const monthEnd = endOfMonth(selectedWeek);
  const monthlyItems = (state.shoppingItems || []).filter(item => {
    try { return isWithinInterval(new Date(item.weekStartDate), { start: monthStart, end: monthEnd }); }
    catch { return false; }
  });
  const monthlyTotal = monthlyItems.reduce((sum, item) => sum + (item.price || 0), 0);

  const itemsByCategory = items.reduce((acc, item) => {
    const cat = item.categoria || (locale === 'pt-PT' ? "Outros" : "Other");
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const openAddForm = () => { setEditingItem(null); setFormData({ nome: "", quantidade: "", categoria: "", price: "" }); setShowForm(true); };
  const openEditForm = (item: ShoppingItem) => {
    setEditingItem(item);
    setFormData({ nome: item.nome, quantidade: item.quantidade || "", categoria: item.categoria || "", price: item.price?.toString() || "" });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formData.nome.trim()) { toast({ title: t.shopping.itemName + (locale === 'pt-PT' ? " obrigatório" : " required"), variant: "destructive" }); return; }
    if (editingItem) {
      setState(prev => updateShoppingItem(prev, editingItem.id, {
        nome: formData.nome.trim(), quantidade: formData.quantidade.trim() || undefined,
        categoria: formData.categoria || undefined, price: parseFloat(formData.price) || 0,
      }));
      toast({ title: t.shopping.itemUpdated });
    } else {
      setState(prev => addShoppingItem(prev, {
        weekStartDate, nome: formData.nome.trim(), quantidade: formData.quantidade.trim() || undefined,
        categoria: formData.categoria || undefined, price: parseFloat(formData.price) || 0,
      }));
      toast({ title: t.shopping.itemAdded });
    }
    setShowForm(false); setFormData({ nome: "", quantidade: "", categoria: "", price: "" }); setEditingItem(null);
  };

  const handleReceiptItemsExtracted = (extractedItems: { name: string; quantity: number; price: number }[]) => {
    if (extractedItems.length === 0) return;
    setPendingReceiptItems(extractedItems.map((item, i) => ({ id: `r-${Date.now()}-${i}`, name: item.name, quantity: item.quantity, price: item.price })));
    setShowReceiptReview(true);
  };

  const handleConfirmReceiptItems = (confirmedItems: ReviewItem[]) => {
    confirmedItems.forEach(item => {
      setState(prev => addShoppingItem(prev, {
        weekStartDate, nome: item.name,
        quantidade: item.quantity > 1 ? `${item.quantity} un` : undefined,
        categoria: item.category || undefined, price: item.price,
      }));
    });
    toast({ title: locale === 'pt-PT' ? `${confirmedItems.length} itens adicionados` : `${confirmedItems.length} items added` });
    setPendingReceiptItems([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const LONG_PRESS_MS = 600;
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  const startLongPress = (id: string) => {
    longPressTriggeredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      toggleSelect(id);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate?.(30); } catch { /* noop */ }
      }
    }, LONG_PRESS_MS);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleItemClick = (item: ShoppingItem) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    if (selectedIds.length > 0) {
      toggleSelect(item.id);
      return;
    }
    setState(prev => toggleShoppingItem(prev, item.id));
  };

  // Drag-and-drop sensors: drag is initiated only via the dedicated handle (setActivatorNodeRef),
  // so we can use immediate activation without conflicting with scroll/tap on the rest of the row.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 1 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 1 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const allIds = items.map(i => i.id);
    const oldIndex = allIds.indexOf(activeId);
    const newIndex = allIds.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const overItem = items.find(i => i.id === overId);
    const activeItem = items.find(i => i.id === activeId);
    const targetCategory = overItem?.categoria;

    setState(prev => {
      let next = prev;
      // If moving across categories, update the dragged item's category first
      if (activeItem && overItem && activeItem.categoria !== targetCategory) {
        next = updateShoppingItem(next, activeId, { categoria: targetCategory });
      }
      const newOrder = arrayMove(allIds, oldIndex, newIndex);
      return reorderShoppingItems(next, newOrder);
    });
  };

  const selectAllVisible = () => setSelectedIds(items.map(i => i.id));
  const clearSelection = () => setSelectedIds([]);
  const handleBulkDelete = () => {
    setState(prev => selectedIds.reduce((acc, id) => deleteShoppingItem(acc, id), prev));
    toast({ title: locale === 'pt-PT' ? `${selectedIds.length} itens eliminados` : `${selectedIds.length} items deleted` });
    setSelectedIds([]);
    setShowBulkDeleteConfirm(false);
  };
  const allVisibleSelected = items.length > 0 && selectedIds.length === items.length;

  const weekLabel = locale === 'pt-PT'
    ? format(selectedWeek, "'Semana de' d 'de' MMMM", { locale: dateLocale })
    : format(selectedWeek, "'Week of' MMMM d", { locale: dateLocale });

  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  return (
    <div className="page-container">
      <Navigation />

      <main className="page-content max-w-xl mx-auto space-y-5">
        <PageHeader
          title={t.shopping.title}
          subtitle={locale === 'pt-PT' ? `Mensal: ${formatCurrency(monthlyTotal)}` : `Monthly: ${formatCurrency(monthlyTotal)}`}
          icon={ShoppingCart}
          actions={
            <>
              <ReceiptScanner onItemsExtracted={handleReceiptItemsExtracted} />
              <Button size="sm" className="gap-1.5 rounded-xl h-9 px-3" onClick={openAddForm}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t.shopping.addItem}</span>
              </Button>
            </>
          }
        />

        {/* ═══ Weekly Telemetry Hero ═══ */}
        <div className="border-2 border-primary/40 bg-card shadow-[4px_4px_0_0_hsl(var(--neon-ultra)/0.4)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
            // INVENTÁRIO SEMANAL
          </p>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {locale === 'pt-PT' ? 'CUSTO TOTAL' : 'TOTAL COST'}
              </p>
              <p className="font-black italic uppercase tracking-tighter text-3xl text-foreground tabular-nums">
                {formatCurrency(weeklyTotal)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {locale === 'pt-PT' ? 'EXECUTADO' : 'EXECUTED'}
              </p>
              <p className="font-black italic uppercase tracking-tighter text-2xl text-primary tabular-nums">
                {formatCurrency(weeklyDoneTotal)}
              </p>
            </div>
          </div>
          {totalCount > 0 && (
            <div className="h-2 bg-foreground/5 border border-foreground/10 overflow-hidden">
              <div className="h-full bg-primary shadow-[0_0_8px_hsl(var(--neon-toxic)/0.6)] transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          )}
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-2 tabular-nums">
            {doneCount}/{totalCount} ITENS · {Math.round(progress)}%
          </p>
        </div>

        {/* ═══ Week Selector ═══ */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedWeek(p => subWeeks(p, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-medium">{weekLabel}</p>
            <Button variant="link" size="sm" className="text-xs text-primary h-auto p-0"
              onClick={() => setSelectedWeek(startOfWeek(new Date(), { weekStartsOn: 1, locale: dateLocale }))}>
              {locale === 'pt-PT' ? "Esta semana" : "This week"}
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedWeek(p => addWeeks(p, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* ═══ Items ═══ */}
        {totalCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/40 bg-card/30 p-12 text-center">
            <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">{t.shopping.noItems}</p>
            <Button variant="link" onClick={openAddForm} className="mt-2 text-sm">{t.shopping.addFirst}</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Bulk selection toolbar */}
            <div className="flex items-center justify-between gap-2 px-1">
              <button
                onClick={allVisibleSelected ? clearSelection : selectAllVisible}
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Checkbox checked={allVisibleSelected} className="h-4 w-4 pointer-events-none" />
                <span>
                  {allVisibleSelected
                    ? (locale === 'pt-PT' ? 'Desmarcar todos' : 'Unselect all')
                    : (locale === 'pt-PT' ? 'Selecionar todos' : 'Select all')}
                </span>
              </button>
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground tabular-nums">
                    {selectedIds.length} {locale === 'pt-PT' ? 'selecionados' : 'selected'}
                  </span>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 px-3 gap-1.5 rounded-xl"
                    onClick={() => setShowBulkDeleteConfirm(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {locale === 'pt-PT' ? 'Eliminar' : 'Delete'}
                  </Button>
                </div>
              )}
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
                  <div key={category} className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category}</h3>
                      <span className="text-[10px] text-muted-foreground">{formatCurrency(categoryItems.reduce((s, i) => s + (i.price || 0), 0))}</span>
                    </div>
                    <div className="space-y-1.5">
                      {categoryItems.map(item => (
                        <SortableShoppingRow
                          key={item.id}
                          item={item}
                          isSelected={selectedIds.includes(item.id)}
                          formatCurrency={formatCurrency}
                          onItemClick={handleItemClick}
                          onLongPressStart={startLongPress}
                          onLongPressCancel={cancelLongPress}
                          onEdit={openEditForm}
                          onDelete={(it) => {
                            setState(prev => deleteShoppingItem(prev, it.id));
                            toast({ title: t.shopping.itemDeleted });
                          }}
                          reorderHandleAriaLabel={locale === 'pt-PT' ? 'Reordenar item' : 'Reorder item'}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-[90vw] max-w-sm">
          <DialogHeader><DialogTitle>{editingItem ? t.shopping.editItem : t.shopping.addItem}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="nome">{t.shopping.itemName}</Label>
              <Input id="nome" placeholder={locale === 'pt-PT' ? "Ex: Leite" : "E.g., Milk"} value={formData.nome}
                onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">{t.shopping.price}</Label>
              <Input id="price" type="number" step="0.01" min="0" placeholder="1.29" value={formData.price}
                onChange={e => setFormData(p => ({ ...p, price: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{locale === 'pt-PT' ? "Categoria" : "Category"}</Label>
              <Select value={formData.categoria} onValueChange={v => setFormData(p => ({ ...p, categoria: v }))}>
                <SelectTrigger><SelectValue placeholder={locale === 'pt-PT' ? "Selecionar" : "Select"} /></SelectTrigger>
                <SelectContent>{SHOPPING_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>{t.actions.cancel}</Button>
            <Button onClick={handleSave}>{editingItem ? t.actions.update : t.actions.add}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReceiptReviewModal open={showReceiptReview} onOpenChange={setShowReceiptReview} items={pendingReceiptItems} onConfirm={handleConfirmReceiptItems} />

      {/* Bulk delete confirmation */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent className="w-[90vw] max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {locale === 'pt-PT' ? 'Eliminar selecionados?' : 'Delete selected?'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            {locale === 'pt-PT'
              ? `Vais eliminar ${selectedIds.length} ${selectedIds.length === 1 ? 'item' : 'itens'}. Esta ação não pode ser revertida.`
              : `You'll delete ${selectedIds.length} ${selectedIds.length === 1 ? 'item' : 'items'}. This cannot be undone.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)}>{t.actions.cancel}</Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              {locale === 'pt-PT' ? 'Eliminar' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Compras;