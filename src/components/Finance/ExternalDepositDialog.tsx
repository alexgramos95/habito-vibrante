import { useState } from "react";
import { PlusCircle, Wallet, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nContext";

interface ExternalDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (deposit: {
    amount: number;
    description: string;
    tags: string[];
  }) => void;
}

const SUGGESTED_TAGS = [
  "investment",
  "bonus",
  "gift",
  "refund",
  "savings",
  "other",
];

export const ExternalDepositDialog = ({
  open,
  onOpenChange,
  onSave,
}: ExternalDepositDialogProps) => {
  const { t, locale } = useI18n();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");

  const tagLabels: Record<string, Record<string, string>> = {
    investment: { "pt-PT": "Investimento", "en-US": "Investment" },
    bonus: { "pt-PT": "Bónus", "en-US": "Bonus" },
    gift: { "pt-PT": "Presente", "en-US": "Gift" },
    refund: { "pt-PT": "Reembolso", "en-US": "Refund" },
    savings: { "pt-PT": "Poupança", "en-US": "Savings" },
    other: { "pt-PT": "Outro", "en-US": "Other" },
  };

  const handleTagToggle = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      setTags((prev) => [...prev, customTag.trim()]);
      setCustomTag("");
    }
  };

  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    onSave({
      amount: parsedAmount,
      description: description.trim(),
      tags,
    });

    // Reset form
    setAmount("");
    setDescription("");
    setTags([]);
    setCustomTag("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-success" />
            {locale === "pt-PT" ? "Depósito Externo" : "External Deposit"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="deposit-amount">
              {locale === "pt-PT" ? "Valor (€)" : "Amount ($)"}
            </Label>
            <Input
              id="deposit-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="50.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="deposit-description">
              {locale === "pt-PT" ? "Descrição" : "Description"}
            </Label>
            <Input
              id="deposit-description"
              placeholder={
                locale === "pt-PT"
                  ? "Ex: Reembolso de seguro"
                  : "E.g., Insurance refund"
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tags
            </Label>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={tags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer transition-all"
                  onClick={() => handleTagToggle(tag)}
                >
                  {tagLabels[tag]?.[locale] || tag}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder={locale === "pt-PT" ? "Tag personalizada" : "Custom tag"}
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCustomTag()}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleAddCustomTag}
                disabled={!customTag.trim()}
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
            {tags.filter((t) => !SUGGESTED_TAGS.includes(t)).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags
                  .filter((t) => !SUGGESTED_TAGS.includes(t))
                  .map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.actions.cancel}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            {t.actions.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
