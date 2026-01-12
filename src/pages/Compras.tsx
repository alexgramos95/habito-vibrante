import { useState, useEffect } from "react";
import { format, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { pt } from "date-fns/locale";
import { ShoppingCart, Plus, Check, Trash2, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { Navigation } from "@/components/Layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AppState, ShoppingItem, SHOPPING_CATEGORIES } from "@/data/types";
import {
  loadState,
  saveState,
  addShoppingItem,
  updateShoppingItem,
  toggleShoppingItem,
  deleteShoppingItem,
} from "@/data/storage";
import { getShoppingItemsForWeek } from "@/logic/computations";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const Compras = () => {
  const { toast } = useToast();
  const [state, setState] = useState<AppState>(() => loadState());
  const [selectedWeek, setSelectedWeek] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1, locale: pt })
  );
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    quantidade: "",
    categoria: "",
    price: "",
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  const weekStartDate = format(selectedWeek, "yyyy-MM-dd");
  const { items, doneCount, totalCount } = getShoppingItemsForWeek(state, weekStartDate);

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    const cat = item.categoria || "Outros";
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
    setSelectedWeek(startOfWeek(new Date(), { weekStartsOn: 1, locale: pt }));
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
      toast({ title: "Nome obrigatório", variant: "destructive" });
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
      toast({ title: "Item atualizado!" });
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
      toast({ title: "Item adicionado!" });
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
    toast({ title: "Item removido" });
  };

  const weekLabel = format(selectedWeek, "'Semana de' d 'de' MMMM", { locale: pt });

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Lista de Compras Semanal</h1>
          <Button onClick={openAddForm}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {/* Week Selector */}
        <Card className="border-border/50 shadow-lg">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={handlePreviousWeek}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center">
                <p className="font-medium">{weekLabel}</p>
                <Button
                  variant="link"
                  size="sm"
                  className="text-primary"
                  onClick={handleThisWeek}
                >
                  Esta semana
                </Button>
              </div>
              <Button variant="ghost" size="icon" onClick={handleNextWeek}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Resumo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-primary">
                {doneCount}/{totalCount}
              </div>
              <div className="text-muted-foreground">
                itens concluídos esta semana
              </div>
            </div>
            {totalCount > 0 && (
              <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(doneCount / totalCount) * 100}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items List */}
        {totalCount === 0 ? (
          <Card className="border-border/50 border-dashed">
            <CardContent className="py-12 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum item nesta semana.
              </p>
              <Button variant="link" onClick={openAddForm} className="mt-2">
                Adicionar primeiro item
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
              <Card key={category} className="border-border/50 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground font-medium">
                    {category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 rounded-xl p-3 group transition-all",
                        item.done
                          ? "bg-success/10 border border-success/30"
                          : "bg-secondary/50 hover:bg-secondary"
                      )}
                    >
                      <Checkbox
                        checked={item.done}
                        onCheckedChange={() => handleToggle(item.id)}
                        className="h-5 w-5"
                      />
                      <div className="flex-1">
                        <p className={cn("font-medium", item.done && "line-through text-muted-foreground")}>
                          {item.nome}
                        </p>
                        {item.quantidade && (
                          <p className="text-sm text-muted-foreground">{item.quantidade}</p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditForm(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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
            <DialogTitle>{editingItem ? "Editar Item" : "Adicionar Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do item</Label>
              <Input
                id="nome"
                placeholder="Ex: Leite"
                value={formData.nome}
                onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade (opcional)</Label>
              <Input
                id="quantidade"
                placeholder="Ex: 2 litros"
                value={formData.quantidade}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantidade: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria (opcional)</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, categoria: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar categoria" />
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
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingItem ? "Atualizar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Compras;
