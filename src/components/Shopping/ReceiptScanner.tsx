import { useState, useRef } from "react";
import { Camera, Upload, Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nContext";

export interface ParsedReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

interface ReceiptScannerProps {
  onItemsExtracted: (items: ParsedReceiptItem[]) => void;
}

export const ReceiptScanner = ({ onItemsExtracted }: ReceiptScannerProps) => {
  const { toast } = useToast();
  const { locale } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const normalizeItem = (item: any): ParsedReceiptItem | null => {
    const name = (item.name || item.nome || "").trim();
    if (!name || name.length < 2) return null;

    let quantity = item.quantity ?? item.quantidade ?? 1;
    if (typeof quantity === "string") {
      quantity = parseInt(quantity, 10) || 1;
    }
    quantity = Math.max(1, Math.round(quantity));

    let price = item.price ?? item.precoTotal ?? item.preco ?? 0;
    if (typeof price === "string") {
      price = parseFloat(price.replace(",", ".")) || 0;
    }
    if (price <= 0 || price > 10000) return null;

    return { name, quantity, price };
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Call the edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-receipt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ imageBase64: base64 }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar talão");
      }

      // Normalize and filter items
      const rawItems = data.items || [];
      const validItems: ParsedReceiptItem[] = rawItems
        .map(normalizeItem)
        .filter((item: ParsedReceiptItem | null): item is ParsedReceiptItem => item !== null);

      if (validItems.length > 0) {
        onItemsExtracted(validItems);
        toast({
          title: locale === "pt-PT" ? "Talão processado" : "Receipt processed",
          description: locale === "pt-PT" 
            ? `${validItems.length} ${validItems.length === 1 ? "item encontrado" : "itens encontrados"}` 
            : `${validItems.length} ${validItems.length === 1 ? "item found" : "items found"}`,
        });
      } else {
        // Show helpful toast when no items found - DO NOT call onItemsExtracted
        toast({
          title: locale === "pt-PT" ? "Nenhum item encontrado" : "No items found",
          description: locale === "pt-PT" 
            ? "Não foi possível ler este talão. Tenta outra foto ou verifica a iluminação." 
            : "Could not read this receipt. Try another photo or check the lighting.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Receipt processing error:", error);
      toast({
        title: locale === "pt-PT" ? "Erro ao processar" : "Processing error",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
    e.target.value = "";
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Scan button */}
      <Button
        variant="outline"
        onClick={() => setShowOptions(true)}
        disabled={isProcessing}
        className="gap-2"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Receipt className="h-4 w-4" />
        )}
        {locale === "pt-PT" ? "Fotografar talão" : "Scan receipt"}
      </Button>

      {/* Camera/Upload options dialog */}
      <Dialog open={showOptions} onOpenChange={setShowOptions}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {locale === "pt-PT" ? "Adicionar talão" : "Add receipt"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              variant="default"
              className="w-full gap-3 h-14"
              onClick={() => {
                setShowOptions(false);
                handleCameraCapture();
              }}
              disabled={isProcessing}
            >
              <Camera className="h-5 w-5" />
              {locale === "pt-PT" ? "Tirar foto" : "Take photo"}
            </Button>
            <Button
              variant="outline"
              className="w-full gap-3 h-14"
              onClick={() => {
                setShowOptions(false);
                handleGalleryUpload();
              }}
              disabled={isProcessing}
            >
              <Upload className="h-5 w-5" />
              {locale === "pt-PT" ? "Escolher da galeria" : "Choose from gallery"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
