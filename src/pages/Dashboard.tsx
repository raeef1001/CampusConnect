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
  Search,
  Plus,
  Bell
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import {
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [sellerName, setSellerName] = useState(""); // Add sellerName state

  // Memoized current filters object for FilterSidebar
  const currentFilters = useMemo(() => ({
    category: selectedCategory,
    priceRange: priceRange,
    condition: selectedConditions,
    university: selectedUniversity,
    sellerName: sellerName, // Include sellerName
  }), [selectedCategory, priceRange, selectedConditions, selectedUniversity, sellerName]);

  // Handler for applying filters from FilterSidebar
  const handleFilterChange = useCallback((filters: { category: string; priceRange: [number, number]; condition: string[]; university: string; sellerName: string; }) => {
    setSelectedCategory(filters.category);
    setPriceRange(filters.priceRange);
    setSelectedConditions(filters.condition);
    setSelectedUniversity(filters.university);
    setSellerName(filters.sellerName); // Set sellerName
  }, []);

  // Handler for resetting filters from FilterSidebar
  const handleResetFilters = useCallback(() => {
    setSelectedCategory("");
    setPriceRange([0, 1000]);
    setSelectedConditions([]);
    setSelectedUniversity("");
    setSellerName(""); // Reset sellerName
  }, []);

  // Handler for seller name change from FilterSidebar
  const handleSellerNameChange = useCallback((name: string) => {
    setSellerName(name);
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
                  onSellerNameChange={handleSellerNameChange} // Pass onSellerNameChange
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
              {/* Discount Ad Section */}
              <div className="mb-8 bg-gradient-to-br from-purple-700 to-indigo-800 text-white p-8 rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-[1.01] text-center relative overflow-hidden">
                {/* Optional: Add a subtle pattern overlay */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.7'%3E%3Cpath d='M4 0h2v20H4zm10 0h2v20h-2zM0 4h20v2H0zm0 10h20v2H0z'/%3E%3C/g%3E%3C/svg%3E\")" }}></div>
                <h2 className="text-4xl font-extrabold mb-3 relative z-10 drop-shadow-md">Flash Sale!</h2>
                <p className="text-xl mb-6 relative z-10 opacity-90">Get <span className="font-bold text-yellow-300">20% off</span> all electronics this week!</p>
                <Button 
                  variant="secondary" 
                  size="lg" 
                  className="text-purple-900 bg-white hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg relative z-10"
                  onClick={() => navigate('/listings?category=electronics')}
                >
                  Shop Now
                </Button>
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

            {!loading && !error && filteredAndSortedListings.length === 0 && (
              <div className="text-center py-8">
                <p className="text-lg text-muted-foreground">No listings found.</p>
              </div>
            )}

            {!loading && !error && filteredAndSortedListings.length > 0 && (
              <div className={`grid gap-6 ${
                viewMode === "grid" 
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" 
                  : "grid-cols-1"
              }`}>
                {filteredAndSortedListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    {...listing}
                    image={listing.imageUrl} // Pass imageUrl as image prop
                    price={`$${listing.price}`} // Convert price back to string for display
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
      
      <FloatingChat />
    </div>
  );
}
