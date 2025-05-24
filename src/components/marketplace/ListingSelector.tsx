import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Listing } from "@/types/listing";
import { ListingCard } from "@/components/marketplace/ListingCard"; // Re-using existing ListingCard

interface ListingSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectListing: (listing: Listing) => void;
  currentUserId: string;
}

export const ListingSelector: React.FC<ListingSelectorProps> = ({
  isOpen,
  onClose,
  onSelectListing,
  currentUserId,
}) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedListingInternal, setSelectedListingInternal] = useState<Listing | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchListings = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "listings"),
          where("sellerId", "==", currentUserId) // Fetch only current user's listings
        );
        const querySnapshot = await getDocs(q);
        const fetchedListings: Listing[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            description: data.description,
            price: String(data.price),
            image: data.imageUrl, // Assuming imageUrl from Firestore
            sellerId: data.sellerId,
            category: data.category,
            condition: data.condition,
            location: data.location,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            seller: { // Dummy seller info for ListingCard
              userId: data.sellerId,
              name: "You", 
              avatar: "/placeholder.svg",
              university: "N/A",
              rating: 0,
            }
          } as Listing;
        });
        setListings(fetchedListings);
      } catch (error) {
        console.error("Error fetching listings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [isOpen, currentUserId]);

  const filteredListings = listings.filter((listing) =>
    listing.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = () => {
    if (selectedListingInternal) {
      onSelectListing(selectedListingInternal);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Select a Listing to Share</DialogTitle>
          <DialogDescription>
            Choose one of your listings to share in the chat.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Search your listings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />
          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="grid grid-cols-1 gap-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-[120px] w-full rounded-md" />
                ))}
              </div>
            ) : filteredListings.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredListings.map((listing) => (
                  <div
                    key={listing.id}
                    className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${
                      selectedListingInternal?.id === listing.id
                        ? "border-primary-warm ring-2 ring-primary-warm"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedListingInternal(listing)}
                  >
                    <ListingCard {...listing} hideSellerInfo={true} /> {/* Pass hideSellerInfo */}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-10">
                No listings found.
              </div>
            )}
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!selectedListingInternal}>
            Share Listing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
