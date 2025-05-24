import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, getDocs, where, documentId } from 'firebase/firestore';
import { dbRateLimiter } from '@/lib/rateLimiter';
import { Listing } from '@/types/listing';

interface SellerProfile {
  userId: string;
  name: string;
  avatar?: string;
  university: string;
  rating: number;
}

interface ListingContextType {
  listings: Listing[];
  sellerProfiles: { [key: string]: SellerProfile };
  loading: boolean;
  error: string | null;
}

const ListingContext = createContext<ListingContextType | undefined>(undefined);

export const ListingProvider = ({ children }: { children: ReactNode }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [sellerProfiles, setSellerProfiles] = useState<{ [key: string]: SellerProfile }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const listingsCollectionRef = collection(db, "listings");
    const q = query(listingsCollectionRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      setLoading(true);
      setError(null);
      try {
        const fetchedListings: Listing[] = [];
        const sellerIdsToFetch = new Set<string>();

        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data();
          const userIdToFetch = data.userId || data.sellerId || data.createdBy || data.seller?.userId;
          if (userIdToFetch) {
            sellerIdsToFetch.add(userIdToFetch);
          }
          fetchedListings.push({ id: docSnapshot.id, ...data } as Listing);
        }

        const currentSellerProfiles = { ...sellerProfiles }; // Start with existing profiles

        if (sellerIdsToFetch.size > 0) {
          const usersCollectionRef = collection(db, "users");
          const userIdsArray = Array.from(sellerIdsToFetch);
          const userBatchSize = 10;
          const userBatches: Promise<void>[] = [];

          for (let i = 0; i < userIdsArray.length; i += userBatchSize) {
            const batchUserIds = userIdsArray.slice(i, i + userBatchSize);
            const usersQuery = query(usersCollectionRef, where(documentId(), "in", batchUserIds));
            userBatches.push(
              dbRateLimiter.execute(() => getDocs(usersQuery)).then(userSnapshot => {
                userSnapshot.forEach(userDocSnap => {
                  const userData = userDocSnap.data();
                  currentSellerProfiles[userDocSnap.id] = {
                    userId: userDocSnap.id,
                    name: userData.name || userData.email?.split('@')[0] || "Unknown Seller",
                    avatar: userData.avatar || "",
                    university: userData.university || "Unknown University",
                    rating: userData.rating || 0,
                  };
                });
              })
            );
          }
          await Promise.all(userBatches);
        }

        // Attach seller profiles to listings
        const listingsWithSellerProfiles = fetchedListings.map(listing => {
          const userId = listing.userId || listing.sellerId || listing.createdBy || listing.seller?.userId;
          const sellerProfile = userId ? currentSellerProfiles[userId] : undefined;
          return {
            ...listing,
            seller: sellerProfile || listing.seller || { userId: userId || "", name: "Unknown Seller", university: "Unknown University", rating: 0 }
          };
        });

        setListings(listingsWithSellerProfiles);
        setSellerProfiles(currentSellerProfiles); // Update global seller profiles
        setLoading(false);
      } catch (err) {
        console.error("Error fetching listings or seller profiles:", err);
        setError("Failed to load listings.");
        setLoading(false);
      }
    }, (err) => {
      console.error("Error in onSnapshot listener:", err);
      setError("Failed to subscribe to listings updates.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []); // Empty dependency array means this effect runs once on mount

  return (
    <ListingContext.Provider value={{ listings, sellerProfiles, loading, error }}>
      {children}
    </ListingContext.Provider>
  );
};

export const useListings = () => {
  const context = useContext(ListingContext);
  if (context === undefined) {
    throw new Error('useListings must be used within a ListingProvider');
  }
  return context;
};
