import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Calendar,
  MessageSquare,
  Settings,
  Trophy,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import focusPlusLogo from "@/assets/focusplus-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { t } = useLanguage();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard" },
    { to: "/planner", icon: Calendar, labelKey: "nav.planner" },
    { to: "/tasks", icon: CheckSquare, labelKey: "nav.tasks" },
    { to: "/notes", icon: FileText, labelKey: "nav.notes" },
    { to: "/chat", icon: MessageSquare, labelKey: "nav.chat" },
    { to: "/achievements", icon: Trophy, labelKey: "nav.achievements" },
    { to: "/settings", icon: Settings, labelKey: "nav.settings" },
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-3">
          <div className={cn("flex items-center gap-2", collapsed && "justify-center w-full")}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden shrink-0">
              <img src={focusPlusLogo} alt="FocusPlus Logo" className="h-9 w-9 object-contain" />
            </div>
            {!collapsed && (
              <span className="text-xl font-semibold focus-gradient-text">FocusPlus</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? t(item.labelKey) : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && t(item.labelKey)}
              </NavLink>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border p-2">
          {!collapsed && (
            <div className="mb-3 flex items-center gap-3 rounded-lg bg-sidebar-accent/50 px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground shrink-0">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 truncate">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {user?.email?.split("@")[0] || "User"}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="mb-3 flex justify-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            title={collapsed ? t("nav.logout") : undefined}
            className={cn(
              "w-full gap-2 text-muted-foreground hover:text-destructive",
              collapsed ? "justify-center px-2" : "justify-start"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && t("nav.logout")}
          </Button>
        </div>
      </div>

      {/* Collapse Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-muted"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </aside>
  );
}
