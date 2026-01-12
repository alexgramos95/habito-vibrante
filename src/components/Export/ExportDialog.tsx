import { useState } from "react";
import { FileText, FileSpreadsheet, Download, Crown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ProBadge } from "@/components/Paywall/UpgradeButton";
import { cn } from "@/lib/utils";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  isPro: boolean;
  onShowPaywall: () => void;
}

const EXPORT_OPTIONS = [
  {
    id: 'csv',
    icon: FileSpreadsheet,
    title: 'CSV Export',
    description: 'Spreadsheet-compatible data file',
    format: '.csv',
  },
  {
    id: 'pdf',
    icon: FileText,
    title: 'PDF Report',
    description: 'Formatted progress summary',
    format: '.pdf',
  },
];

export const ExportDialog = ({ 
  open, 
  onClose, 
  isPro,
  onShowPaywall,
}: ExportDialogProps) => {
  const { toast } = useToast();
  const [selectedFormat, setSelectedFormat] = useState<string>('csv');

  const handleExport = () => {
    if (!isPro) {
      onClose();
      onShowPaywall();
      return;
    }

    // Stub: In real implementation, this would generate the export
    toast({
      title: "Export initiated",
      description: `Your ${selectedFormat.toUpperCase()} export will download shortly.`,
    });

    // Simulate download delay
    setTimeout(() => {
      toast({
        title: "Export ready",
        description: "Export functionality coming soon.",
      });
    }, 1500);

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            <DialogTitle>Export Data</DialogTitle>
            {!isPro && <ProBadge />}
          </div>
          <DialogDescription>
            Download your progress data for analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Format Selection */}
          <div className="grid gap-3">
            {EXPORT_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedFormat(option.id)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                  selectedFormat === option.id
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:border-border"
                )}
              >
                <div className="p-2 rounded-lg bg-secondary">
                  <option.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{option.title}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
                <span className="text-xs text-muted-foreground">{option.format}</span>
              </button>
            ))}
          </div>

          {/* Export Range Info */}
          <div className="p-3 rounded-lg bg-secondary/50">
            <p className="text-sm text-muted-foreground">
              Includes: habits, trackers, calendar, finances
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleExport} className="flex-1 gap-2">
              {!isPro && <Crown className="h-4 w-4" />}
              {isPro ? 'Export' : 'Upgrade to Export'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
