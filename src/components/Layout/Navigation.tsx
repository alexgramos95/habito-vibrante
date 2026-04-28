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
      {/* Desktop Navigation - Arcade Overdrive */}
      <nav className="sticky top-0 z-50 border-b border-foreground/10 bg-background/95 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BecomeLogo compact />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-black uppercase italic tracking-tighter text-foreground">{t.app.name}</span>
              <span className="mono-label text-[10px] text-muted-foreground/60 hidden sm:block">{t.app.tagline}</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {desktopMainItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/app"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase italic tracking-wider transition-all duration-150 border-2",
                    isActive
                      ? "border-primary text-primary bg-primary/10 shadow-[0_0_12px_hsl(var(--neon-toxic)/0.3)]"
                      : "border-transparent text-muted-foreground hover:text-primary hover:border-primary/30",
                  )
                }
              >
                <item.icon className="h-4 w-4 not-italic" />
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            ))}

            <div className="h-4 w-px bg-foreground/15 mx-2" />

            {desktopSecondaryItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase italic tracking-wider transition-all duration-150 border-2",
                    isActive
                      ? "border-accent text-accent bg-accent/10"
                      : "border-transparent text-muted-foreground hover:text-accent hover:border-accent/30",
                  )
                }
              >
                <item.icon className="h-4 w-4 not-italic" />
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-foreground/10 bg-background/98 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-around py-1 px-2 safe-bottom">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app"}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-bold uppercase italic tracking-wider transition-all duration-150 touch-target",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute inset-x-2 -top-px h-0.5 bg-primary shadow-[0_0_8px_hsl(var(--neon-toxic))]" />
                  )}
                  <item.icon className={cn(
                    "h-5 w-5 transition-transform duration-150 not-italic",
                    isActive && "scale-110 drop-shadow-[0_0_6px_hsl(var(--neon-toxic))]",
                  )} />
                  <span className="truncate max-w-[64px]">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
};
