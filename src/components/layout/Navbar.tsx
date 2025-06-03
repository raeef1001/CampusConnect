
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Bell, Search, Plus, MessageSquare, User, Settings, LogOut, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { useUnreadNotificationsCount } from "@/hooks/useUnreadNotificationsCount";
import { useUnreadMessagesCount } from "@/hooks/useUnreadMessagesCount";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/context/CartContext"; // Import useCart hook

interface NavbarProps {
  isAuthenticated?: boolean;
  onCreateListing?: () => void;
  onLogout?: () => void;
}

interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
}

export function Navbar({ isAuthenticated = false, onCreateListing, onLogout }: NavbarProps) {
  const navigate = useNavigate();
  const { unreadCount } = useUnreadNotificationsCount();
  const { unreadMessagesCount } = useUnreadMessagesCount();
  const { cartItems } = useCart(); // Use cart context
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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
              email: user.email || "N/A",
              avatar: user.photoURL || "/placeholder.svg",
            });
          }
        } catch (error) {
          console.error("Error fetching user profile for navbar:", error);
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

  // Support both demo and real auth for logout
  const handleLogout = async () => { // Made async to await signOut
    localStorage.removeItem('campusconnect-demo-auth');
    localStorage.removeItem('user');
    
    try {
      await auth.signOut(); // Await Firebase signOut
      console.log("User signed out from Firebase.");
    } catch (error) {
      console.error("Error signing out from Firebase:", error);
    }

    if (onLogout) {
      onLogout();
    } else {
      navigate('/');
    }
  };

  // Accept both demo and real auth for showing logged-in state
  const isDemoLoggedIn = localStorage.getItem('campusconnect-demo-auth') === 'true';
  const isUserLoggedIn = !!localStorage.getItem('user');
  if (!isAuthenticated && !isDemoLoggedIn && !isUserLoggedIn) {
    return (
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link to="/" className="flex items-center space-x-2">
              <img src="/logo.png" alt="CampusConnect Logo" className="h-8 w-8" />
              <span className="font-semibold text-xl">CampusConnect</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              About
            </a>
            <a href="#contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Login</Link>
            </Button>
            <Button size="sm" variant="primary-warm" asChild>
              <Link to="/auth?tab=signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <img src="/logo.png" alt="CampusConnect Logo" className="h-8 w-8" />
            <span className="font-semibold text-xl">CampusConnect</span>
          </Link>
        </div>
        
        <div className="flex-1 max-w-lg mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search products, services, or sellers..."
              className="pl-10 pr-4"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  navigate(`/listings?search=${encodeURIComponent(searchQuery)}`);
                }
              }}
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Button onClick={() => navigate('/create-listing')} variant="primary-warm">
            <Plus className="h-4 w-4 mr-2" />
            Create Listing
          </Button>
          
          <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/notifications')}>
            <Bell className="h-5 w-5" />
            {/* Placeholder for dynamic notification count */}
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary-warm">
                {unreadCount}
              </Badge>
            )}
          </Button>

          <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/messages')}>
            <MessageSquare className="h-5 w-5" />
            {unreadMessagesCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary-warm">
                {unreadMessagesCount}
              </Badge>
            )}
          </Button>

          {/* Cart Button */}
          <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/cart')}>
            <ShoppingCart className="h-5 w-5" />
            {cartItems.length > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary-warm">
                {cartItems.length}
              </Badge>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                {loadingUser ? (
                  <Skeleton className="h-8 w-8 rounded-full" />
                ) : userProfile ? (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userProfile.avatar || "/placeholder.svg"} alt={userProfile.name} />
                    <AvatarFallback>{userProfile.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder.svg" alt="Guest" />
                    <AvatarFallback>GU</AvatarFallback>
                  </Avatar>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                {loadingUser ? (
                  <div className="flex flex-col space-y-1">
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ) : userProfile ? (
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userProfile.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userProfile.email}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Guest User</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Please log in
                    </p>
                  </div>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
