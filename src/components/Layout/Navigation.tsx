import { NavLink } from "react-router-dom";
import { LayoutDashboard, ListTodo, Calendar, Trophy, Settings, ShoppingCart, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/habitos", label: "Hábitos", icon: ListTodo },
  { to: "/calendario", label: "Calendário", icon: Calendar },
  { to: "/financas", label: "Finanças", icon: Wallet },
  { to: "/compras", label: "Compras", icon: ShoppingCart },
  { to: "/progresso", label: "Progresso", icon: Trophy },
  { to: "/definicoes", label: "Definições", icon: Settings },
];

export const Navigation = () => {
  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ListTodo className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Habit Tracker</span>
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
