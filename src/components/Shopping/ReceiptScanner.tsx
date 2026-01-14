import { useState, useRef } from "react";
import { Camera, Upload, Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nContext";

interface ReceiptItem {
  nome: string;
  quantidade: string;
  precoUnit: number | null;
  precoTotal: number;
}

interface ReceiptScannerProps {
  onItemsExtracted: (items: ReceiptItem[]) => void;
}

export const ReceiptScanner = ({ onItemsExtracted }: ReceiptScannerProps) => {
  const { toast } = useToast();
  const { locale } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao processar talão");
      }

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        onItemsExtracted(data.items);
        toast({
          title: locale === "pt-PT" ? "Talão processado" : "Receipt processed",
          description: locale === "pt-PT" 
            ? `${data.itemCount} itens encontrados` 
            : `${data.itemCount} items found`,
        });
      } else {
        toast({
          title: locale === "pt-PT" ? "Nenhum item encontrado" : "No items found",
          description: locale === "pt-PT" 
            ? "Tenta com uma foto mais nítida" 
            : "Try with a clearer photo",
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
    // Reset input
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

      {/* Scan button that opens options */}
      <Button
        variant="outline"
        onClick={() => setShowCamera(true)}
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
      <Dialog open={showCamera} onOpenChange={setShowCamera}>
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
                setShowCamera(false);
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
                setShowCamera(false);
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
