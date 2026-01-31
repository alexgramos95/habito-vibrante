import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, Target, Calendar, 
  ShoppingCart, User, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nContext";
import { useSubscription } from "@/hooks/useSubscription";

export const Navigation = () => {
  const { t } = useI18n();
  const { subscription, trialStatus } = useSubscription();

  // Check if user has PRO access (PRO plan or active trial)
  const hasPro = subscription.plan === 'pro' || trialStatus.isActive;

  // FREE users: only Hábitos, Calendário, Perfil
  // TRIAL/PRO users: full navigation
  const freeNavItems = [
    { to: "/app", label: t.nav.habits, icon: LayoutDashboard, allowed: true },
    { to: "/app/calendar", label: t.nav.calendar, icon: Calendar, allowed: true },
    { to: "/app/profile", label: t.nav.profile, icon: User, allowed: true },
  ];

  const proNavItems = [
    { to: "/app", label: t.nav.habits, icon: LayoutDashboard, allowed: true },
    { to: "/app/calendar", label: t.nav.calendar, icon: Calendar, allowed: true },
    { to: "/app/trackers", label: t.nav.trackers, icon: Target, allowed: true },
    { to: "/app/shopping", label: t.nav.shopping, icon: ShoppingCart, allowed: true },
    { to: "/app/profile", label: t.nav.profile, icon: User, allowed: true },
  ];

  // Use appropriate nav items based on tier
  const navItems = hasPro ? proNavItems : freeNavItems;

  // Desktop: separate main and secondary items for PRO
  const desktopMainItems = hasPro 
    ? [
        { to: "/app", label: t.nav.habits, icon: LayoutDashboard },
        { to: "/app/calendar", label: t.nav.calendar, icon: Calendar },
        { to: "/app/trackers", label: t.nav.trackers, icon: Target },
        { to: "/app/shopping", label: t.nav.shopping, icon: ShoppingCart },
      ]
    : [
        { to: "/app", label: t.nav.habits, icon: LayoutDashboard },
        { to: "/app/calendar", label: t.nav.calendar, icon: Calendar },
      ];

  const desktopSecondaryItems = [
    { to: "/app/profile", label: t.nav.profile, icon: User },
  ];

  return (
    <>
      {/* Desktop Navigation - Premium minimal */}
      <nav className="sticky top-0 z-50 border-b border-border/20 bg-background/80 backdrop-blur-2xl">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo - Refined */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-accent to-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20">
                B
              </div>
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-primary to-accent opacity-30 blur-sm -z-10" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold tracking-tight">{t.app.name}</span>
              <span className="text-[10px] text-muted-foreground/70 tracking-wide hidden sm:block">{t.app.tagline}</span>
            </div>
          </div>
          
          {/* Desktop Navigation Links - Tier-aware */}
          <div className="hidden md:flex items-center gap-1.5">
            {desktopMainItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/app"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm shadow-primary/10"
                      : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            ))}
            
            <div className="h-5 w-px bg-border/40 mx-3" />
            
            {desktopSecondaryItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm shadow-primary/10"
                      : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      
      {/* Mobile Bottom Navigation - Tier-aware with premium touch targets */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/20 bg-background/95 backdrop-blur-2xl md:hidden">
        <div className="flex items-center justify-around py-1.5 px-2 safe-bottom">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app"}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col items-center gap-1 rounded-2xl px-4 py-2.5 text-[11px] font-medium transition-all duration-300 touch-target",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground/70 active:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute inset-x-2 -top-1.5 h-0.5 rounded-full bg-primary" />
                  )}
                  <item.icon className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isActive && "scale-110"
                  )} />
                  <span className="truncate max-w-[56px]">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
};
