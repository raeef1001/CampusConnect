import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom"; // Import useLocation and useNavigate
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import { db } from '@/lib/firebase';
import { collection, query, orderBy, where, onSnapshot, Timestamp, doc, getDoc, getDocs, Query, limit, startAfter, QueryDocumentSnapshot } from 'firebase/firestore';
import { ListingCard } from "@/components/marketplace/ListingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getUser } from "@/utils/auth";
import { FilterSidebar } from "@/components/marketplace/FilterSidebar"; // Import FilterSidebar
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationLink, PaginationNext } from "@/components/ui/pagination"; // Import Pagination components
import { Listing } from '@/types/listing'; // Import the canonical Listing interface

interface SellerProfile {
  userId: string;
  name: string;
  avatar?: string;
  university: string;
  rating: number;
}

interface FilterState {
  category: string;
  priceRange: [number, number];
  condition: string[];
  university: string;
  sellerName: string; // Added sellerName to FilterState
}

export default function Listings() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [listingsPerPage] = useState(9); // 9 listings per page
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [totalListingsCount, setTotalListingsCount] = useState(0); // New state for total count

  // Filter states
  const [filters, setFilters] = useState<FilterState>({
    category: "",
    priceRange: [0, 1000],
    condition: [],
    university: "",
    sellerName: "", // Initialize sellerName
  });
  const [searchQuery, setSearchQuery] = useState(""); // State for search query from URL
  const [sellerNameFilter, setSellerNameFilter] = useState(""); // New state for seller name filter

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters((prevFilters) => ({ ...prevFilters, ...newFilters }));
    setCurrentPage(1); // Reset to first page on filter change
    setLastVisible(null); // Reset pagination
    setFirstVisible(null);
    setHasPrevious(false);
    setHasMore(true);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      category: "",
      priceRange: [0, 1000],
      condition: [],
      university: "",
      sellerName: "", // Clear sellerName on reset
    });
    setSearchQuery(""); // Clear search query on reset
    setCurrentPage(1); // Reset to first page on filter change
    setLastVisible(null); // Reset pagination
    setFirstVisible(null);
    setHasPrevious(false);
    setHasMore(true);
  }, []);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const filterParam = queryParams.get("filter");
    const searchParam = queryParams.get("search"); // Get search parameter
    setSearchQuery(searchParam || ""); // Set search query state
    const currentUser = getUser();

    const listingsCollectionRef = collection(db, "listings");
    let baseQuery: Query = query(listingsCollectionRef, orderBy("createdAt", "desc"));

    // Fetch total count for pagination display (Note: This can be inefficient for very large collections)
    const fetchTotalCount = async () => {
      try {
        const totalCountQuery = query(baseQuery); // Use the same baseQuery for counting
        const totalCountSnapshot = await getDocs(totalCountQuery);
        setTotalListingsCount(totalCountSnapshot.size);
      } catch (error) {
        console.error("Error fetching total listings count:", error);
        setTotalListingsCount(0); // Fallback to 0 on error
      }
    };
    fetchTotalCount();

    // Apply filters
    // Note: Search query is handled client-side due to Firestore limitations for 'contains' queries.
    if (filters.category) {
      baseQuery = query(baseQuery, where("category", "==", filters.category));
    }
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000) {
      baseQuery = query(baseQuery, where("price", ">=", filters.priceRange[0]), where("price", "<=", filters.priceRange[1]));
    }
    if (filters.condition.length > 0) {
      baseQuery = query(baseQuery, where("condition", "in", filters.condition));
    }
    if (filters.university) {
      // This assumes 'university' is a field directly on the listing or seller profile.
      // If it's on seller profile, you'd need to adjust the query or fetch logic.
      // For now, assuming it's on listing for simplicity in query.
      baseQuery = query(baseQuery, where("seller.university", "==", filters.university));
    }
    // Apply seller name filter to Firestore query if provided
    if (sellerNameFilter) {
      const lowercasedSellerName = sellerNameFilter.toLowerCase();
      // Firestore range query for "starts with" functionality
      baseQuery = query(
        baseQuery,
        where("seller.name", ">=", lowercasedSellerName),
        where("seller.name", "<=", lowercasedSellerName + '\uf8ff')
      );
    }

    let unsubscribe: () => void = () => {};

    const fetchListings = async () => {
      setLoading(true);
      let currentListingsQuery = baseQuery;

      if (filterParam === "my-listings" && currentUser) {
        // For "my-listings", we need to fetch all listings and filter client-side
        // because we need to check multiple possible seller ID fields
        currentListingsQuery = query(listingsCollectionRef, orderBy("createdAt", "desc"));
      } else if (filterParam === "bookmarked-listings" && currentUser) {
        const bookmarksQuery = query(collection(db, "bookmarks"), where("userId", "==", currentUser.uid));
        unsubscribe = onSnapshot(bookmarksQuery, async (bookmarkSnapshot) => {
          const bookmarkedListingIds = bookmarkSnapshot.docs.map(doc => doc.data().listingId);
          
          if (bookmarkedListingIds.length > 0) {
            // Fetch listings in batches if there are many bookmarked listings
            // Firestore 'in' query has a limit of 10, so we might need to split
            const batchSize = 10;
            const listingBatches: Promise<Listing[]>[] = [];

            for (let i = 0; i < bookmarkedListingIds.length; i += batchSize) {
              const batchIds = bookmarkedListingIds.slice(i, i + batchSize);
              const listingsBatchQuery = query(collection(db, "listings"), where("id", "in", batchIds));
              listingBatches.push(
                getDocs(listingsBatchQuery).then(async (snapshot) => {
                  const batchListings: Listing[] = [];
                  for (const docSnapshot of snapshot.docs) {
                    const data = docSnapshot.data();
                    let sellerData: SellerProfile = data.seller || {}; // Initialize with existing seller data

                    // If seller data is incomplete or missing, fetch from users collection
                    if (!sellerData.name || sellerData.name === "Unknown Seller" || !sellerData.university || sellerData.university === "Unknown University") {
                      const userIdToFetch = data.userId || data.sellerId; // Prefer userId, fallback to sellerId
                      if (userIdToFetch) {
                        try {
                          const userDocRef = doc(db, "users", userIdToFetch);
                          const userDocSnap = await getDoc(userDocRef);
                          if (userDocSnap.exists()) {
                            const userData = userDocSnap.data();
                            sellerData = {
                              userId: userIdToFetch,
                              name: userData.name || userData.email?.split('@')[0] || "Unknown Seller",
                              avatar: userData.avatar || "",
                              university: userData.university || "Unknown University",
                              rating: userData.rating || 0,
                            };
                          } else {
                            // User profile not found, use default unknown seller
                            sellerData = {
                              userId: userIdToFetch,
                              name: "Unknown Seller",
                              avatar: "",
                              university: "Unknown University",
                              rating: 0,
                            };
                            console.warn(`Seller profile not found for userId: ${userIdToFetch}`);
                          }
                        } catch (userFetchError) {
                          console.error(`Error fetching user profile for ${userIdToFetch}:`, userFetchError);
                          // Fallback to default unknown seller on error
                          sellerData = {
                            userId: userIdToFetch,
                            name: "Unknown Seller",
                            avatar: "",
                            university: "Unknown University",
                            rating: 0,
                          };
                        }
                      } else {
                        // No userId or sellerId available, use default unknown seller
                        sellerData = {
                          userId: "",
                          name: "Unknown Seller",
                          avatar: "",
                          university: "Unknown University",
                          rating: 0,
                        };
                      }
                    }
                    const listing = { id: docSnapshot.id, ...data, seller: sellerData } as Listing;
                    batchListings.push(listing);
                  }
                  return batchListings;
                })
              );
            }
  const allFetchedListings = (await Promise.all(listingBatches)).flat();
  setListings(allFetchedListings);
} else {
  setListings([]);
}
setLoading(false);
}, (error) => {
  console.error("Error fetching bookmarked listings: ", error);
  setLoading(false);
});
return; // Exit early for bookmarked listings as it has its own onSnapshot
}

// Pagination logic
let paginatedQuery: Query;
if (currentPage === 1) {
  paginatedQuery = query(baseQuery, limit(listingsPerPage + 1)); // Fetch one extra to check for next page
} else {
  paginatedQuery = query(baseQuery, startAfter(lastVisible), limit(listingsPerPage + 1));
}

unsubscribe = onSnapshot(paginatedQuery, async (snapshot) => {
  const fetchedDocs = snapshot.docs;
  const hasMoreResults = fetchedDocs.length > listingsPerPage;
  const listingsToDisplay = hasMoreResults ? fetchedDocs.slice(0, listingsPerPage) : fetchedDocs;

    let listingsData: Listing[] = [];
    for (const docSnapshot of listingsToDisplay) {
      const data = docSnapshot.data();
      let sellerData: SellerProfile = data.seller || {}; // Initialize with existing seller data

      // If seller data is incomplete or missing, fetch from users collection
      if (!sellerData.name || sellerData.name === "Unknown Seller" || !sellerData.university || sellerData.university === "Unknown University") {
        const userIdToFetch = data.userId || data.sellerId; // Prefer userId, fallback to sellerId
        if (userIdToFetch) {
          try {
            const userDocRef = doc(db, "users", userIdToFetch);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              sellerData = {
                userId: userIdToFetch,
                name: userData.name || userData.email?.split('@')[0] || "Unknown Seller",
                avatar: userData.avatar || "",
                university: userData.university || "Unknown University",
                rating: userData.rating || 0,
              };
            } else {
              // User profile not found, use default unknown seller
              sellerData = {
                userId: userIdToFetch,
                name: "Unknown Seller",
                avatar: "",
                university: "Unknown University",
                rating: 0,
              };
              console.warn(`Seller profile not found for userId: ${userIdToFetch}`);
            }
          } catch (userFetchError) {
            console.error(`Error fetching user profile for ${userIdToFetch}:`, userFetchError);
            // Fallback to default unknown seller on error
            sellerData = {
              userId: userIdToFetch,
              name: "Unknown Seller",
              avatar: "",
              university: "Unknown University",
              rating: 0,
            };
          }
        } else {
          // No userId or sellerId available, use default unknown seller
          sellerData = {
            userId: "",
            name: "Unknown Seller",
            avatar: "",
            university: "Unknown University",
            rating: 0,
          };
        }
      }

      const listing = {
        id: docSnapshot.id,
        ...data,
        seller: sellerData,
      } as Listing;
      listingsData.push(listing);
    }

  // Client-side filtering for "my-listings"
  if (filterParam === "my-listings" && currentUser) {
    console.log("Filtering my-listings for user:", currentUser.uid);
    listingsData = listingsData.filter(listing => {
      // Check multiple possible seller ID fields
      const sellerId = listing.sellerId || 
                      listing.userId || 
                      listing.createdBy || 
                      listing.seller?.userId || 
                      '';
      
      console.log("Listing:", listing.title, "sellerId:", sellerId, "matches:", sellerId === currentUser.uid);
      
      // Only include listings where we can identify the seller and it matches the current user
      return sellerId && sellerId === currentUser.uid;
    });
    console.log("Filtered listings count:", listingsData.length);
  }

  // Client-side filtering for search query (product title/description)
  if (searchQuery) {
    const lowercasedSearchQuery = searchQuery.toLowerCase();
    listingsData = listingsData.filter(listing =>
      listing.title.toLowerCase().includes(lowercasedSearchQuery) ||
      listing.description.toLowerCase().includes(lowercasedSearchQuery)
    );
  }


  setListings(listingsData);
  setLoading(false);

  if (listingsToDisplay.length > 0) {
    setFirstVisible(listingsToDisplay[0]);
    setLastVisible(listingsToDisplay[listingsToDisplay.length - 1]);
  } else {
    setFirstVisible(null);
    setLastVisible(null);
  }

  setHasMore(hasMoreResults);
  setHasPrevious(currentPage > 1);

}, (error) => {
  console.error("Error fetching listings: ", error);
  setLoading(false);
});
};

