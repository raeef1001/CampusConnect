
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Home, 
  Package, 
  MessageSquare, 
  User, 
  Settings, 
  Shield, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell, // Added Bell import
  Bookmark // Added Bookmark import
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom"; // Import Link and useLocation

interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const menuItems = [
  { icon: Home, label: "Dashboard", href: "/dashboard" },
  { icon: Package, label: "All Listings", href: "/listings" },
  { icon: Package, label: "My Listings", href: "/listings?filter=my-listings" },
  { icon: Bookmark, label: "Bookmarked Products", href: "/listings?filter=bookmarked-listings" }, // Added Bookmarked Products
  { icon: MessageSquare, label: "Messages", href: "/messages", badge: 2 },
  { icon: User, label: "Profile", href: "/profile" },
  { icon: Bell, label: "Notifications", href: "/notifications", badge: 3 }, // Added Notifications
  { icon: Settings, label: "Settings", href: "/settings" }, // Added Settings
];

const adminItems = [
  { icon: Shield, label: "Moderation", href: "/admin/moderation" },
];

export function Sidebar({ className, isCollapsed = false, onToggle }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(isCollapsed);
  const location = useLocation(); // Get current location

  const handleToggle = () => {
    setCollapsed(!collapsed);
    onToggle?.();
  };

  return (
    <div className={cn(
      "flex flex-col border-r bg-sidebar-background",
      collapsed ? "w-16" : "w-64",
      "transition-all duration-300 ease-in-out",
      className
    )}>
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-warm rounded-lg flex items-center justify-center">
              <span className="text-primary-warm-foreground font-bold text-sm">CC</span>
            </div>
            <span className="font-semibold text-sidebar-foreground">CampusConnect</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggle}
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-2 py-4">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Button
                key={item.href}
                variant={location.pathname === item.href ? "sidebar-primary" : "ghost"} // Set active based on current path
                className={cn(
                  "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "px-2"
                )}
                asChild
              >
                <Link to={item.href}> {/* Use Link component */}
                  <item.icon className="h-4 w-4" />
                  {!collapsed && (
                    <>
                      <span className="ml-2">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto bg-warm-500 text-primary-warm-foreground text-xs rounded-full px-2 py-0.5">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              </Button>
            ))}
          </div>

          {!collapsed && (
            <div className="pt-4">
              <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Admin
              </p>
              <div className="space-y-1 mt-2">
                {adminItems.map((item) => (
                  <Button
                    key={item.href}
                    variant="ghost"
                    className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    asChild
                  >
                    <Link to={item.href}> {/* Use Link component */}
                      <item.icon className="h-4 w-4" />
                      <span className="ml-2">{item.label}</span>
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-4">
        <div className={cn(
          "flex items-center",
          collapsed ? "justify-center" : "space-x-3"
        )}>
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">John Doe</p>
              <p className="text-xs text-muted-foreground truncate">Computer Science</p>
            </div>
          )}
        </div>
        
        {!collapsed && (
          <div className="mt-3 space-y-1">
            {/* Removed duplicate Settings button as it's now in menuItems */}
            <Button variant="ghost" size="sm" className="w-full justify-start text-destructive hover:text-destructive-foreground">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
