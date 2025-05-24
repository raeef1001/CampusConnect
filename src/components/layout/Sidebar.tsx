
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
  ChevronRight
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";

interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const menuItems = [
  { icon: Home, label: "Dashboard", href: "/dashboard", active: true },
  { icon: Package, label: "My Listings", href: "/listings" },
  { icon: MessageSquare, label: "Messages", href: "/messages", badge: 2 },
  { icon: User, label: "Profile", href: "/profile" },
];

const adminItems = [
  { icon: Shield, label: "Moderation", href: "/admin/moderation" },
];

export function Sidebar({ className, isCollapsed = false, onToggle }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(isCollapsed);

  const handleToggle = () => {
    setCollapsed(!collapsed);
    onToggle?.();
  };

  return (
    <div className={cn(
      "flex flex-col border-r bg-gray-50/40",
      collapsed ? "w-16" : "w-64",
      "transition-all duration-300 ease-in-out",
      className
    )}>
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CC</span>
            </div>
            <span className="font-semibold">CampusConnect</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggle}
          className="h-8 w-8"
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
                variant={item.active ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  collapsed && "px-2"
                )}
                asChild
              >
                <a href={item.href}>
                  <item.icon className="h-4 w-4" />
                  {!collapsed && (
                    <>
                      <span className="ml-2">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </a>
              </Button>
            ))}
          </div>

          {!collapsed && (
            <div className="pt-4">
              <p className="px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Admin
              </p>
              <div className="space-y-1 mt-2">
                {adminItems.map((item) => (
                  <Button
                    key={item.href}
                    variant="ghost"
                    className="w-full justify-start"
                    asChild
                  >
                    <a href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span className="ml-2">{item.label}</span>
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
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
              <p className="text-sm font-medium truncate">John Doe</p>
              <p className="text-xs text-gray-500 truncate">Computer Science</p>
            </div>
          )}
        </div>
        
        {!collapsed && (
          <div className="mt-3 space-y-1">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start text-red-600 hover:text-red-700">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
