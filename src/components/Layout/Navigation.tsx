import { NavLink } from "react-router-dom";
import { LayoutDashboard, ListTodo, Calendar, Trophy, Settings, ShoppingCart, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nContext";

export const Navigation = () => {
  const { t } = useI18n();

  const navItems = [
    { to: "/", label: t.nav.dashboard, icon: LayoutDashboard },
    { to: "/habitos", label: t.nav.habits, icon: ListTodo },
    { to: "/calendario", label: t.nav.calendar, icon: Calendar },
    { to: "/financas", label: t.nav.finances, icon: Wallet },
    { to: "/compras", label: t.nav.shopping, icon: ShoppingCart },
    { to: "/progresso", label: t.nav.progress, icon: Trophy },
    { to: "/definicoes", label: t.nav.settings, icon: Settings },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ListTodo className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight">{t.app.title}</span>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate max-w-[60px]">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};
