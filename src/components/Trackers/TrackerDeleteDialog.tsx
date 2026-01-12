import { useState } from "react";
import { Trash2, Archive, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/I18nContext";
import { Tracker } from "@/data/types";

interface TrackerDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tracker: Tracker | null;
  entriesCount: number;
  onConfirm: (deleteHistory: boolean) => void;
}

export const TrackerDeleteDialog = ({
  open,
  onOpenChange,
  tracker,
  entriesCount,
  onConfirm,
}: TrackerDeleteDialogProps) => {
  const { locale } = useI18n();
  const [deleteOption, setDeleteOption] = useState<"archive" | "delete">("archive");

  if (!tracker) return null;

  const handleConfirm = () => {
    onConfirm(deleteOption === "delete");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {locale === "pt-PT" ? "Eliminar Tracker" : "Delete Tracker"}
          </DialogTitle>
          <DialogDescription>
            {locale === "pt-PT"
              ? `Tens a certeza que queres eliminar "${tracker.name}"?`
              : `Are you sure you want to delete "${tracker.name}"?`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {entriesCount > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/30">
              <p className="text-sm text-warning">
                {locale === "pt-PT"
                  ? `Este tracker tem ${entriesCount} registos no histórico.`
                  : `This tracker has ${entriesCount} entries in history.`}
              </p>
            </div>
          )}

          <RadioGroup
            value={deleteOption}
            onValueChange={(value: "archive" | "delete") => setDeleteOption(value)}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border/50 cursor-pointer hover:bg-secondary/50 transition-colors">
              <RadioGroupItem value="archive" id="archive" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="archive" className="flex items-center gap-2 cursor-pointer">
                  <Archive className="h-4 w-4 text-primary" />
                  {locale === "pt-PT" ? "Arquivar (manter histórico)" : "Archive (keep history)"}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {locale === "pt-PT"
                    ? "Remove o tracker mas mantém todos os registos e dados financeiros."
                    : "Removes the tracker but keeps all entries and financial data."}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border border-destructive/30 cursor-pointer hover:bg-destructive/5 transition-colors">
              <RadioGroupItem value="delete" id="delete" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="delete" className="flex items-center gap-2 cursor-pointer text-destructive">
                  <Trash2 className="h-4 w-4" />
                  {locale === "pt-PT" ? "Eliminar tudo" : "Delete everything"}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {locale === "pt-PT"
                    ? "Remove o tracker e todo o histórico permanentemente."
                    : "Removes the tracker and all history permanently."}
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {locale === "pt-PT" ? "Cancelar" : "Cancel"}
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            {deleteOption === "archive"
              ? (locale === "pt-PT" ? "Arquivar" : "Archive")
              : (locale === "pt-PT" ? "Eliminar" : "Delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