fetchListings();

return () => unsubscribe();
}, [location.search, currentPage, filters, searchQuery, sellerNameFilter]); // Re-run effect when location.search, currentPage, filters, searchQuery, or sellerNameFilter change

  const totalPages = Math.ceil(totalListingsCount / listingsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setLastVisible(null); // Reset lastVisible to re-fetch from the beginning of the new page
    setFirstVisible(null); // Reset firstVisible as well
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isAuthenticated={true} />
      
      <div className="flex">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        <div className="flex-1 flex flex-col lg:flex-row"> {/* Added lg:flex-row for sidebar layout */}
          {/* Filter Sidebar */}
          <aside className={`w-full lg:w-64 p-6 bg-white border-r border-gray-100 ${sidebarCollapsed ? 'hidden' : 'block'}`}>
            <FilterSidebar 
              onFilterChange={handleFilterChange} 
              onResetFilters={handleResetFilters}
              currentFilters={filters}
              onSellerNameChange={setSellerNameFilter} // Pass setSellerNameFilter to FilterSidebar
            />
          </aside>

          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold mb-4">Marketplace Listings</h1>
              <p className="text-lg text-gray-600 mb-8">Browse items and services offered by students.</p>
              
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(listingsPerPage)].map((_, i) => (
                    <Skeleton key={i} className="h-72 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {listings.length > 0 ? (
                      listings.map((listing) => (
                        <ListingCard
                          key={listing.id}
                          id={listing.id}
                          title={listing.title}
                          price={`$${parseFloat(listing.price).toFixed(2)}`}
                          condition={listing.condition}
                          description={listing.description}
                          image={listing.imageUrl || "/placeholder.svg"}
                          category={listing.categories?.join(', ') || ''} // Display categories as comma-separated string, handle undefined categories
                          seller={listing.seller || { name: "Unknown Seller", userId: "", university: "Unknown", rating: 0 }}
                          isService={listing.categories?.includes("Services") || false} // Check if categories array includes "Services"
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

                  {/* Pagination */}
                  {totalListingsCount > 0 && ( // Only show pagination if there are listings
                    <div className="mt-8 flex justify-center">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => handlePageChange(currentPage - 1)} 
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined} 
                            />
                          </PaginationItem>
                          {Array.from({ length: totalPages }, (_, i) => (
                            <PaginationItem key={i + 1}>
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
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined} 
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
      
      <FloatingChat listings={listings} />
    </div>
  );
}
