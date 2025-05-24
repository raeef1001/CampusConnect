
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FilterSidebar } from "@/components/marketplace/FilterSidebar";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { FloatingChat } from "@/components/ui/floating-chat";
import { 
  Grid, 
  List, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Bell
} from "lucide-react";
import { Input } from "@/components/ui/input";

// Mock data for listings
const mockListings = [
  {
    id: "1",
    title: "MacBook Pro 13-inch 2021",
    price: "$1,200",
    condition: "Like New",
    description: "Perfect condition MacBook Pro with M1 chip. Comes with original charger and box. Used for only 6 months.",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop",
    seller: {
      name: "Sarah Chen",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
      university: "University of Dhaka",
      rating: 4.9
    },
    category: "Electronics"
  },
  {
    id: "2",
    title: "Calculus Textbook - Stewart",
    price: "$45",
    condition: "Good",
    description: "8th Edition Stewart Calculus textbook. Some highlighting but all pages intact. Great for MATH 101.",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=300&fit=crop",
    seller: {
      name: "Ahmed Rahman",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop",
      university: "BUET",
      rating: 4.7
    },
    category: "Textbooks"
  },
  {
    id: "3",
    title: "Math Tutoring Services",
    price: "$15",
    condition: "N/A",
    description: "Experienced math tutor offering help with calculus, algebra, and statistics. 3+ years experience.",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop",
    seller: {
      name: "Maria Santos",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop",
      university: "NSU",
      rating: 4.95
    },
    category: "Services",
    isService: true
  },
  {
    id: "4",
    title: "Study Desk with Drawers",
    price: "$80",
    condition: "Good",
    description: "Wooden study desk with 3 drawers. Perfect for dorm room. Easy to assemble.",
    image: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=400&h=300&fit=crop",
    seller: {
      name: "John Doe",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop",
      university: "IUT Dhaka",
      rating: 4.6
    },
    category: "Furniture"
  },
  {
    id: "5",
    title: "Gaming Laptop - ASUS ROG",
    price: "$950",
    condition: "Good",
    description: "ASUS ROG Strix gaming laptop. RTX 3060, 16GB RAM, 512GB SSD. Great for gaming and projects.",
    image: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400&h=300&fit=crop",
    seller: {
      name: "David Kim",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop",
      university: "BRAC University",
      rating: 4.8
    },
    category: "Electronics"
  },
  {
    id: "6",
    title: "Organic Chemistry Lab Kit",
    price: "$65",
    condition: "New",
    description: "Complete organic chemistry lab kit with all necessary equipment. Never used, still in packaging.",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop",
    seller: {
      name: "Lisa Park",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop",
      university: "University of Dhaka",
      rating: 4.9
    },
    category: "Academic Supplies"
  }
];

export default function Dashboard() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isAuthenticated={true} />
      
      <div className="flex">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        <div className="flex-1 flex">
          {/* Filters Sidebar */}
          <div className="w-80 border-r bg-white shadow-md z-10">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-6">Filters</h2>
              <FilterSidebar />
            </div>
          </div>
          
          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold">Marketplace</h1>
                  <p className="text-gray-600">Discover items and services from your university community</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="relative w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      placeholder="Search listings..." 
                      className="pl-10 w-full md:w-[250px] bg-white"
                    />
                  </div>
                  
                  <Button className="bg-blue-600 hover:bg-blue-700 gap-2 whitespace-nowrap">
                    <Plus className="h-4 w-4" />
                    Create Listing
                  </Button>
                  
                  <Button variant="outline" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">3</span>
                  </Button>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center flex-wrap gap-2">
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      Showing {mockListings.length} results
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                      University of Dhaka
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                      Electronics
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                      Under $1000
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Select defaultValue="newest">
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="price-low">Price: Low to High</SelectItem>
                        <SelectItem value="price-high">Price: High to Low</SelectItem>
                        <SelectItem value="rating">Highest Rated</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="flex items-center border rounded-lg p-1">
                      <Button
                        variant={viewMode === "grid" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className="h-8 w-8 p-0"
                      >
                        <Grid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className="h-8 w-8 p-0"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Button variant="outline" size="sm" className="hidden md:flex">
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      More Filters
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Listings Grid */}
            <div className={`grid gap-6 ${
              viewMode === "grid" 
                ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" 
                : "grid-cols-1"
            }`}>
              {mockListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  {...listing}
                />
              ))}
            </div>
            
            {/* Pagination */}
            <div className="flex items-center justify-center space-x-2 mt-12">
              <Button variant="outline" disabled className="flex items-center gap-1">
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button variant="secondary">1</Button>
              <Button variant="outline">2</Button>
              <Button variant="outline">3</Button>
              <Button variant="outline" className="flex items-center gap-1">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </main>
        </div>
      </div>
      
      <FloatingChat />
    </div>
  );
}
