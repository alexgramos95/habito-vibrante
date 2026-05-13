import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Calendar,
  ShoppingCart, User, Leaf,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nContext";
import { useSubscription } from "@/hooks/useSubscription";
import { BecomeLogo } from "@/components/Brand/BecomeLogo";

export const Navigation = () => {
  const { t, locale } = useI18n();
  const { subscription, trialStatus } = useSubscription();
  const lang = locale.startsWith("pt") ? "pt" : "en";

  const hasPro = subscription.plan === 'pro' || trialStatus.isActive;

  const freeNavItems = [
    { to: "/app", label: t.nav.habits, icon: LayoutDashboard },
    { to: "/app/calendar", label: t.nav.calendar, icon: Calendar },
    { to: "/app/profile", label: t.nav.profile, icon: User },
  ];

  const proNavItems = [
    { to: "/app", label: t.nav.habits, icon: LayoutDashboard },
    { to: "/app/calendar", label: t.nav.calendar, icon: Calendar },
    { to: "/app/nutrition", label: lang === "pt" ? "Nutrição" : "Nutrition", icon: Leaf },
    { to: "/app/shopping", label: t.nav.shopping, icon: ShoppingCart },
    { to: "/app/profile", label: t.nav.profile, icon: User },
  ];

  const navItems = hasPro ? proNavItems : freeNavItems;

  const desktopMainItems = hasPro
    ? [
        { to: "/app", label: t.nav.habits, icon: LayoutDashboard },
        { to: "/app/calendar", label: t.nav.calendar, icon: Calendar },
        { to: "/app/nutrition", label: lang === "pt" ? "Nutrição" : "Nutrition", icon: Leaf },
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
      {/* Desktop Navigation — softer, recedes into the system */}
      <nav className="sticky top-0 z-50 border-b border-foreground/[0.05] bg-background/80 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2.5 opacity-90">
            <BecomeLogo compact />
            <span className="text-sm font-black uppercase italic tracking-tighter text-foreground/80">{t.app.name}</span>
          </div>

          <div className="hidden md:flex items-center gap-0.5">
            {desktopMainItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/app"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors duration-200 rounded-lg",
                    isActive
                      ? "text-primary/90 bg-primary/[0.06]"
                      : "text-muted-foreground/60 hover:text-foreground/90",
                  )
                }
              >
                <item.icon className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            ))}

            <div className="h-3 w-px bg-foreground/10 mx-2" />

            {desktopSecondaryItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors duration-200 rounded-lg",
                    isActive
                      ? "text-foreground/90 bg-foreground/[0.05]"
                      : "text-muted-foreground/60 hover:text-foreground/90",
                  )
                }
              >
                <item.icon className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation — softer chrome */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-foreground/[0.06] bg-background/92 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-around py-1 px-2 safe-bottom">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app"}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-medium tracking-wider transition-colors duration-200 touch-target",
                  isActive
                    ? "text-primary/90"
                    : "text-muted-foreground/55 active:text-foreground/90",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn(
                    "h-[18px] w-[18px] transition-all duration-300",
                    isActive && "drop-shadow-[0_0_4px_hsl(var(--neon-toxic)/0.6)]",
                  )} />
                  <span className="truncate max-w-[64px] opacity-90">{item.label}</span>
                  {isActive && (
                    <span className="absolute -bottom-px h-[2px] w-1 rounded-full bg-primary/80 shadow-[0_0_4px_hsl(var(--neon-toxic))]" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
};
