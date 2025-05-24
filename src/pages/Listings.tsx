import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import { db } from '@/lib/firebase';
import { collection, query, orderBy, where, onSnapshot, Timestamp, doc, getDoc, getDocs, Query, limit, startAfter, QueryDocumentSnapshot, documentId } from 'firebase/firestore';
import { ListingCard } from "@/components/marketplace/ListingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getUser } from "@/utils/auth";
import { FilterSidebar } from "@/components/marketplace/FilterSidebar";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationLink, PaginationNext } from "@/components/ui/pagination";
import { Listing } from '@/types/listing';
import { useOptimizedListings, useOptimizedUserListings, usePrefetchData } from "@/hooks/useOptimizedData";

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
  sellerName: string;
}

export default function Listings() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [listingsPerPage] = useState(9);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [totalListingsCount, setTotalListingsCount] = useState(0);

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

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters((prevFilters) => ({ ...prevFilters, ...newFilters }));
    setCurrentPage(1);
    setLastVisible(null);
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
      sellerName: "",
    });
    setSearchQuery("");
    setSellerNameFilter("");
    setCurrentPage(1);
    setLastVisible(null);
    setFirstVisible(null);
    setHasPrevious(false);
    setHasMore(true);
  }, []);

  // Helper function to normalize condition values
  const normalizeCondition = (condition: string): string => {
    const conditionMap: { [key: string]: string } = {
      'new': 'New',
      'like-new': 'Like New',
      'good': 'Good',
      'fair': 'Fair',
      'New': 'New',
      'Like New': 'Like New',
      'Good': 'Good',
      'Fair': 'Fair'
    };
    return conditionMap[condition] || condition;
  };

  // Client-side filtering function
  const applyClientSideFilters = useCallback((listingsData: Listing[]): Listing[] => {
    let filteredListings = [...listingsData];

    // Category filter - check both category and categories fields
    if (filters.category) {
      filteredListings = filteredListings.filter(listing => {
        const categoryMatch = listing.category?.toLowerCase() === filters.category.toLowerCase();
        const categoriesMatch = listing.categories?.some(cat => 
          cat.toLowerCase() === filters.category.toLowerCase()
        );
        return categoryMatch || categoriesMatch;
      });
    }

    // Price range filter - handle string prices
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000) {
      filteredListings = filteredListings.filter(listing => {
        const price = parseFloat(listing.price) || 0;
        return price >= filters.priceRange[0] && price <= filters.priceRange[1];
      });
    }

    // Condition filter - normalize conditions for comparison
    if (filters.condition.length > 0) {
      filteredListings = filteredListings.filter(listing => {
        const normalizedListingCondition = normalizeCondition(listing.condition);
        return filters.condition.some(filterCondition => 
          normalizeCondition(filterCondition) === normalizedListingCondition
        );
      });
    }

    // University filter
    if (filters.university) {
      filteredListings = filteredListings.filter(listing => {
        const sellerUniversity = listing.seller?.university?.toLowerCase() || '';
        return sellerUniversity === filters.university.toLowerCase();
      });
    }

    // Seller name filter
    if (sellerNameFilter) {
      const lowercasedSellerName = sellerNameFilter.toLowerCase();
      filteredListings = filteredListings.filter(listing => {
        const sellerName = listing.seller?.name?.toLowerCase() || '';
        return sellerName.includes(lowercasedSellerName);
      });
    }

    // Search query filter
    if (searchQuery) {
      const lowercasedSearchQuery = searchQuery.toLowerCase();
      filteredListings = filteredListings.filter(listing =>
        listing.title.toLowerCase().includes(lowercasedSearchQuery) ||
        listing.description.toLowerCase().includes(lowercasedSearchQuery)
      );
    }

    return filteredListings;
  }, [filters, sellerNameFilter, searchQuery]);

  // Memoized filtered listings
  const filteredListings = useMemo(() => {
    return applyClientSideFilters(allListings);
  }, [allListings, applyClientSideFilters]);

  // Paginated listings
  const paginatedListings = useMemo(() => {
    const startIndex = (currentPage - 1) * listingsPerPage;
    const endIndex = startIndex + listingsPerPage;
    return filteredListings.slice(startIndex, endIndex);
  }, [filteredListings, currentPage, listingsPerPage]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const filterParam = queryParams.get("filter");
    const searchParam = queryParams.get("search");
    setSearchQuery(searchParam || "");
    const currentUser = getUser();

    const listingsCollectionRef = collection(db, "listings");
    let baseQuery: Query = query(listingsCollectionRef, orderBy("createdAt", "desc"));

    let unsubscribe: () => void = () => {};

    const fetchListings = async () => {
      setLoading(true);

      if (filterParam === "bookmarked-listings" && currentUser) {
        const bookmarksQuery = query(collection(db, "bookmarks"), where("userId", "==", currentUser.uid));
        unsubscribe = onSnapshot(bookmarksQuery, async (bookmarkSnapshot) => {
          const bookmarkedListingIds = bookmarkSnapshot.docs.map(doc => doc.data().listingId);
          
          if (bookmarkedListingIds.length > 0) {
            const batchSize = 10;
            const listingBatches: Promise<Listing[]>[] = [];

            for (let i = 0; i < bookmarkedListingIds.length; i += batchSize) {
              const batchIds = bookmarkedListingIds.slice(i, i + batchSize);
              const listingsBatchQuery = query(collection(db, "listings"), where(documentId(), "in", batchIds));
              listingBatches.push(
                getDocs(listingsBatchQuery).then(async (snapshot) => {
                  const batchListings: Listing[] = [];
                  for (const docSnapshot of snapshot.docs) {
                    const data = docSnapshot.data();
                    let sellerData: SellerProfile = data.seller || {};

                    if (!sellerData.name || sellerData.name === "Unknown Seller" || !sellerData.university || sellerData.university === "Unknown University") {
                      const userIdToFetch = data.sellerId || 
                                           data.userId || 
                                           data.createdBy || 
                                           data.seller?.userId || 
                                           '';
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
                          sellerData = {
                            userId: userIdToFetch,
                            name: "Unknown Seller",
                            avatar: "",
                            university: "Unknown University",
                            rating: 0,
                          };
                        }
                      } else {
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
            setAllListings(allFetchedListings);
          } else {
            setAllListings([]);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching bookmarked listings: ", error);
          setLoading(false);
        });
        return;
      }

      // Fetch all listings for client-side filtering
      unsubscribe = onSnapshot(baseQuery, async (snapshot) => {
        let listingsData: Listing[] = [];
        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data();
          let sellerData: SellerProfile = data.seller || {};

          if (!sellerData.name || sellerData.name === "Unknown Seller" || !sellerData.university || sellerData.university === "Unknown University") {
            const userIdToFetch = data.sellerId || 
                                 data.userId || 
                                 data.createdBy || 
                                 data.seller?.userId || 
                                 '';
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
                sellerData = {
                  userId: userIdToFetch,
                  name: "Unknown Seller",
                  avatar: "",
                  university: "Unknown University",
                  rating: 0,
                };
              }
            } else {
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
            const sellerId = listing.sellerId || 
                            listing.userId || 
                            listing.createdBy || 
                            listing.seller?.userId || 
                            '';
            
            console.log("Listing:", listing.title, "sellerId:", sellerId, "matches:", sellerId === currentUser.uid);
            
            return sellerId && sellerId === currentUser.uid;
          });
          console.log("Filtered listings count:", listingsData.length);
        }

        setAllListings(listingsData);
        setTotalListingsCount(listingsData.length);
        setLoading(false);

      }, (error) => {
        console.error("Error fetching listings: ", error);
        setLoading(false);
      });
    };

    fetchListings();

    return () => unsubscribe();
  }, [location.search]);

  // Update listings when filters change
  useEffect(() => {
    setListings(paginatedListings);
    setCurrentPage(1);
  }, [paginatedListings]);

  // Calculate pagination info
  const totalPages = Math.ceil(filteredListings.length / listingsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setLastVisible(null);
    setFirstVisible(null);
  };

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
              
              {/* Filter Results Summary */}
              {(filters.category || filters.priceRange[0] > 0 || filters.priceRange[1] < 1000 || 
                filters.condition.length > 0 || filters.university || sellerNameFilter || searchQuery) && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Showing {filteredListings.length} of {allListings.length} listings
                    {filteredListings.length !== allListings.length && " (filtered)"}
                  </p>
                </div>
              )}
              
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(listingsPerPage)].map((_, i) => (
                    <Skeleton key={i} className="h-72 w-full rounded-lg" />
                  ))}
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
                          category={listing.categories?.join(', ') || listing.category || ''}
                          seller={listing.seller || { name: "Unknown Seller", userId: "", university: "Unknown", rating: 0 }}
                          isService={listing.categories?.includes("Services") || false}
                          locations={listing.locations}
                          deliveryRadius={listing.deliveryRadius}
                          isAvailable={listing.isAvailable}
                          availabilityStatus={listing.availabilityStatus}
                        />
                      ))
                    ) : (
                      <div className="col-span-full bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
                        <p className="text-gray-500">
                          {allListings.length === 0 
                            ? "No listings found. Be the first to create one!" 
                            : "No listings match your current filters. Try adjusting your search criteria."
                          }
                        </p>
                      </div>
                    )}
                  </div>

                  {filteredListings.length > listingsPerPage && (
                    <div className="mt-8 flex justify-center">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => handlePageChange(currentPage - 1)} 
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                            />
                          </PaginationItem>
                          {Array.from({ length: totalPages }, (_, i) => (
                            <PaginationItem key={i + 1}>
                              <PaginationLink 
                                onClick={() => handlePageChange(i + 1)} 
                                isActive={currentPage === i + 1}
                                className="cursor-pointer"
                              >
                                {i + 1}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => handlePageChange(currentPage + 1)} 
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} 
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
