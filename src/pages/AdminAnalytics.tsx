import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/Layout/PageHeader";
import { toast } from "sonner";

interface FunnelRow { day: string; event_name: string; users: number; events: number; }
interface RevenueRow { day: string; event_type: string; plan: string | null; gross_cents: number; events: number; }
interface CohortRow { cohort_week: string; week_offset: number; cohort_size: number; retained_users: number; }

export default function AdminAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [funnel, setFunnel] = useState<FunnelRow[]>([]);
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    void check();
  }, [user, authLoading]);

  const check = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user!.id)
      .eq("role", "admin")
      .maybeSingle();
    if (error) console.warn(error);
    const admin = !!data;
    setIsAdmin(admin);
    if (admin) await loadData();
    setLoading(false);
  };

  const loadData = async () => {
    const [f, r, c] = await Promise.all([
      supabase.from("funnel_daily" as any).select("*").order("day", { ascending: false }).limit(200),
      supabase.from("revenue_daily" as any).select("*").order("day", { ascending: false }).limit(100),
      supabase.from("cohort_retention_weekly" as any).select("*").order("cohort_week", { ascending: false }).limit(100),
    ]);
    if (f.data) setFunnel(f.data as any);
    if (r.data) setRevenue(r.data as any);
    if (c.data) setCohorts(c.data as any);
  };

  const claimAdmin = async () => {
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_first_admin");
    setClaiming(false);
    if (error) { toast.error(error.message); return; }
    if (data) { toast.success("You're now admin"); await check(); }
    else toast.error("An admin already exists");
  };

  if (authLoading || loading) {
    return <div className="min-h-screen grid place-items-center"><Spinner /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen p-6 max-w-md mx-auto space-y-4">
        <h1 className="text-xl font-semibold">Admin access required</h1>
        <p className="text-sm text-muted-foreground">
          You don't have admin privileges. If no admin exists yet, you can claim the role (one-time bootstrap).
        </p>
        <Button onClick={claimAdmin} disabled={claiming}>
          {claiming ? "Claiming…" : "Claim admin"}
        </Button>
      </div>
    );
  }

  // Aggregate funnel by event for top-line counts
  const eventTotals = funnel.reduce<Record<string, { users: number; events: number }>>((acc, row) => {
    if (!acc[row.event_name]) acc[row.event_name] = { users: 0, events: 0 };
    acc[row.event_name].users += Number(row.users || 0);
    acc[row.event_name].events += Number(row.events || 0);
    return acc;
  }, {});

  const totalRevenue = revenue.reduce((sum, r) => sum + (r.gross_cents || 0), 0);

  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Analytics" subtitle="Funnel · Revenue · Cohorts" backTo="/app/profile" />
      <div className="px-4 space-y-6 max-w-5xl mx-auto">
        <section>
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-2">Top events (last 90d)</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(eventTotals).slice(0, 12).map(([name, v]) => (
              <Card key={name} className="p-3">
                <div className="text-xs text-muted-foreground truncate">{name}</div>
                <div className="text-2xl font-semibold">{v.users}</div>
                <div className="text-xs text-muted-foreground">{v.events} events</div>
              </Card>
            ))}
            {Object.keys(eventTotals).length === 0 && (
              <div className="col-span-full text-sm text-muted-foreground">No events yet.</div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-2">Revenue</h2>
          <Card className="p-4 mb-3">
            <div className="text-xs text-muted-foreground">Gross (last 90d)</div>
            <div className="text-3xl font-semibold">€{(totalRevenue / 100).toFixed(2)}</div>
          </Card>
          <Card className="p-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr><th className="text-left p-1">Day</th><th className="text-left p-1">Type</th><th className="text-left p-1">Plan</th><th className="text-right p-1">€</th><th className="text-right p-1">#</th></tr>
              </thead>
              <tbody>
                {revenue.map((r, i) => (
                  <tr key={i} className="border-t border-border/40">
                    <td className="p-1">{new Date(r.day).toLocaleDateString()}</td>
                    <td className="p-1">{r.event_type}</td>
                    <td className="p-1">{r.plan || "—"}</td>
                    <td className="p-1 text-right">{((r.gross_cents || 0) / 100).toFixed(2)}</td>
                    <td className="p-1 text-right">{r.events}</td>
                  </tr>
                ))}
                {revenue.length === 0 && <tr><td colSpan={5} className="p-2 text-muted-foreground">No revenue yet.</td></tr>}
              </tbody>
            </table>
          </Card>
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-2">Weekly cohort retention</h2>
          <Card className="p-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr><th className="text-left p-1">Cohort</th><th className="text-right p-1">Size</th><th className="text-right p-1">Week</th><th className="text-right p-1">Retained</th><th className="text-right p-1">%</th></tr>
              </thead>
              <tbody>
                {cohorts.map((c, i) => (
                  <tr key={i} className="border-t border-border/40">
                    <td className="p-1">{new Date(c.cohort_week).toLocaleDateString()}</td>
                    <td className="p-1 text-right">{c.cohort_size}</td>
                    <td className="p-1 text-right">+{c.week_offset}</td>
                    <td className="p-1 text-right">{c.retained_users}</td>
                    <td className="p-1 text-right">{c.cohort_size ? Math.round((c.retained_users / c.cohort_size) * 100) : 0}%</td>
                  </tr>
                ))}
                {cohorts.length === 0 && <tr><td colSpan={5} className="p-2 text-muted-foreground">Not enough data yet.</td></tr>}
              </tbody>
            </table>
          </Card>
        </section>
      </div>
    </div>
  );
}
