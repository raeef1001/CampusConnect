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

interface SellerProfile {
  name: string;
  avatar?: string;
  university: string;
  rating: number;
  userId: string; // Add userId to SellerProfile
}

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  imageUrl: string;
  userId: string;
  userEmail: string;
  createdAt: Timestamp;
  seller?: SellerProfile; // Add optional seller profile
}

interface FilterState {
  category: string;
  priceRange: [number, number];
  condition: string[];
  university: string;
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

  // Filter states
  const [filters, setFilters] = useState<FilterState>({
    category: "",
    priceRange: [0, 1000],
    condition: [],
    university: "",
  });

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
    });
    setCurrentPage(1); // Reset to first page on filter change
    setLastVisible(null); // Reset pagination
    setFirstVisible(null);
    setHasPrevious(false);
    setHasMore(true);
  }, []);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const filterParam = queryParams.get("filter");
    const currentUser = getUser();

    const listingsCollectionRef = collection(db, "listings");
    let baseQuery: Query = query(listingsCollectionRef, orderBy("createdAt", "desc"));

    // Apply filters
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

    let unsubscribe: () => void = () => {};

    const fetchListings = async () => {
      setLoading(true);
      let currentListingsQuery = baseQuery;

      if (filterParam === "my-listings" && currentUser) {
        currentListingsQuery = query(listingsCollectionRef, where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
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
                    const listing = { id: docSnapshot.id, ...docSnapshot.data() } as Listing;
                    if (listing.userId) {
                      try {
                        const userDocRef = doc(db, "users", listing.userId);
                        const userDocSnap = await getDoc(userDocRef);
                        if (userDocSnap.exists()) {
                          listing.seller = { userId: listing.userId, ...userDocSnap.data() } as SellerProfile;
                        } else {
                          listing.seller = {
                            userId: listing.userId,
                            name: listing.userEmail?.split('@')[0] || "Unknown Seller",
                            avatar: listing.userEmail ? `https://api.dicebear.com/7.x/initials/svg?seed=${listing.userEmail}` : undefined,
                            university: "Unknown University",
                            rating: 0,
                          };
                        }
                      } catch (error) {
                        console.error("Error fetching seller profile for bookmarked listing:", listing.id, error);
                        listing.seller = {
                          userId: listing.userId,
                          name: listing.userEmail?.split('@')[0] || "Unknown Seller",
                          avatar: listing.userEmail ? `https://api.dicebear.com/7.x/initials/svg?seed=${listing.userEmail}` : undefined,
                          university: "Unknown University",
                          rating: 0,
                        };
                      }
                    } else {
                      console.warn("Bookmarked listing without userId found:", listing.id);
                      listing.seller = {
                        userId: "",
                        name: listing.userEmail?.split('@')[0] || "Unknown Seller",
                        avatar: listing.userEmail ? `https://api.dicebear.com/7.x/initials/svg?seed=${listing.userEmail}` : undefined,
                        university: "Unknown University",
                        rating: 0,
                      };
                    }
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
        paginatedQuery = query(currentListingsQuery, limit(listingsPerPage + 1)); // Fetch one extra to check for next page
      } else {
        paginatedQuery = query(currentListingsQuery, startAfter(lastVisible), limit(listingsPerPage + 1));
      }

      unsubscribe = onSnapshot(paginatedQuery, async (snapshot) => {
        const fetchedDocs = snapshot.docs;
        const hasMoreResults = fetchedDocs.length > listingsPerPage;
        const listingsToDisplay = hasMoreResults ? fetchedDocs.slice(0, listingsPerPage) : fetchedDocs;

        const listingsData: Listing[] = [];
        for (const docSnapshot of listingsToDisplay) {
          const listing = { id: docSnapshot.id, ...docSnapshot.data() } as Listing;
          
          if (listing.userId) {
            try {
              const userDocRef = doc(db, "users", listing.userId);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                listing.seller = { userId: listing.userId, ...userDocSnap.data() } as SellerProfile;
              } else {
                listing.seller = {
                  userId: listing.userId,
                  name: listing.userEmail?.split('@')[0] || "Unknown Seller",
                  avatar: listing.userEmail ? `https://api.dicebear.com/7.x/initials/svg?seed=${listing.userEmail}` : undefined,
                  university: "Unknown University",
                  rating: 0,
                };
              }
            } catch (error) {
              console.error("Error fetching seller profile for listing:", listing.id, error);
              listing.seller = {
                userId: listing.userId,
                name: listing.userEmail?.split('@')[0] || "Unknown Seller",
                avatar: listing.userEmail ? `https://api.dicebear.com/7.x/initials/svg?seed=${listing.userEmail}` : undefined,
                university: "Unknown University",
                rating: 0,
              };
            }
          } else {
            console.warn("Listing without userId found:", listing.id);
            listing.seller = {
              userId: "",
              name: listing.userEmail?.split('@')[0] || "Unknown Seller",
              avatar: listing.userEmail ? `https://api.dicebear.com/7.x/initials/svg?seed=${listing.userEmail}` : undefined,
              university: "Unknown University",
              rating: 0,
            };
          }
          listingsData.push(listing);
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
  }, [location.search, currentPage, filters]); // Re-run effect when location.search, currentPage, or filters change

  const handleNextPage = () => {
    if (hasMore) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (hasPrevious) {
      setCurrentPage((prev) => prev - 1);
    }
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
                          price={`$${typeof listing.price === 'number' ? listing.price.toFixed(2) : 'N/A'}`}
                          condition={listing.condition}
                          description={listing.description}
                          image={listing.imageUrl || "/placeholder.svg"}
                          category={listing.category}
                          seller={listing.seller || { name: "Unknown Seller", userId: "", university: "Unknown", rating: 0 }}
                          isService={listing.category === "Services"}
                        />
                      ))
                    ) : (
                      <div className="col-span-full bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
                        <p className="text-gray-500">No listings found. Adjust your filters or be the first to create one!</p>
                      </div>
                    )}
                  </div>

                  {/* Pagination */}
                  {listings.length > 0 && (
                    <div className="mt-8 flex justify-center">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={handlePreviousPage} 
                              className={!hasPrevious ? "pointer-events-none opacity-50" : undefined} 
                            />
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationLink>{currentPage}</PaginationLink>
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationNext 
                              onClick={handleNextPage} 
                              className={!hasMore ? "pointer-events-none opacity-50" : undefined} 
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
