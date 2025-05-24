import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom"; // Import useLocation
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import { db } from '@/lib/firebase';
import { collection, query, orderBy, where, onSnapshot, Timestamp, doc, getDoc, Query } from 'firebase/firestore';
import { ListingCard } from "@/components/marketplace/ListingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getUser } from "@/utils/auth";

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

export default function Listings() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation(); // Initialize useLocation

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const filter = queryParams.get("filter");
    const currentUser = getUser();

    let listingsQuery: Query;
    let unsubscribe: () => void = () => {}; // Initialize with a no-op function

    const fetchListingsAndSellerProfiles = async (q: Query) => {
      unsubscribe = onSnapshot(q, async (snapshot) => {
        const listingsData: Listing[] = [];
        for (const docSnapshot of snapshot.docs) {
          const listing = { id: docSnapshot.id, ...docSnapshot.data() } as Listing;
          
          if (listing.userId) {
            try {
              const userDocRef = doc(db, "users", listing.userId);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                listing.seller = { userId: listing.userId, ...userDocSnap.data() } as SellerProfile;
              } else {
                // Fallback if user document doesn't exist
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
              // Fallback on error
              listing.seller = {
                userId: listing.userId,
                name: listing.userEmail?.split('@')[0] || "Unknown Seller",
                avatar: listing.userEmail ? `https://api.dicebear.com/7.x/initials/svg?seed=${listing.userEmail}` : undefined,
                university: "Unknown University",
                rating: 0,
              };
            }
          } else {
            // Handle listings without a userId (should ideally not happen)
            console.warn("Listing without userId found:", listing.id);
            listing.seller = {
              userId: "", // Explicitly set to empty string
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
      }, (error) => {
        console.error("Error fetching listings: ", error);
        setLoading(false);
      });
    };

    if (filter === "my-listings" && currentUser) {
      listingsQuery = query(collection(db, "listings"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
      fetchListingsAndSellerProfiles(listingsQuery);
    } else if (filter === "bookmarked-listings" && currentUser) {
      const bookmarksQuery = query(collection(db, "bookmarks"), where("userId", "==", currentUser.uid));
      unsubscribe = onSnapshot(bookmarksQuery, async (bookmarkSnapshot) => {
        const bookmarkedListingIds = bookmarkSnapshot.docs.map(doc => doc.data().listingId);
        
        if (bookmarkedListingIds.length > 0) {
          const fetchedBookmarkedListings: Listing[] = [];
          for (const listingId of bookmarkedListingIds) {
            const listingDocRef = doc(db, "listings", listingId);
            const listingDocSnap = await getDoc(listingDocRef);
            if (listingDocSnap.exists()) {
              const listing = { id: listingDocSnap.id, ...listingDocSnap.data() } as Listing;
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
              fetchedBookmarkedListings.push(listing);
            }
          }
          setListings(fetchedBookmarkedListings);
        } else {
          setListings([]);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching bookmarked listings: ", error);
        setLoading(false);
      });
    } else {
      listingsQuery = query(collection(db, "listings"), orderBy("createdAt", "desc"));
      fetchListingsAndSellerProfiles(listingsQuery);
    }

    return () => unsubscribe();
  }, [location.search]); // Re-run effect when location.search changes

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isAuthenticated={true} />
      
      <div className="flex">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold mb-4">Marketplace Listings</h1>
              <p className="text-lg text-gray-600 mb-8">Browse items and services offered by students.</p>
              
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-72 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
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
                        seller={listing.seller || { name: "Unknown Seller", userId: "", university: "Unknown", rating: 0 }} // Pass the fetched seller object
                        isService={listing.category === "Services"}
                      />
                    ))
                  ) : (
                    <div className="col-span-full bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
                      <p className="text-gray-500">No listings found. Be the first to create one!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      
      <FloatingChat />
    </div>
  );
}
