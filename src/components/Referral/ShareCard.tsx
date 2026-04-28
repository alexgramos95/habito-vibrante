import { useEffect, useMemo, useRef, useState } from "react";
import { Share2, Download, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { nativeShare, buildReferralLink } from "@/lib/referral";
import { track } from "@/hooks/useAnalytics";
import { pickVariant, SHARE_HEADLINE_TEST, SHARE_HEADLINE_VARIANTS } from "@/lib/abTest";

interface ShareCardProps {
  open: boolean;
  onClose: () => void;
  stats: {
    streak: number;
    wins: number;
    consistency: number; // 0..100
    level: number;
  };
  identityLabel?: string; // e.g. "disciplined self"
  isPT?: boolean;
}

const W = 1080;
const H = 1080;

const drawCard = (
  ctx: CanvasRenderingContext2D,
  stats: ShareCardProps["stats"],
  identityLabel: string,
  isPT: boolean,
  headline: string,
) => {
  // Background gradient — premium dark warm
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#1a1814");
  grad.addColorStop(1, "#0d0c0a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Radial neon glow
  const glow = ctx.createRadialGradient(W / 2, 220, 50, W / 2, 220, 700);
  glow.addColorStop(0, "rgba(190, 255, 80, 0.25)");
  glow.addColorStop(1, "rgba(190, 255, 80, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Top label
  ctx.fillStyle = "#beff50";
  ctx.font = "600 24px ui-monospace, SF Mono, monospace";
  ctx.textAlign = "center";
  ctx.fillText(isPT ? "// SEMANA COMPLETA" : "// WEEK COMPLETE", W / 2, 120);

  // Headline (A/B variant) — wraps to 2 lines if needed
  ctx.fillStyle = "#f5f1e8";
  ctx.font = "700 56px ui-sans-serif, system-ui, -apple-system";
  ctx.textAlign = "center";
  wrapText(ctx, headline, W / 2, 240, W - 160, 64);
  ctx.fillStyle = "#a8a29e";
  ctx.font = "400 32px ui-sans-serif, system-ui, -apple-system";
  ctx.fillText(isPT ? `Cada vez mais ${identityLabel}.` : `Becoming more ${identityLabel}.`, W / 2, 340);

  // Stats grid (2x2)
  const cardW = 420;
  const cardH = 220;
  const gap = 30;
  const startX = (W - (cardW * 2 + gap)) / 2;
  const startY = 380;

  const tiles = [
    { label: isPT ? "STREAK" : "STREAK", value: `${stats.streak}d` },
    { label: isPT ? "VITÓRIAS" : "WINS", value: `${stats.wins}` },
    { label: isPT ? "CONSISTÊNCIA" : "CONSISTENCY", value: `${stats.consistency}%` },
    { label: isPT ? "NÍVEL" : "LEVEL", value: `${stats.level}` },
  ];

  tiles.forEach((t, i) => {
    const x = startX + (i % 2) * (cardW + gap);
    const y = startY + Math.floor(i / 2) * (cardH + gap);
    // card bg
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    roundRect(ctx, x, y, cardW, cardH, 28);
    ctx.fill();
    // border
    ctx.strokeStyle = "rgba(190, 255, 80, 0.18)";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, cardW, cardH, 28);
    ctx.stroke();
    // label
    ctx.fillStyle = "#beff50";
    ctx.font = "600 22px ui-monospace, SF Mono, monospace";
    ctx.textAlign = "left";
    ctx.fillText(t.label, x + 32, y + 56);
    // value
    ctx.fillStyle = "#f5f1e8";
    ctx.font = "800 110px ui-sans-serif, system-ui, -apple-system";
    ctx.textAlign = "left";
    ctx.fillText(t.value, x + 32, y + 170);
  });

  // Footer brand
  ctx.fillStyle = "#a8a29e";
  ctx.font = "500 32px ui-sans-serif, system-ui, -apple-system";
  ctx.textAlign = "center";
  ctx.fillText("become.pt", W / 2, H - 90);
  ctx.fillStyle = "#f5f1e8";
  ctx.font = "700 44px ui-sans-serif, system-ui, -apple-system";
  ctx.fillText(isPT ? "Torna-te." : "Become.", W / 2, H - 140);
};

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
) => {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineHeight));
};

export const ShareCard = ({ open, onClose, stats, identityLabel = "disciplined self", isPT = true }: ShareCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!open) return;
    track("share_card_opened", stats);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawCard(ctx, stats, identityLabel, isPT);
  }, [open, stats, identityLabel, isPT]);

  if (!open) return null;

  const getBlob = (): Promise<Blob | null> =>
    new Promise(resolve => canvasRef.current?.toBlob(b => resolve(b), "image/png", 0.95) ?? resolve(null));

  const handleShare = async () => {
    const blob = await getBlob();
    if (!blob) return;
    const file = new File([blob], "become-week.png", { type: "image/png" });
    const link = buildReferralLink();
    const text = isPT
      ? `Semana feita. ${stats.wins} vitórias · ${stats.consistency}% de consistência. Junta-te à Become.`
      : `Week done. ${stats.wins} wins · ${stats.consistency}% consistency. Join Become.`;
    let ok = false;
    try {
      const nav: any = navigator;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], text, url: link, title: "Become" });
        ok = true;
      } else {
        ok = await nativeShare({ title: "Become", text, url: link });
      }
    } catch { /* cancelled */ }
    if (ok) {
      track("share_card_shared", stats);
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    }
  };

  const handleDownload = async () => {
    const blob = await getBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `become-week-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
    URL.revokeObjectURL(url);
    track("share_card_downloaded", stats);
  };

  return (
    <div
      className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl border border-primary/30 bg-card p-5 shadow-[0_0_60px_hsl(var(--neon-toxic)/0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-full hover:bg-foreground/5 text-muted-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
          {isPT ? "// CARTÃO PARTILHÁVEL" : "// SHAREABLE CARD"}
        </p>
        <h3 className="text-lg font-bold tracking-tight">
          {isPT ? "Mostra a tua semana." : "Share your week."}
        </h3>

        {/* Canvas preview — square */}
        <div className="mt-3 rounded-2xl overflow-hidden border border-foreground/10 bg-black">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="block w-full h-auto"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={handleDownload} size="sm" variant="outline" className="gap-1.5 rounded-xl">
            <Download className="h-4 w-4" />
            {isPT ? "Guardar" : "Save"}
          </Button>
          <Button onClick={handleShare} size="sm" className="gap-1.5 rounded-xl">
            {shared ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            {shared ? (isPT ? "Partilhado" : "Shared") : (isPT ? "Partilhar" : "Share")}
          </Button>
        </div>
      </div>
    </div>
  );
};
