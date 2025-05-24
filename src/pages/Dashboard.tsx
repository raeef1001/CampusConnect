import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
  const itemsPerPage = 6;
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState("");

  // Memoized current filters object for FilterSidebar
  const currentFilters = useMemo(() => ({
    category: selectedCategory,
    priceRange: priceRange,
    condition: selectedConditions,
    university: selectedUniversity,
  }), [selectedCategory, priceRange, selectedConditions, selectedUniversity]);

  // Handler for applying filters from FilterSidebar
  const handleFilterChange = useCallback((filters: { category: string; priceRange: [number, number]; condition: string[]; university: string; }) => {
    setSelectedCategory(filters.category);
    setPriceRange(filters.priceRange);
    setSelectedConditions(filters.condition);
    setSelectedUniversity(filters.university);
    setCurrentPage(1); // Reset to first page on filter change
  }, []);

  // Handler for resetting filters from FilterSidebar
  const handleResetFilters = useCallback(() => {
    setSelectedCategory("");
    setPriceRange([0, 1000]);
    setSelectedConditions([]);
    setSelectedUniversity("");
    setCurrentPage(1); // Reset to first page on filter reset
  }, []);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const listingsCollectionRef = collection(db, "listings");
        const q = query(listingsCollectionRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        const fetchedListingsPromises = querySnapshot.docs.map(async (listingDoc) => {
          const data = listingDoc.data();
          let sellerData = data.seller || {};

          // If seller data is incomplete or missing, fetch from users collection
          if (!sellerData.name || sellerData.name === "Unknown Seller" || !sellerData.university || sellerData.university === "Unknown University") {
            if (data.userId) {
              try {
                const userDocRef = doc(db, "users", data.userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                  const userData = userDocSnap.data();
                  sellerData = {
                    userId: data.userId,
                    name: userData.name || userData.email?.split('@')[0] || "Unknown Seller",
                    avatar: userData.avatar || "",
                    university: userData.university || "Unknown University",
                    rating: userData.rating || 0,
                  };
                } else {
                  // User profile not found, use default unknown seller
                  sellerData = {
                    userId: data.userId,
                    name: "Unknown Seller",
                    avatar: "",
                    university: "Unknown University",
                    rating: 0,
                  };
                }
              } catch (userFetchError) {
                console.error(`Error fetching user profile for ${data.userId}:`, userFetchError);
                // Fallback to default unknown seller on error
                sellerData = {
                  userId: data.userId,
                  name: "Unknown Seller",
                  avatar: "",
                  university: "Unknown University",
                  rating: 0,
                };
              }
            } else {
              // No userId available, use default unknown seller
              sellerData = {
                userId: "",
                name: "Unknown Seller",
                avatar: "",
                university: "Unknown University",
                rating: 0,
              };
            }
          }

          return {
            id: listingDoc.id,
            ...data,
            seller: sellerData,
          };
        });

        const resolvedListings = await Promise.all(fetchedListingsPromises);
        setListings(resolvedListings);
      } catch (err) {
        console.error("Error fetching listings:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  const filteredAndSortedListings = useMemo(() => {
    let currentListings = [...listings];

    // 1. Filter by search term
    if (searchTerm) {
      currentListings = currentListings.filter(
        (listing) =>
          listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          listing.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          listing.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 2. Filter by category
    if (selectedCategory) {
      currentListings = currentListings.filter(
        (listing) => listing.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // 3. Filter by price range
    currentListings = currentListings.filter(
      (listing) => listing.price >= priceRange[0] && listing.price <= priceRange[1]
    );

    // 4. Filter by condition
    if (selectedConditions.length > 0) {
      currentListings = currentListings.filter((listing) =>
        selectedConditions.includes(listing.condition.toLowerCase())
      );
    }

    // 5. Filter by university
    if (selectedUniversity) {
      currentListings = currentListings.filter(
        (listing) => listing.seller.university.toLowerCase() === selectedUniversity.toLowerCase()
      );
    }

    // 6. Sort
    currentListings.sort((a, b) => {
      switch (sortOrder) {
        case "newest":
          return new Date(b.createdAt?.toDate()).getTime() - new Date(a.createdAt?.toDate()).getTime();
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
  }, [searchTerm, sortOrder, listings, selectedCategory, priceRange, selectedConditions, selectedUniversity]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedListings.length / itemsPerPage);
  const paginatedListings = filteredAndSortedListings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const chartData = useMemo(() => {
    const monthlyListings: { [key: string]: number } = {};
    
    listings.forEach((listing) => {
      const date = listing.createdAt?.toDate();
      if (date) {
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        const key = `${month} ${year}`; // e.g., "Jan 2024"
        monthlyListings[key] = (monthlyListings[key] || 0) + 1;
      }
    });

    // Sort months chronologically for the chart
    const sortedMonths = Object.keys(monthlyListings).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    });

    return sortedMonths.map(monthYear => ({
      name: monthYear,
      listings: monthlyListings[monthYear],
    }));
  }, [listings]);

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
                <FilterSidebar 
                  onFilterChange={handleFilterChange} 
                  onResetFilters={handleResetFilters} 
                  currentFilters={currentFilters} 
                />
              </div>
            </div>
          )}
          
          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">

            <div className="mb-8">
              <div className="mb-6">
                <div>
                  <h1 className="text-2xl font-bold">Marketplace</h1>
                  <p className="text-muted-foreground">Discover items and services from your university community</p>
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
            
            {loading && (
              <div className="text-center py-8">
                <p className="text-lg text-muted-foreground">Loading listings...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-8 text-red-500">
                <p className="text-lg">Error fetching listings: {error.message}</p>
              </div>
            )}

            {!loading && !error && paginatedListings.length === 0 && (
              <div className="text-center py-8">
                <p className="text-lg text-muted-foreground">No listings found.</p>
              </div>
            )}

            {!loading && !error && paginatedListings.length > 0 && (
              <div className={`grid gap-6 ${
                viewMode === "grid" 
                  ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" 
                  : "grid-cols-1"
              }`}>
                {paginatedListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    {...listing}
                    image={listing.imageUrl} // Pass imageUrl as image prop
                    price={`$${listing.price}`} // Convert price back to string for display
                  />
                ))}
              </div>
            )}
            
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
