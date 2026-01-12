import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, Target, Calendar, Wallet, 
  ShoppingCart, User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nContext";

export const Navigation = () => {
  const { t } = useI18n();

  const mainNavItems = [
    { to: "/", label: t.nav.dashboard, icon: LayoutDashboard },
    { to: "/calendario", label: (t.nav as any).calendar || "Calendário", icon: Calendar },
    { to: "/objetivos", label: t.nav.trackers, icon: Target },
    { to: "/financas", label: t.nav.finances, icon: Wallet },
    { to: "/compras", label: t.nav.shopping, icon: ShoppingCart },
  ];

  const secondaryNavItems = [
    { to: "/perfil", label: t.nav.profile, icon: User },
  ];

  const allMobileItems = [
    { to: "/", label: t.nav.dashboard, icon: LayoutDashboard },
    { to: "/calendario", label: (t.nav as any).calendar || "Calendário", icon: Calendar },
    { to: "/objetivos", label: t.nav.trackers, icon: Target },
    { to: "/financas", label: t.nav.finances, icon: Wallet },
    { to: "/perfil", label: t.nav.profile, icon: User },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/30 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <div className="container flex h-14 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold text-sm">
              B
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold tracking-tight">{t.app.name}</span>
              <span className="text-[10px] text-muted-foreground tracking-wide hidden sm:block">{t.app.tagline}</span>
            </div>
          </div>
          
          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {mainNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
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
            
            <div className="h-4 w-px bg-border/50 mx-2" />
            
            {secondaryNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
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
      
      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/30 bg-background/95 backdrop-blur-xl md:hidden safe-bottom">
        <div className="flex items-center justify-around py-2 px-1">
          {allMobileItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 touch-target",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate max-w-[56px]">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
};
