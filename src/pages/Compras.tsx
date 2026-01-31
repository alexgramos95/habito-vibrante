import { useState, useEffect } from "react";
import { format, startOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { pt, enUS as enUSLocale } from "date-fns/locale";
import { ShoppingCart, Plus, Trash2, Pencil, ChevronLeft, ChevronRight, Receipt, TrendingUp } from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";
import { Navigation } from "@/components/Layout/Navigation";
import { PageHeader } from "@/components/Layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ShoppingItem, SHOPPING_CATEGORIES } from "@/data/types";
import {
  addShoppingItem,
  updateShoppingItem,
  toggleShoppingItem,
  deleteShoppingItem,
} from "@/data/storage";
import { getShoppingItemsForWeek } from "@/logic/computations";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useData } from "@/contexts/DataContext";
import { ReceiptScanner } from "@/components/Shopping/ReceiptScanner";
import { ReceiptReviewModal, ReviewItem } from "@/components/Shopping/ReceiptReviewModal";

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
  const [formData, setFormData] = useState({
    nome: "",
    quantidade: "",
    categoria: "",
    price: "",
  });
  
  // Receipt OCR state
  const [pendingReceiptItems, setPendingReceiptItems] = useState<ReviewItem[]>([]);
  const [showReceiptReview, setShowReceiptReview] = useState(false);

  const weekStartDate = format(selectedWeek, "yyyy-MM-dd");
  const { items, doneCount, totalCount } = getShoppingItemsForWeek(state, weekStartDate);

  // Calculate weekly and monthly totals
  const weeklyTotal = items.reduce((sum, item) => sum + (item.price || 0), 0);
  const weeklyDoneTotal = items.filter(item => item.done).reduce((sum, item) => sum + (item.price || 0), 0);
  
  // Calculate monthly total
  const monthStart = startOfMonth(selectedWeek);
  const monthEnd = endOfMonth(selectedWeek);
  const monthlyItems = (state.shoppingItems || []).filter(item => {
    try {
      const itemDate = new Date(item.weekStartDate);
      return isWithinInterval(itemDate, { start: monthStart, end: monthEnd });
    } catch {
      return false;
    }
  });
  const monthlyTotal = monthlyItems.reduce((sum, item) => sum + (item.price || 0), 0);

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    const cat = item.categoria || (locale === 'pt-PT' ? "Outros" : "Other");
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const handlePreviousWeek = () => {
    setSelectedWeek((prev) => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setSelectedWeek((prev) => addWeeks(prev, 1));
  };

  const handleThisWeek = () => {
    setSelectedWeek(startOfWeek(new Date(), { weekStartsOn: 1, locale: dateLocale }));
  };

  const openAddForm = () => {
    setEditingItem(null);
    setFormData({ nome: "", quantidade: "", categoria: "", price: "" });
    setShowForm(true);
  };

  const openEditForm = (item: ShoppingItem) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome,
      quantidade: item.quantidade || "",
      categoria: item.categoria || "",
      price: item.price?.toString() || "",
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formData.nome.trim()) {
      toast({ title: t.shopping.itemName + " " + (locale === 'pt-PT' ? "obrigatório" : "required"), variant: "destructive" });
      return;
    }

    if (editingItem) {
      setState((prev) =>
        updateShoppingItem(prev, editingItem.id, {
          nome: formData.nome.trim(),
          quantidade: formData.quantidade.trim() || undefined,
          categoria: formData.categoria || undefined,
          price: parseFloat(formData.price) || 0,
        })
      );
      toast({ title: t.shopping.itemUpdated });
    } else {
      setState((prev) =>
        addShoppingItem(prev, {
          weekStartDate,
          nome: formData.nome.trim(),
          quantidade: formData.quantidade.trim() || undefined,
          categoria: formData.categoria || undefined,
          price: parseFloat(formData.price) || 0,
        })
      );
      toast({ title: t.shopping.itemAdded });
    }

    setShowForm(false);
    setFormData({ nome: "", quantidade: "", categoria: "", price: "" });
    setEditingItem(null);
  };

  const handleToggle = (id: string) => {
    setState((prev) => toggleShoppingItem(prev, id));
  };

  const handleDelete = (id: string) => {
    setState((prev) => deleteShoppingItem(prev, id));
    toast({ title: t.shopping.itemDeleted });
  };

  // Receipt OCR handlers
  const handleReceiptItemsExtracted = (extractedItems: { name: string; quantity: number; price: number }[]) => {
    // Only open modal if we have items
    if (extractedItems.length === 0) return;
    
    const reviewItems: ReviewItem[] = extractedItems.map((item, index) => ({
      id: `receipt-${Date.now()}-${index}`,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));
    setPendingReceiptItems(reviewItems);
    setShowReceiptReview(true);
  };

  const handleConfirmReceiptItems = (confirmedItems: ReviewItem[]) => {
    confirmedItems.forEach((item) => {
      setState((prev) =>
        addShoppingItem(prev, {
          weekStartDate,
          nome: item.name,
          quantidade: item.quantity > 1 ? `${item.quantity} un` : undefined,
          categoria: item.category || undefined,
          price: item.price,
        })
      );
    });
    
    toast({
      title: locale === 'pt-PT' ? 'Itens adicionados' : 'Items added',
      description: locale === 'pt-PT' 
        ? `${confirmedItems.length} itens do talão adicionados` 
        : `${confirmedItems.length} receipt items added`,
    });
    
    setPendingReceiptItems([]);
  };

  const weekLabel = locale === 'pt-PT' 
    ? format(selectedWeek, "'Semana de' d 'de' MMMM", { locale: dateLocale })
    : format(selectedWeek, "'Week of' MMMM d", { locale: dateLocale });

  return (
    <div className="page-container">
      <Navigation />

      <main className="page-content">
        {/* Header */}
        <PageHeader
          title={t.shopping.title}
          subtitle={(t as any).pageSubtitles?.shopping || (locale === 'pt-PT' ? 'Gastos semanais' : 'Weekly spending')}
          icon={ShoppingCart}
          action={{
            icon: Plus,
            label: t.shopping.addItem,
            onClick: openAddForm,
          }}
        >
          <ReceiptScanner onItemsExtracted={handleReceiptItemsExtracted} />
        </PageHeader>

        {/* Week Selector - Compact */}
        <Card className="border-border/30 bg-card/50">
          <CardContent className="py-2.5 px-3">
            <div className="week-nav">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <p className="text-sm font-medium">{weekLabel}</p>
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs text-primary h-auto p-0"
                  onClick={handleThisWeek}
                >
                  {locale === 'pt-PT' ? "Esta semana" : "This week"}
                </Button>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary - Compact metrics grid */}
        <div className="metrics-grid-3">
          {/* Items Progress */}
          <div className="summary-card">
            <div className="summary-card-header">
              <ShoppingCart className="summary-card-icon text-primary" />
              <span className="summary-card-label">{locale === 'pt-PT' ? "Itens" : "Items"}</span>
            </div>
            <div className="summary-card-value text-primary">
              {doneCount}/{totalCount}
            </div>
            {totalCount > 0 && (
              <div className="mt-1.5 h-1 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(doneCount / totalCount) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Weekly Total */}
          <div className="summary-card">
            <div className="summary-card-header">
              <Receipt className="summary-card-icon text-warning" />
              <span className="summary-card-label">{t.shopping.weekTotal}</span>
            </div>
            <div className="summary-card-value text-warning">
              {formatCurrency(weeklyTotal)}
            </div>
            <p className="summary-card-subtext">
              {locale === 'pt-PT' ? "Comprado" : "Bought"}: {formatCurrency(weeklyDoneTotal)}
            </p>
          </div>

          {/* Monthly Total */}
          <div className="summary-card">
            <div className="summary-card-header">
              <TrendingUp className="summary-card-icon text-success" />
              <span className="summary-card-label">{t.shopping.monthlySpending}</span>
            </div>
            <div className="summary-card-value text-success">
              {formatCurrency(monthlyTotal)}
            </div>
            <p className="summary-card-subtext">
              {format(monthStart, "MMM yyyy", { locale: dateLocale })}
            </p>
          </div>
        </div>

        {/* Items List */}
        {totalCount === 0 ? (
          <Card className="border-border/30 border-dashed bg-card/30">
            <CardContent className="empty-state">
              <ShoppingCart className="empty-state-icon" />
              <p className="empty-state-title">{t.shopping.noItems}</p>
              <Button variant="link" onClick={openAddForm} className="mt-2 text-sm">
                {t.shopping.addFirst}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
              <Card key={category} className="border-border/30 bg-card/50">
                <CardHeader className="pb-1.5 pt-3 px-3">
                  <CardTitle className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                    <span>{category}</span>
                    <span className="text-[10px]">
                      {formatCurrency(categoryItems.reduce((sum, i) => sum + (i.price || 0), 0))}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 px-3 pb-3">
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "item-card group",
                        item.done
                          ? "bg-success/8 border-success/20"
                          : "bg-secondary/30 hover:bg-secondary/50"
                      )}
                    >
                      <Checkbox
                        checked={item.done}
                        onCheckedChange={() => handleToggle(item.id)}
                        className="h-4 w-4"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("text-sm font-medium truncate", item.done && "line-through text-muted-foreground")}>
                            {item.nome}
                          </p>
                          {item.price > 0 && (
                            <span className={cn(
                              "text-xs font-medium shrink-0",
                              item.done ? "text-muted-foreground" : "text-warning"
                            )}>
                              {formatCurrency(item.price)}
                            </span>
                          )}
                        </div>
                        {item.quantidade && (
                          <p className="text-xs text-muted-foreground truncate">{item.quantidade}</p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditForm(item)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? t.shopping.editItem : t.shopping.addItem}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">{t.shopping.itemName}</Label>
              <Input
                id="nome"
                placeholder={locale === 'pt-PT' ? "Ex: Leite" : "E.g., Milk"}
                value={formData.nome}
                onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">{t.shopping.price}</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="1.29"
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantidade">{t.shopping.quantity} ({t.shopping.optional})</Label>
              <Input
                id="quantidade"
                placeholder={locale === 'pt-PT' ? "Ex: 2 litros" : "E.g., 2 liters"}
                value={formData.quantidade}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantidade: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">{locale === 'pt-PT' ? "Categoria" : "Category"} ({t.shopping.optional})</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, categoria: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={locale === 'pt-PT' ? "Selecionar categoria" : "Select category"} />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              {t.actions.cancel}
            </Button>
            <Button onClick={handleSave}>
              {editingItem ? t.actions.update : t.actions.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Review Modal */}
      <ReceiptReviewModal
        open={showReceiptReview}
        onOpenChange={setShowReceiptReview}
        items={pendingReceiptItems}
        onConfirm={handleConfirmReceiptItems}
      />
    </div>
  );
};

export default Compras;
