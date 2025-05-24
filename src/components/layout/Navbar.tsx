
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
import { Bell, Search, Plus, MessageSquare, User, Settings, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";

interface NavbarProps {
  isAuthenticated?: boolean;
  onCreateListing?: () => void;
}

export function Navbar({ isAuthenticated = false, onCreateListing, onLogout }: NavbarProps) {
  const navigate = useNavigate();

  // Support both demo and real auth for logout
  const handleLogout = () => {
    localStorage.removeItem('campusconnect-demo-auth');
    localStorage.removeItem('user');
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
              <div className="w-8 h-8 bg-primary-warm rounded-lg flex items-center justify-center">
                <span className="text-primary-warm-foreground font-bold text-sm">CC</span>
              </div>
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
            <Button size="sm" className="bg-primary-warm hover:bg-warm-600" asChild>
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
            <div className="w-8 h-8 bg-primary-warm rounded-lg flex items-center justify-center">
              <span className="text-primary-warm-foreground font-bold text-sm">CC</span>
            </div>
            <span className="font-semibold text-xl">CampusConnect</span>
          </Link>
        </div>
        
        <div className="flex-1 max-w-lg mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search products, services, or sellers..."
              className="pl-10 pr-4"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Button onClick={() => navigate('/create-listing')} className="bg-primary-warm hover:bg-warm-600">
            <Plus className="h-4 w-4 mr-2" />
            Create Listing
          </Button>
          
          <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/notifications')}>
            <Bell className="h-5 w-5" />
            {/* Placeholder for dynamic notification count */}
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-warm-500">
              3
            </Badge>
          </Button>

          <Button variant="ghost" size="icon" onClick={() => navigate('/messages')}>
            <MessageSquare className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg" alt="@username" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">John Doe</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    john@iut-dhaka.edu
                  </p>
                </div>
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
