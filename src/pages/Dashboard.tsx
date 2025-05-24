
import { useState, useMemo } from "react";
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
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from "recharts";

// Mock data for listings (add a date for sorting by newest)
const mockListings = [
  {
    id: "1",
    title: "MacBook Pro 13-inch 2021",
    price: 1200, // Changed to number for sorting
    condition: "Like New",
    description: "Perfect condition MacBook Pro with M1 chip. Comes with original charger and box. Used for only 6 months.",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop",
    seller: {
      name: "Sarah Chen",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
      university: "University of Dhaka",
      rating: 4.9
    },
    category: "Electronics",
    createdAt: "2024-05-20T10:00:00Z" // Added creation date
  },
  {
    id: "2",
    title: "Calculus Textbook - Stewart",
    price: 45,
    condition: "Good",
    description: "8th Edition Stewart Calculus textbook. Some highlighting but all pages intact. Great for MATH 101.",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=300&fit=crop",
    seller: {
      name: "Ahmed Rahman",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop",
      university: "BUET",
      rating: 4.7
    },
    category: "Textbooks",
    createdAt: "2024-05-18T11:30:00Z"
  },
  {
    id: "3",
    title: "Math Tutoring Services",
    price: 15,
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
    isService: true,
    createdAt: "2024-05-22T09:00:00Z"
  },
  {
    id: "4",
    title: "Study Desk with Drawers",
    price: 80,
    condition: "Good",
    description: "Wooden study desk with 3 drawers. Perfect for dorm room. Easy to assemble.",
    image: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=400&h=300&fit=crop",
    seller: {
      name: "John Doe",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop",
      university: "IUT Dhaka",
      rating: 4.6
    },
    category: "Furniture",
    createdAt: "2024-05-15T14:00:00Z"
  },
  {
    id: "5",
    title: "Gaming Laptop - ASUS ROG",
    price: 950,
    condition: "Good",
    description: "ASUS ROG Strix gaming laptop. RTX 3060, 16GB RAM, 512GB SSD. Great for gaming and projects.",
    image: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400&h=300&fit=crop",
    seller: {
      name: "David Kim",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop",
      university: "BRAC University",
      rating: 4.8
    },
    category: "Electronics",
    createdAt: "2024-05-19T16:00:00Z"
  },
  {
    id: "6",
    title: "Organic Chemistry Lab Kit",
    price: 65,
    condition: "New",
    description: "Complete organic chemistry lab kit with all necessary equipment. Never used, still in packaging.",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop",
    seller: {
      name: "Lisa Park",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop",
      university: "University of Dhaka",
      rating: 4.9
    },
    category: "Academic Supplies",
    createdAt: "2024-05-21T08:00:00Z"
  }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilterSidebar, setShowFilterSidebar] = useState(false); // State for filter sidebar visibility
  const itemsPerPage = 6; // Number of listings per page

  const filteredAndSortedListings = useMemo(() => {
    let currentListings = [...mockListings];

    // 1. Filter by search term
    if (searchTerm) {
      currentListings = currentListings.filter(
        (listing) =>
          listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          listing.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          listing.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 2. Sort
    currentListings.sort((a, b) => {
      switch (sortOrder) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "rating":
          return b.seller.rating - a.seller.rating;
        default:
          return 0;
      }
    });

    return currentListings;
  }, [searchTerm, sortOrder]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedListings.length / itemsPerPage);
  const paginatedListings = filteredAndSortedListings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated={true} />
      
      <div className="flex">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        <div className="flex-1 flex">
          {/* Filters Sidebar */}
          {showFilterSidebar && ( // Conditionally render FilterSidebar
            <div className="w-80 border-r bg-card shadow-md z-10">
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-6">Filters</h2>
                <FilterSidebar />
              </div>
            </div>
          )}
          
          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold">Marketplace</h1>
                  <p className="text-muted-foreground">Discover items and services from your university community</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="relative w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search listings..." 
                      className="pl-10 w-full md:w-[250px] bg-card"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <Button onClick={() => navigate('/create-listing')} className="bg-primary-warm hover:bg-warm-600 gap-2 whitespace-nowrap">
                    <Plus className="h-4 w-4" />
                    Create Listing
                  </Button>
                  
                  <Button variant="outline" size="icon" className="relative" onClick={() => navigate('/notifications')}>
                    <Bell className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-warm-500 rounded-full text-primary-warm-foreground text-xs flex items-center justify-center">3</span>
                  </Button>
                </div>
              </div>
              
              {/* Analytics/Overview Section with Chart */}
              <div className="mb-8 bg-card p-6 rounded-lg shadow-sm border border-border">
                <h2 className="text-xl font-semibold mb-4">Listings Overview</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                      <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
                      <YAxis stroke="hsl(var(--foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          borderColor: 'hsl(var(--border))', 
                          borderRadius: '0.5rem' 
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Legend />
                      <Bar dataKey="listings" fill="hsl(var(--primary-warm))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-card p-4 rounded-lg shadow-sm border border-border">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center flex-wrap gap-2">
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      Showing {filteredAndSortedListings.length} results
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
                    <Select defaultValue="newest" value={sortOrder} onValueChange={setSortOrder}>
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
                    
                    <Button variant="outline" size="sm" className="hidden md:flex" onClick={() => setShowFilterSidebar(!showFilterSidebar)}>
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
              {paginatedListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  {...listing}
                  price={`$${listing.price}`} // Convert price back to string for display
                />
              ))}
            </div>
            
            {/* Pagination */}
            <div className="flex items-center justify-center space-x-2 mt-12">
              <Button 
                variant="outline" 
                disabled={currentPage === 1} 
                onClick={() => handlePageChange(currentPage - 1)}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => (
                <Button 
                  key={i + 1} 
                  variant={currentPage === i + 1 ? "secondary" : "outline"}
                  onClick={() => handlePageChange(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button 
                variant="outline" 
                disabled={currentPage === totalPages} 
                onClick={() => handlePageChange(currentPage + 1)}
                className="flex items-center gap-1"
              >
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

const chartData = [
  { name: "Jan", listings: 4000 },
  { name: "Feb", listings: 3000 },
  { name: "Mar", listings: 2000 },
  { name: "Apr", listings: 2780 },
  { name: "May", listings: 1890 },
  { name: "Jun", listings: 2390 },
  { name: "Jul", listings: 3490 },
];
