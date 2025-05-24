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
<<<<<<< HEAD
  Bookmark // Added Bookmark import
=======
  Bookmark, // Added Bookmark import
  DollarSign, // Added DollarSign import for bidding
  TrendingUp, // Added TrendingUp import for received bids
  ShoppingBag, // Added ShoppingBag import for incoming orders
  ShoppingCart // Added ShoppingCart import for outgoing orders
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton"; // Added Skeleton import
import { useState, useEffect } from "react"; // Added useEffect
import { Link, useLocation } from "react-router-dom";
import { useUnreadNotificationsCount } from "@/hooks/useUnreadNotificationsCount"; // Import the new hook
import { useUnreadMessagesCount } from "@/hooks/useUnreadMessagesCount"; // Import the new hook for messages
import { auth, db } from "@/lib/firebase"; // Import auth and db
import { onAuthStateChanged } from "firebase/auth"; // Import onAuthStateChanged
import { doc, getDoc } from "firebase/firestore"; // Import doc, getDoc

interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

const menuItems = (unreadNotificationsCount: number, unreadMessagesCount: number): MenuItem[] => [ // Use unread counts from hooks
  { icon: Home, label: "Dashboard", href: "/dashboard" },
  { icon: Package, label: "All Listings", href: "/listings" },
  { icon: Package, label: "My Listings", href: "/listings?filter=my-listings" },
  { icon: Bookmark, label: "Bookmarked Products", href: "/listings?filter=bookmarked-listings" },
<<<<<<< HEAD
=======
  { icon: DollarSign, label: "My Bids", href: "/bids/my-bids" },
  { icon: TrendingUp, label: "Received Bids", href: "/bids/received" },
  { icon: ShoppingCart, label: "My Orders", href: "/orders/outgoing" },
  { icon: ShoppingBag, label: "Incoming Orders", href: "/orders/incoming" },
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
  { icon: MessageSquare, label: "Messages", href: "/messages", badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined },
  { icon: Bell, label: "Notifications", href: "/notifications", badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined }, // Use dynamic count
  { icon: User, label: "Profile", href: "/profile" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

const adminItems = [
  { icon: Shield, label: "Admin Dashboard", href: "/admin" },
];

interface UserProfile {
  name: string;
  university: string;
  major?: string;
  avatar?: string;
  role?: string;
  isAdmin?: boolean;
}

export function Sidebar({ className, isCollapsed = false, onToggle }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(isCollapsed);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // State for user profile
  const [loadingUser, setLoadingUser] = useState(true); // Loading state for user profile
  const location = useLocation();
  const { unreadCount: unreadNotificationsCount } = useUnreadNotificationsCount(); // Use the hook to get unread notifications count
  const { unreadMessagesCount } = useUnreadMessagesCount(); // Use the hook to get unread messages count

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data() as UserProfile);
          } else {
            // Fallback if profile doesn't exist in Firestore
            setUserProfile({
              name: user.displayName || "Guest User",
              university: "N/A",
              avatar: user.photoURL || "/placeholder.svg",
            });
          }
        } catch (error) {
          console.error("Error fetching user profile for sidebar:", error);
          setUserProfile(null); // Clear profile on error
        } finally {
          setLoadingUser(false);
        }
      } else {
        setUserProfile(null);
        setLoadingUser(false);
      }
    });
    return () => unsubscribe();
  }, []);

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
            <span className="text-black font-bold text-sm">CC</span>
          </div>
          <span className="font-semibold text-black">CampusConnect</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggle}
          className="h-8 w-8 text-black hover:bg-sidebar-accent hover:text-black"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-2 py-4">
          <div className="space-y-1">
            {menuItems(unreadNotificationsCount, unreadMessagesCount).map((item: MenuItem) => (
              <Button
                key={item.href}
                variant={
                  // Check if current location matches the menu item
                  (location.pathname + location.search) === item.href || 
                  (item.href === "/listings" && location.pathname === "/listings" && !location.search)
                    ? "sidebar-primary" 
                    : "ghost"
                }
                className={cn(
                  "w-full justify-start text-black hover:bg-sidebar-accent hover:text-black",
                  collapsed && "px-2"
                )}
                asChild
              >
                <Link to={item.href}>
                  <item.icon className="h-4 w-4" />
                  {!collapsed && (
                    <>
                      <span className="ml-2">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
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

          {!collapsed && userProfile && (userProfile.role === 'admin' || userProfile.isAdmin) && (
            <div className="pt-4">
              <p className="px-3 text-xs font-medium text-black uppercase tracking-wider">
                Admin
              </p>
              <div className="space-y-1 mt-2">
                {adminItems.map((item) => (
                  <Button
                    key={item.href}
                    variant={location.pathname === item.href ? "sidebar-primary" : "ghost"}
                    className="w-full justify-start text-black hover:bg-sidebar-accent hover:text-black"
                    asChild
                  >
                    <Link to={item.href}>
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
        {loadingUser ? (
          <div className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "space-x-3"
          )}>
            <Skeleton className="h-8 w-8 rounded-full" />
            {!collapsed && (
              <div className="flex-1 min-w-0 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            )}
          </div>
        ) : userProfile ? (
          <div className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "space-x-3"
          )}>
            <Avatar className="h-8 w-8">
              <AvatarImage src={userProfile.avatar || "/placeholder.svg"} />
              <AvatarFallback>{userProfile.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-black">{userProfile.name}</p>
                <p className="text-xs text-black truncate">{userProfile.university} {userProfile.major && `- ${userProfile.major}`}</p>
              </div>
            )}
          </div>
        ) : (
          // Fallback for no user profile (e.g., not logged in)
          <div className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "space-x-3"
          )}>
            <Avatar className="h-8 w-8">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback>GU</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-black">Guest User</p>
                <p className="text-xs text-black truncate">Please log in</p>
              </div>
            )}
          </div>
        )}
        
        {!collapsed && (
          <div className="mt-3 space-y-1">
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
