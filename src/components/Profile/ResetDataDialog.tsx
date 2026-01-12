import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nContext";

interface ResetDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const ResetDataDialog = ({
  open,
  onOpenChange,
  onConfirm,
}: ResetDataDialogProps) => {
  const { locale } = useI18n();
  const [confirmText, setConfirmText] = useState("");

  const expectedText = locale === "pt-PT" ? "ELIMINAR" : "DELETE";

  const handleConfirm = () => {
    if (confirmText === expectedText) {
      onConfirm();
      setConfirmText("");
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {locale === "pt-PT" ? "Reiniciar Todos os Dados" : "Reset All Data"}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              {locale === "pt-PT"
                ? "Esta ação irá eliminar permanentemente:"
                : "This action will permanently delete:"}
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>{locale === "pt-PT" ? "Todos os hábitos" : "All habits"}</li>
              <li>{locale === "pt-PT" ? "Todos os trackers e registos" : "All trackers and entries"}</li>
              <li>{locale === "pt-PT" ? "Histórico financeiro" : "Financial history"}</li>
              <li>{locale === "pt-PT" ? "Conquistas e pontos" : "Achievements and points"}</li>
              <li>{locale === "pt-PT" ? "Lista de compras" : "Shopping list"}</li>
              <li>{locale === "pt-PT" ? "Reflexões e Future Self" : "Reflections and Future Self"}</li>
            </ul>
            <p className="font-medium text-destructive">
              {locale === "pt-PT"
                ? "Esta ação NÃO pode ser desfeita."
                : "This action CANNOT be undone."}
            </p>
            <div className="pt-2">
              <p className="text-sm mb-2">
                {locale === "pt-PT"
                  ? `Para confirmar, escreve "${expectedText}" abaixo:`
                  : `To confirm, type "${expectedText}" below:`}
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={expectedText}
                className="font-mono"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText("")}>
            {locale === "pt-PT" ? "Cancelar" : "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={confirmText !== expectedText}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {locale === "pt-PT" ? "Eliminar Tudo" : "Delete Everything"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
