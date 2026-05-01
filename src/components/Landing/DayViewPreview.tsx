import { useEffect, useState } from "react";
import { Plus, Settings2, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * DayViewPreview — a faithful, static replica of the real in-app Day View
 * (src/components/Dashboard/DayView.tsx) for the marketing landing.
 * Mirrors the exact structure: telemetry header, level + streak, momentum
 * bar, Directive (Priority) box, and Subsystems list (MinimalHabitCard).
 */
export const DayViewPreview = () => {
  // Animate second habit checking off ~1.6s after mount, mirroring the app feel.
  const [secondDone, setSecondDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSecondDone(true), 1600);
    return () => clearTimeout(t);
  }, []);

  const completed = secondDone ? 2 : 1;
  const total = 4;
  const completionPct = Math.round((completed / total) * 100);

  const subsystems = [
    { name: "MEDITATE", time: "06:45", color: "hsl(265 70% 60%)", done: true },
    { name: "READ 20 MIN", time: "08:15", color: "hsl(195 80% 55%)", done: secondDone },
    { name: "TRAIN", time: "18:00", color: "hsl(var(--primary))", done: false },
    { name: "JOURNAL", time: "22:00", color: "hsl(340 75% 60%)", done: false },
  ];

  return (
    <div className="space-y-10">
      {/* Operator Telemetry Header */}
      <header className="space-y-6 border-b border-foreground/10 pb-7">
        <div className="flex items-center gap-3">
          <span className="size-2 bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--neon-toxic))]" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
            SYSTEM ACTIVE · WEDNESDAY, APRIL 29
          </span>
        </div>

        <div className="flex items-end justify-between gap-4">
          <h1 className="font-black uppercase italic tracking-tighter text-5xl md:text-6xl leading-none">
            LEVEL{" "}
            <span
              className="text-primary tabular-nums"
              style={{ textShadow: "0 0 16px hsl(var(--neon-toxic) / 0.5)" }}
            >
              12
            </span>
          </h1>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
              STREAK
            </div>
            <div
              className="font-black uppercase italic tracking-tighter text-3xl text-accent tabular-nums"
              style={{ textShadow: "0 0 14px hsl(var(--neon-ultra) / 0.5)" }}
            >
              47<span className="text-sm text-muted-foreground/60 ml-1 not-italic">D</span>
            </div>
          </div>
        </div>

        {/* Momentum bar */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-semibold text-foreground tracking-tight">
              You're building momentum.
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60 tabular-nums">
              {completed}/{total}
            </span>
          </div>
          <div className="h-1.5 bg-foreground/[0.06] relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_0_12px_hsl(var(--neon-toxic)/0.7)]"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </header>

      {/* Directive — Main Mission */}
      <section className="relative">
        <div className="absolute -top-3 left-4 bg-background px-2 z-10">
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
            ACTIVE_DIRECTIVE
          </span>
        </div>
        <div className="border-2 border-primary/50 bg-card shadow-[4px_4px_0_0_hsl(var(--neon-ultra)/0.4)] p-6 md:p-8 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <span className="inline-block bg-primary text-primary-foreground px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest">
                PRIORITY
              </span>
              <h2 className="font-black uppercase italic tracking-tighter text-3xl md:text-4xl text-foreground leading-[0.95]">
                Train
              </h2>
              <p className="text-sm text-muted-foreground max-w-[36ch]">
                System operational. Complete pending actions before reset.
              </p>
            </div>
            <Zap className="h-8 w-8 text-primary shrink-0 drop-shadow-[0_0_8px_hsl(var(--neon-toxic))]" />
          </div>

          <Button size="xl" className="w-full">
            EXECUTE PROTOCOL
          </Button>
        </div>
      </section>

      {/* Subsystems */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap">
              SUBSYSTEMS
            </span>
            <div className="h-px flex-1 bg-foreground/10" />
          </div>
          <div className="flex items-center gap-1">
            <button className="h-8 w-8 inline-flex items-center justify-center text-muted-foreground/60">
              <Settings2 className="h-4 w-4" />
            </button>
            <button className="h-8 w-8 inline-flex items-center justify-center text-muted-foreground/60">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {subsystems.map((h) => (
            <div
              key={h.name}
              className={cn(
                "relative flex items-center gap-4 min-h-[72px] border bg-card overflow-hidden transition-colors",
                h.done ? "border-primary/40" : "border-foreground/10",
              )}
            >
              <div
                className={cn("relative w-[3px] shrink-0 transition-all", h.done ? "h-12" : "h-10")}
                style={{
                  backgroundColor: h.color,
                  opacity: h.done ? 1 : 0.55,
                  boxShadow: h.done ? `0 0 10px ${h.color}` : undefined,
                }}
              />
              <div
                className={cn(
                  "relative flex items-center justify-center w-11 h-11 border-2 shrink-0 transition-all duration-300",
                  h.done
                    ? "bg-primary border-primary text-primary-foreground shadow-[0_0_14px_hsl(var(--neon-toxic)/0.55)]"
                    : "border-foreground/20 bg-transparent",
                )}
              >
                <Check
                  className={cn(
                    "h-5 w-5 stroke-[3] transition-all duration-300",
                    h.done ? "opacity-100 scale-100" : "opacity-0 scale-75",
                  )}
                />
              </div>
              <div className="relative flex-1 min-w-0 flex flex-col gap-0.5 pr-4">
                <span
                  className={cn(
                    "text-left font-bold uppercase tracking-tight text-[14px] leading-tight",
                    h.done ? "text-primary" : "text-foreground",
                  )}
                >
                  {h.name}
                  <span className="ml-2 opacity-70 font-mono text-[11px]">{h.time}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
