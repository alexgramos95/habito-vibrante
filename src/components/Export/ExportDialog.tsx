import { useState } from "react";
import { FileJson, Download, Crown, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ProBadge } from "@/components/Paywall/UpgradeButton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { loadState } from "@/data/storage";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  isPro: boolean;
  onShowPaywall: () => void;
}

const EXPORT_OPTIONS = [
  {
    id: 'json',
    icon: FileJson,
    title: 'JSON Export',
    description: 'Complete data backup file',
    format: '.json',
  },
];

export const ExportDialog = ({ 
  open, 
  onClose, 
  isPro,
  onShowPaywall,
}: ExportDialogProps) => {
  const { toast } = useToast();
  const { user, session, subscriptionStatus } = useAuth();
  const [selectedFormat, setSelectedFormat] = useState<string>('json');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    // For now, allow export for all users (remove paywall check for basic JSON export)
    // if (!isPro) {
    //   onClose();
    //   onShowPaywall();
    //   return;
    // }

    setExporting(true);

    try {
      // Gather all data from various sources
      const localState = loadState();
      
      // Try to fetch cloud data if user is authenticated
      let cloudData: Record<string, unknown> | null = null;
      let profileData: Record<string, unknown> | null = null;
      let subscriptionData: Record<string, unknown> | null = null;
      
      if (user && session) {
        try {
          // Fetch user_data from database
          const { data: userData, error: userDataError } = await supabase
            .from('user_data')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (!userDataError && userData) {
            cloudData = userData;
          }

          // Fetch profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (!profileError && profile) {
            profileData = profile;
          }

          // Fetch subscription
          const { data: subscription, error: subscriptionError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (!subscriptionError && subscription) {
            subscriptionData = subscription;
          }
        } catch (err) {
          console.error('Error fetching cloud data:', err);
        }
      }

      // Compile export data
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        user: user ? {
          id: user.id,
          email: user.email,
          emailVerified: !!user.email_confirmed_at,
        } : null,
        subscription: subscriptionData || {
          plan: subscriptionStatus.plan,
          status: subscriptionStatus.planStatus,
          trialEnd: subscriptionStatus.trialEnd,
        },
        profile: profileData || null,
        localData: {
          habits: localState.habits || [],
          trackers: localState.trackers || [],
          trackerEntries: localState.trackerEntries || [],
          dailyLogs: localState.dailyLogs || [],
          reflections: localState.reflections || [],
          futureSelf: localState.futureSelf || [],
          investmentGoals: localState.investmentGoals || [],
          purchaseGoals: localState.purchaseGoals || [],
          shoppingItems: localState.shoppingItems || [],
          gamification: localState.gamification || {},
          triggers: localState.triggers || [],
        },
        cloudData: cloudData || null,
      };

      // Create and download the file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `become-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export complete",
        description: "Your data has been downloaded as a JSON file.",
      });

      onClose();
    } catch (err) {
      console.error('Export error:', err);
      toast({
        title: "Export failed",
        description: "Could not export your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            <DialogTitle>Export Data</DialogTitle>
          </div>
          <DialogDescription>
            Download your complete progress data as a backup.
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

          {/* Export Info */}
          <div className="p-3 rounded-lg bg-secondary/50">
            <p className="text-sm text-muted-foreground">
              Includes: habits, trackers, calendar, finances, reflections, goals
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={exporting}>
              Cancel
            </Button>
            <Button onClick={handleExport} className="flex-1 gap-2" disabled={exporting}>
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
