import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { translations } from "@/i18n/translations.pt";
import { Habit, DEFAULT_COLORS, DEFAULT_CATEGORIES } from "@/data/types";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HabitFormProps {
  habit?: Habit;
  onSave: (data: Omit<Habit, "id" | "createdAt">) => void;
  onCancel: () => void;
}

export const HabitForm = ({ habit, onSave, onCancel }: HabitFormProps) => {
  const [nome, setNome] = useState(habit?.nome || "");
  const [categoria, setCategoria] = useState(habit?.categoria || "");
  const [cor, setCor] = useState(habit?.cor || DEFAULT_COLORS[0]);
  const [active, setActive] = useState(habit?.active ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    onSave({
      nome: nome.trim(),
      categoria: categoria || undefined,
      cor,
      active,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-border/50 bg-card p-6 shadow-xl animate-scale-in">
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-6 text-xl font-semibold">
          {habit ? translations.habits.edit : translations.habits.add}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">{translations.habits.name}</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Beber 2L de água"
              className="bg-secondary/50"
              autoFocus
            />
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="categoria">{translations.habits.category}</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue placeholder="Selecionar categoria" />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cor */}
          <div className="space-y-2">
            <Label>{translations.habits.color}</Label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setCor(color)}
                  className={cn(
                    "h-8 w-8 rounded-full transition-all duration-200",
                    cor === color
                      ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110"
                      : "hover:scale-105"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 p-4">
            <div>
              <Label htmlFor="active" className="font-medium">
                {translations.habits.active}
              </Label>
              <p className="text-sm text-muted-foreground">
                Incluir no rastreamento diário
              </p>
            </div>
            <Switch
              id="active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              {translations.habits.cancel}
            </Button>
            <Button type="submit" className="flex-1">
              {translations.habits.save}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
