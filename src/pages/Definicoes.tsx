import { useState, useEffect } from "react";
import { Globe, RotateCcw, Trash2 } from "lucide-react";
import { translations } from "@/i18n/translations.pt";
import { AppState } from "@/data/types";
import { loadState, saveState, resetMonth, resetAll } from "@/data/storage";
import { Navigation } from "@/components/Layout/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";

const Definicoes = () => {
  const { toast } = useToast();
  const [state, setState] = useState<AppState>(() => loadState());
  const [showResetConfirm, setShowResetConfirm] = useState<"month" | "all" | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const handleResetMonth = () => {
    setState((prev) => resetMonth(prev, currentYear, currentMonth));
    toast({ title: "Mês reiniciado com sucesso!" });
    setShowResetConfirm(null);
  };

  const handleResetAll = () => {
    setState(resetAll());
    toast({ title: "Todos os dados foram reiniciados!" });
    setShowResetConfirm(null);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        <h1 className="text-2xl font-bold">Definições</h1>

        {/* Idioma */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Idioma
            </CardTitle>
            <CardDescription>
              Escolhe o idioma da aplicação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select defaultValue="pt" disabled>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Selecionar idioma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">Português (Portugal)</SelectItem>
                <SelectItem value="en" disabled>English (em breve)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-2">
              Mais idiomas disponíveis em breve.
            </p>
          </CardContent>
        </Card>

        {/* Reiniciar Dados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Reiniciar Dados
            </CardTitle>
            <CardDescription>
              Elimina registos de hábitos. Esta ação não pode ser desfeita.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="outline"
                onClick={() => setShowResetConfirm("month")}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {translations.actions.resetMonth}
              </Button>
              
              <Button
                variant="destructive"
                onClick={() => setShowResetConfirm("all")}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {translations.actions.resetAll}
              </Button>
            </div>
            
            <div className="rounded-lg bg-secondary/50 p-4 text-sm text-muted-foreground">
              <p><strong>Reiniciar mês:</strong> Elimina apenas os registos do mês atual. Os hábitos são mantidos.</p>
              <p className="mt-2"><strong>Reiniciar tudo:</strong> Elimina todos os hábitos e registos. Começa do zero.</p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Reset Confirmation Dialog */}
      <AlertDialog
        open={!!showResetConfirm}
        onOpenChange={() => setShowResetConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {showResetConfirm === "month"
                ? translations.actions.resetMonth
                : translations.actions.resetAll}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {showResetConfirm === "month"
                ? "Todos os registos deste mês serão eliminados. Os teus hábitos serão mantidos."
                : "Todos os hábitos e registos serão eliminados permanentemente. Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{translations.habits.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={showResetConfirm === "month" ? handleResetMonth : handleResetAll}
              className={showResetConfirm === "all" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {translations.actions.reset}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Definicoes;
