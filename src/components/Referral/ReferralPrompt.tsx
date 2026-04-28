import { useEffect, useMemo, useState } from "react";
import { Copy, Check, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildReferralLink, getInviteMessage, copyToClipboard, nativeShare,
  incInvitesSent, REFERRAL_XP_REWARD,
} from "@/lib/referral";
import { track } from "@/hooks/useAnalytics";
import { pickVariant, REFERRAL_HEADLINE_TEST, REFERRAL_HEADLINE_VARIANTS } from "@/lib/abTest";

interface ReferralPromptProps {
  open: boolean;
  onClose: () => void;
  /** Variant: "milestone" (after 3 wins) or "manual" (from settings/profile). */
  variant?: "milestone" | "manual";
}

export const ReferralPrompt = ({ open, onClose, variant = "milestone" }: ReferralPromptProps) => {
  const [copied, setCopied] = useState(false);
  const link = buildReferralLink();
  const headlineVariant = useMemo(
    () => pickVariant(REFERRAL_HEADLINE_TEST, REFERRAL_HEADLINE_VARIANTS),
    [],
  );

  useEffect(() => {
    if (open) {
      track("referral_prompt_shown", {
        variant,
        testKey: REFERRAL_HEADLINE_TEST,
        variant_id: headlineVariant.id,
      });
    }
  }, [open, variant, headlineVariant.id]);

  if (!open) return null;

  const abProps = { testKey: REFERRAL_HEADLINE_TEST, variant: headlineVariant.id };

  const handleCopy = async () => {
    const ok = await copyToClipboard(link);
    if (ok) {
      setCopied(true);
      track("referral_link_copied", { variant, ...abProps });
      incInvitesSent("copy", abProps);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleShare = async () => {
    const ok = await nativeShare({
      title: "Become",
      text: getInviteMessage(),
      url: link,
    });
    if (ok) incInvitesSent("native_share", abProps);
  };

  const dismiss = () => {
    track("referral_prompt_dismissed", { variant, ...abProps });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-primary/30 bg-card p-6 shadow-[0_0_60px_hsl(var(--neon-toxic)/0.35)] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-full hover:bg-foreground/5 text-muted-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary mb-3">
          <Sparkles className="h-5 w-5" />
        </div>

        <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
          {variant === "milestone" ? "// 3 WINS UNLOCKED" : "// INVITE"}
        </p>
        <h3 className="text-2xl font-bold tracking-tight leading-tight">
          Know someone building discipline too?
        </h3>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Invite a friend to Become. Both of you get{" "}
          <strong className="text-foreground">+{REFERRAL_XP_REWARD} XP</strong> when they join.
        </p>

        {/* Link preview */}
        <div className="mt-5 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3 flex items-center gap-2">
          <code className="flex-1 truncate text-xs font-mono text-muted-foreground">{link}</code>
          <button
            onClick={handleCopy}
            className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            aria-label="Copy invite link"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        {/* Actions */}
        <div className="mt-5 grid gap-2">
          <Button
            onClick={handleShare}
            size="lg"
            className="w-full gap-2 rounded-xl shadow-[0_0_24px_hsl(var(--neon-toxic)/0.35)]"
          >
            <Send className="h-4 w-4" />
            Invite a friend
          </Button>
          <button
            onClick={dismiss}
            className="text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};
