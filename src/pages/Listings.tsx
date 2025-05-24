import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getUser } from "@/utils/auth";
import { FilterSidebar } from "@/components/marketplace/FilterSidebar";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext, PaginationLink } from "@/components/ui/pagination";
import { Listing } from '@/types/listing';
import { useListings } from '@/context/ListingContext'; // Import useListings hook
import { db } from '@/lib/firebase'; // Keep db for bookmark query
import { collection, query, where, onSnapshot } from 'firebase/firestore'; // Keep necessary Firestore imports for bookmarks

interface FilterState {
  category: string;
  priceRange: [number, number];
  condition: string[];
  university: string;
  sellerName: string;
}

export default function Listings() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { listings: allListings, loading: listingsLoading, error: listingsError } = useListings(); // Use listings from context

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [listingsPerPage] = useState(9);

  // Filter states
  const [filters, setFilters] = useState<FilterState>({
    category: "",
    priceRange: [0, 1000],
    condition: [],
    university: "",
    sellerName: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [sellerNameFilter, setSellerNameFilter] = useState("");
  const [bookmarkedListingIds, setBookmarkedListingIds] = useState<string[]>([]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const searchParam = queryParams.get("search");
    setSearchQuery(searchParam || "");

    const currentUser = getUser();
    if (currentUser) {
      const bookmarksQuery = query(collection(db, "bookmarks"), where("userId", "==", currentUser.uid));
      const unsubscribeBookmarks = onSnapshot(bookmarksQuery, (snapshot) => {
        setBookmarkedListingIds(snapshot.docs.map(doc => doc.data().listingId));
      }, (error) => {
        console.error("Error fetching bookmarked listing IDs: ", error);
      });
      return () => unsubscribeBookmarks();
    }
  }, [location.search]);

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters((prevFilters) => ({ ...prevFilters, ...newFilters }));
    setCurrentPage(1); // Reset to first page on filter change
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      category: "",
      priceRange: [0, 1000],
      condition: [],
      university: "",
      sellerName: "",
    });
    setSearchQuery("");
    setSellerNameFilter("");
    setCurrentPage(1); // Reset to first page on filter change
  }, []);

  const filteredListings = useMemo(() => {
    const queryParams = new URLSearchParams(location.search);
    const filterParam = queryParams.get("filter");
    const currentUser = getUser();

    let currentFilteredListings = allListings;

    // Apply "my-listings" filter
    if (filterParam === "my-listings" && currentUser) {
      currentFilteredListings = currentFilteredListings.filter(listing => {
        const sellerId = listing.sellerId || listing.userId || listing.createdBy || listing.seller?.userId || '';
        return sellerId && sellerId === currentUser.uid;
      });
    } else if (filterParam === "bookmarked-listings" && currentUser) {
      currentFilteredListings = currentFilteredListings.filter(listing =>
        bookmarkedListingIds.includes(listing.id)
      );
    }

    // Apply category filter
    if (filters.category) {
      currentFilteredListings = currentFilteredListings.filter(listing =>
        listing.category === filters.category
      );
    }

    // Apply price range filter
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000) {
      currentFilteredListings = currentFilteredListings.filter(listing => {
        const listingPrice = parseFloat(listing.price);
        return listingPrice >= filters.priceRange[0] && listingPrice <= filters.priceRange[1];
      });
    }

    // Apply condition filter
    if (filters.condition.length > 0) {
      currentFilteredListings = currentFilteredListings.filter(listing =>
        filters.condition.includes(listing.condition)
      );
    }

    // Apply university filter
    if (filters.university) {
      currentFilteredListings = currentFilteredListings.filter(listing =>
        listing.seller?.university === filters.university
      );
    }

    // Apply seller name filter
    if (sellerNameFilter) {
      const lowercasedSellerName = sellerNameFilter.toLowerCase();
      currentFilteredListings = currentFilteredListings.filter(listing =>
        listing.seller?.name.toLowerCase().startsWith(lowercasedSellerName)
      );
    }

    // Apply search query filter (title/description)
    if (searchQuery) {
      const lowercasedSearchQuery = searchQuery.toLowerCase();
      currentFilteredListings = currentFilteredListings.filter(listing =>
        listing.title.toLowerCase().includes(lowercasedSearchQuery) ||
        listing.description.toLowerCase().includes(lowercasedSearchQuery)
      );
    }

    return currentFilteredListings;
  }, [allListings, filters, searchQuery, sellerNameFilter, location.search, bookmarkedListingIds]);

  const totalPages = Math.ceil(filteredListings.length / listingsPerPage);
  const paginatedListings = useMemo(() => {
    const startIndex = (currentPage - 1) * listingsPerPage;
    const endIndex = startIndex + listingsPerPage;
    return filteredListings.slice(startIndex, endIndex);
  }, [filteredListings, currentPage, listingsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isAuthenticated={true} />
      
      <div className="flex">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        <div className="flex-1 flex flex-col lg:flex-row">
          <aside className={`w-full lg:w-64 p-6 bg-white border-r border-gray-100 ${sidebarCollapsed ? 'hidden' : 'block'}`}>
            <FilterSidebar 
              onFilterChange={handleFilterChange} 
              onResetFilters={handleResetFilters}
              currentFilters={filters}
              onSellerNameChange={setSellerNameFilter}
            />
          </aside>

          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold mb-4">Marketplace Listings</h1>
              <p className="text-lg text-gray-600 mb-8">Browse items and services offered by students.</p>
              
              {listingsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(listingsPerPage)].map((_, i) => (
                    <Skeleton key={i} className="h-72 w-full rounded-lg" />
                  ))}
                </div>
              ) : listingsError ? (
                <div className="col-span-full bg-red-100 p-6 rounded-lg shadow-sm border border-red-200 text-center text-red-700">
                  <p>Error loading listings: {listingsError}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedListings.length > 0 ? (
                      paginatedListings.map((listing) => (
                        <ListingCard
                          key={listing.id}
                          id={listing.id}
                          title={listing.title}
                          price={`$${parseFloat(listing.price).toFixed(2)}`}
                          condition={listing.condition}
                          description={listing.description}
                          image={listing.imageUrl || "/placeholder.svg"}
                          category={listing.category || ''}
                          seller={listing.seller || { name: "Unknown Seller", userId: "", university: "Unknown", rating: 0 }}
                          isService={listing.category === "Services"}
                          locations={listing.locations}
                          deliveryRadius={listing.deliveryRadius}
                          isAvailable={listing.isAvailable}
                          availabilityStatus={listing.availabilityStatus}
                        />
                      ))
                    ) : (
                      <div className="col-span-full bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
                        <p className="text-gray-500">No listings found. Adjust your filters or be the first to create one!</p>
                      </div>
                    )}
                  </div>

                  {paginatedListings.length > 0 && (
                    <div className="mt-8 flex justify-center">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => handlePageChange(currentPage - 1)} 
                              className={!hasPrevious ? "pointer-events-none opacity-50" : undefined} 
                            />
                          </PaginationItem>
                          {totalPages > 0 && Array.from({ length: totalPages }).map((_, i) => (
                            <PaginationItem key={i}>
                              <PaginationLink
                                onClick={() => handlePageChange(i + 1)}
                                isActive={currentPage === i + 1}
                              >
                                {i + 1}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => handlePageChange(currentPage + 1)} 
                              className={!hasNext ? "pointer-events-none opacity-50" : undefined} 
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
      
      <FloatingChat listings={paginatedListings} />
    </div>
  );
}
