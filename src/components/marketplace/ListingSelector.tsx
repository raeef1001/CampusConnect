// src/components/marketplace/ListingSelector.tsx (DEBUG VERSION - Updated Query)
import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Listing } from "@/types/listing";
import { cn } from "@/lib/utils";

interface ListingSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectListing: (listing: Listing) => void;
  currentUserId: string; // This should be the value to match against the 'userId' field in listings
}

export const ListingSelector: React.FC<ListingSelectorProps> = ({
  isOpen,
  onClose,
  onSelectListing,
  currentUserId,
}) => {
  const [allUserListings, setAllUserListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedListingInternal, setSelectedListingInternal] = useState<Listing | null>(null);

  useEffect(() => {
    if (isOpen && currentUserId) {
      console.log("%c[ListingSelector] Modal OPEN. Current User ID to match: %s", "color: blue; font-weight: bold;", currentUserId);
      setSelectedListingInternal(null);
      setSearchTerm("");
      setLoading(true);

      const fetchListings = async () => {
        console.log("%c[ListingSelector] Attempting to fetch listings where 'userId' == %s", "color: blue;", currentUserId);
        try {
          const listingsCollectionName = "listings";
          const listingsCollectionRef = collection(db, listingsCollectionName);
          console.log(`[ListingSelector] Using collection: '${listingsCollectionName}'`);

          // ***** CHANGED FIELD NAME FOR QUERY *****
          const queryUserIdField = "userId";    // <-- USE THIS FIELD FROM YOUR DOCUMENT
          const createdAtField = "createdAt";   // <-- MAKE SURE THIS FIELD EXISTS
          
          const q = query(
            listingsCollectionRef,
            where(queryUserIdField, "==", currentUserId), // Query against the top-level 'userId'
            orderBy(createdAtField, "desc")
          );
          console.log(`[ListingSelector] Query created: WHERE '${queryUserIdField}' == '${currentUserId}' ORDER BY '${createdAtField}' DESC`);

          const querySnapshot = await getDocs(q);

          console.log("%c[ListingSelector] Query successful. Snapshot empty: %s", "color: orange;", querySnapshot.empty);
          console.log("%c[ListingSelector] Number of documents found: %d", "color: orange; font-weight: bold;", querySnapshot.docs.length);

          if (querySnapshot.docs.length > 0) {
            querySnapshot.docs.forEach(doc => {
              console.log("[ListingSelector] Fetched Document ID: %s, Raw Data:", doc.id, JSON.parse(JSON.stringify(doc.data())));
            });
          }

          const fetchedListings: Listing[] = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            // Ensure the 'seller' object in your Listing type matches how you want to structure it.
            // The 'sellerId' in the Listing type might now refer to data.userId if that's the convention.
            return {
              id: doc.id,
              title: data.title || "Untitled Listing",
              description: data.description || "",
              price: String(data.price || "0"),
              image: data.imageUrl || "/placeholder.svg",
              sellerId: data.userId, // ***** MAPPING: Use data.userId for sellerId in the Listing object *****
              category: data.category || "N/A",
              condition: data.condition || "N/A",
              location: data.location || "N/A",
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              seller: data.seller || { // Use the existing seller map if present, or a default
                userId: data.userId, // Ensure this matches the top-level userId
                name: "Seller",
                avatar: "/placeholder.svg",
                university: "N/A",
                rating: 0,
              },
            } as Listing;
          });
          setAllUserListings(fetchedListings);
          console.log("[ListingSelector] Mapped listings to state. Count:", fetchedListings.length);
        } catch (error) {
          console.error("%c[ListingSelector] CRITICAL ERROR fetching listings:", "color: red; font-weight: bold;", error);
        } finally {
          setLoading(false);
          console.log("[ListingSelector] Fetching process finished. Loading set to false.");
        }
      };

      fetchListings();
    } else if (isOpen && !currentUserId) {
      console.warn("%c[ListingSelector] Modal OPENED, but currentUserId is MISSING or UNDEFINED!", "color: red; font-weight: bold;");
      setLoading(false);
      setAllUserListings([]);
    }
  }, [isOpen, currentUserId]);

  // ... (rest of the component remains the same: filteredListings, handlers, JSX)
  const filteredListings = useMemo(() => {
    if (!searchTerm.trim()) {
      return allUserListings;
    }
    return allUserListings.filter((listing) =>
      listing.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allUserListings, searchTerm]);

  const handleConfirmShare = () => {
    if (selectedListingInternal) {
      onSelectListing(selectedListingInternal);
    }
  };

  const handleDialogInteraction = (open: boolean) => {
    if (!open) {
      console.log("[ListingSelector] Dialog closing.");
      setSelectedListingInternal(null);
      setSearchTerm("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogInteraction}>
      <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Select a Listing to Share</DialogTitle>
          <DialogDescription>
            Choose one of your listings to share in the chat.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex-grow flex flex-col min-h-0">
          <Input
            placeholder="Search your listings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4 flex-shrink-0"
          />
          <ScrollArea className="flex-grow pr-1">
            <div className="space-y-2 p-1">
              {loading ? (
                <>
                  {[...Array(3)].map((_, i) => (
                    <div key={`skeleton-${i}`} className="flex items-center space-x-3 p-2.5 border rounded-md">
                      <Skeleton className="h-14 w-14 rounded-md flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </>
              ) : filteredListings.length > 0 ? (
                <>
                  {filteredListings.map((listing) => (
                    <div
                      key={listing.id}
                      className={cn(
                        "flex items-center space-x-3 p-2.5 border rounded-md hover:bg-accent cursor-pointer transition-colors",
                        selectedListingInternal?.id === listing.id && "bg-accent ring-2 ring-primary"
                      )}
                      onClick={() => setSelectedListingInternal(listing)}
                    >
                      <img
                        src={listing.image}
                        alt={listing.title}
                        className="h-14 w-14 object-cover rounded-md flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" title={listing.title}>{listing.title}</p>
                        <p className="text-sm text-muted-foreground">${listing.price}</p>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="text-center text-muted-foreground py-10">
                    No listings found.
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => handleDialogInteraction(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirmShare} disabled={!selectedListingInternal || loading}>
            Share Listing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};