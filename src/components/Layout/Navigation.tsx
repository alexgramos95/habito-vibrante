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
      {/* Desktop Navigation - Premium clear, sophisticated */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-xl shadow-sm">
        <div className="container flex h-14 items-center justify-between">
          {/* Logo - Clean and confident */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-sm">
                B
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-foreground">{t.app.name}</span>
              <span className="text-[10px] text-muted-foreground tracking-wide hidden sm:block">{t.app.tagline}</span>
            </div>
          </div>
          
          {/* Desktop Navigation Links - Clean pills */}
          <div className="hidden md:flex items-center gap-1">
            {desktopMainItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/app"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            ))}
            
            <div className="h-4 w-px bg-border mx-2" />
            
            {desktopSecondaryItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
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
      
      {/* Mobile Bottom Navigation - Clean and airy */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/98 backdrop-blur-xl md:hidden shadow-[0_-1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-around py-1 px-2 safe-bottom">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app"}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col items-center gap-0.5 rounded-xl px-4 py-2 text-[11px] font-medium transition-all duration-200 touch-target",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute inset-x-3 -top-1 h-0.5 rounded-full bg-primary" />
                  )}
                  <item.icon className={cn(
                    "h-5 w-5 transition-transform duration-150",
                    isActive && "scale-105"
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
