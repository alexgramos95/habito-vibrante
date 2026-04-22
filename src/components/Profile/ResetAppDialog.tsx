import { useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type ResetScope =
  | "habits"
  | "calendar"
  | "nutrition"
  | "shopping"
  | "reflections"
  | "achievements";

interface ResetAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (scopes: ResetScope[]) => void;
  isLoading?: boolean;
  locale?: string;
}

const SCOPES: { id: ResetScope; pt: string; en: string; descPt: string; descEn: string }[] = [
  { id: "habits", pt: "Hábitos", en: "Habits", descPt: "Apaga todos os hábitos e os respetivos registos.", descEn: "Deletes all habits and their logs." },
  { id: "calendar", pt: "Calendário", en: "Calendar", descPt: "Limpa registos diários e métricas históricas.", descEn: "Clears daily logs and historical metrics." },
  { id: "nutrition", pt: "Nutrição", en: "Nutrition", descPt: "Remove plano de refeições e perfil nutricional.", descEn: "Removes meal plan and nutrition profile." },
  { id: "shopping", pt: "Compras", en: "Shopping", descPt: "Apaga a lista de compras.", descEn: "Deletes the shopping list." },
  { id: "reflections", pt: "Reflexões", en: "Reflections", descPt: "Apaga reflexões diárias e Future Self.", descEn: "Deletes daily reflections and Future Self entries." },
  { id: "achievements", pt: "Conquistas", en: "Achievements", descPt: "Reinicia pontos, nível, streak e conquistas.", descEn: "Resets points, level, streak and achievements." },
];

export const ResetAppDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  locale = "pt-PT",
}: ResetAppDialogProps) => {
  const isPt = locale === "pt-PT";
  const [selected, setSelected] = useState<Set<ResetScope>>(new Set());

  const toggle = (id: ResetScope) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allIds = SCOPES.map((s) => s.id);
  const allSelected = selected.size === SCOPES.length;
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const handleConfirm = () => {
    if (selected.size === 0) return;
    onConfirm(Array.from(selected));
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {isPt ? "Reiniciar dados" : "Reset data"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isPt
              ? "Seleciona as áreas que queres reiniciar. Esta ação é irreversível."
              : "Select the areas you want to reset. This action cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2 max-h-[55vh] overflow-y-auto">
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs text-primary hover:underline"
          >
            {allSelected
              ? isPt ? "Desmarcar tudo" : "Unselect all"
              : isPt ? "Selecionar tudo" : "Select all"}
          </button>

          {SCOPES.map((scope) => {
            const checked = selected.has(scope.id);
            return (
              <label
                key={scope.id}
                htmlFor={`scope-${scope.id}`}
                className="flex items-start gap-3 rounded-xl border border-border/30 bg-card/40 p-3 cursor-pointer hover:border-border/60 transition-colors"
              >
                <Checkbox
                  id={`scope-${scope.id}`}
                  checked={checked}
                  onCheckedChange={() => toggle(scope.id)}
                  disabled={isLoading}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{isPt ? scope.pt : scope.en}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isPt ? scope.descPt : scope.descEn}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {isPt ? "Cancelar" : "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading || selected.size === 0}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {isLoading
              ? isPt ? "A reiniciar..." : "Resetting..."
              : isPt ? `Reiniciar (${selected.size})` : `Reset (${selected.size})`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
