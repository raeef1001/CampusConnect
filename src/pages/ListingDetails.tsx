import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, addDoc, deleteDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { dbRateLimiter } from '@/lib/rateLimiter'; // Import the rate limiter
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, MapPin, Star, ArrowLeft, Truck, Navigation, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { reverseGeocode, getLocationName } from "@/utils/geocoding";
import LocationDisplay from "@/components/LocationDisplay";
import BidDialog from "@/components/ui/bid-dialog";
import { Listing, LocationData } from "@/types/listing.d";

interface SellerProfile {
  name: string;
  avatar?: string;
  university: string;
  rating: number;
}

export default function ListingDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showBidDialog, setShowBidDialog] = useState(false);
  const { toast } = useToast();
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [loadingSeller, setLoadingSeller] = useState(true);

  useEffect(() => {
    const fetchListingAndFavoriteStatus = async () => {
      if (!id) {
        setError("Listing ID is missing.");
        setLoading(false);
        return;
      }
      try {
        const docRef = doc(db, "listings", id);
        const docSnap = await dbRateLimiter.execute(() => getDoc(docRef));

        if (docSnap.exists()) {
          const rawData = docSnap.data();
          console.log("Raw listing data from Firestore:", rawData);
          
          // Handle different possible field names for seller ID
          const sellerId = rawData.sellerId || 
                           rawData.userId || 
                           rawData.createdBy || 
                           rawData.seller?.userId || 
                           '';
          
          const listingData = { 
            id: docSnap.id, 
            ...rawData,
            sellerId: sellerId
          } as Listing;
          
          console.log("Processed listing data:", listingData);
          setListing(listingData);

          // Fetch seller profile
          if (listingData.sellerId) {
            try {
              const userDocRef = doc(db, "users", listingData.sellerId);
<<<<<<< HEAD
              const userDocSnap = await getDoc(userDocRef);
=======
              const userDocSnap = await dbRateLimiter.execute(() => getDoc(userDocRef));
>>>>>>> 6d5a776e3b0f50dc41009ebd9eec322ff44ed963
              if (userDocSnap.exists()) {
                setSellerProfile(userDocSnap.data() as SellerProfile);
              } else {
                // Fallback to listing's seller.name if profile not found
                setSellerProfile({
                  name: listingData.seller?.name || "Unknown Seller",
                  avatar: listingData.seller?.avatar || undefined,
                  university: listingData.seller?.university || "University Name",
                  rating: listingData.seller?.rating || 0,
                });
              }
            } catch (sellerError) {
              console.error("Error fetching seller profile in ListingDetails:", sellerError);
              // Fallback on error
              setSellerProfile({
                name: listingData.seller?.name || "Unknown Seller",
                avatar: listingData.seller?.avatar || undefined,
                university: listingData.seller?.university || "University Name",
                rating: listingData.seller?.rating || 0,
              });
            }
          } else {
            console.warn("listingData.sellerId is missing for listing:", id);
            setSellerProfile({
              name: listingData.seller?.name || "Unknown Seller",
              avatar: listingData.seller?.avatar || undefined,
              university: listingData.seller?.university || "University Name",
              rating: listingData.seller?.rating || 0,
            });
          }
        } else {
          setError("Listing not found.");
        }

        const user = auth.currentUser;
        if (user) {
          const q = query(
            collection(db, "bookmarks"),
            where("userId", "==", user.uid),
            where("listingId", "==", id)
          );
          const querySnapshot = await dbRateLimiter.execute(() => getDocs(q));
          setIsFavorited(!querySnapshot.empty);
        }
      } catch (err) {
        console.error("Error fetching listing details:", err);
        setError("Failed to load listing details.");
      } finally {
        setLoading(false);
        setLoadingSeller(false);
      }
    };

    fetchListingAndFavoriteStatus();
  }, [id]);

  const handleFavoriteToggle = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to bookmark listings.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isFavorited) {
        // Remove from favorites
        const q = query(
          collection(db, "bookmarks"),
          where("userId", "==", user.uid),
          where("listingId", "==", id)
        );
        const querySnapshot = await dbRateLimiter.execute(() => getDocs(q));
        querySnapshot.forEach(async (doc) => {
          await dbRateLimiter.execute(() => deleteDoc(doc.ref));
        });
        toast({
          title: "Bookmark Removed",
          description: "Listing removed from your favorites.",
        });
      } else {
        // Add to favorites
        await dbRateLimiter.execute(() => addDoc(collection(db, "bookmarks"), {
          userId: user.uid,
          listingId: id,
          createdAt: serverTimestamp(),
        }));
        toast({
          title: "Bookmark Added",
          description: "Listing added to your favorites!",
        });

        // Create notification for the listing owner
        const listingOwnerId = listing?.sellerId;
<<<<<<< HEAD
        const currentUser = auth.currentUser;
        if (currentUser && listingOwnerId && listingOwnerId !== currentUser.uid) {
          await addDoc(collection(db, "notifications"), {
=======
        const currentUser = auth.currentUser; // Get current user
        if (currentUser && listingOwnerId && listingOwnerId !== currentUser.uid) { // Don't notify self, and ensure listingOwnerId exists
          await dbRateLimiter.execute(() => addDoc(collection(db, "notifications"), {
>>>>>>> 6d5a776e3b0f50dc41009ebd9eec322ff44ed963
            userId: listingOwnerId,
            type: "bookmark",
            message: `Your listing '${listing?.title}' has been bookmarked by ${currentUser.displayName || currentUser.email?.split('@')[0]}!`,
            read: false,
            createdAt: serverTimestamp(),
<<<<<<< HEAD
            relatedId: id,
          });
=======
            relatedId: id, // Link to the listing
          }));
>>>>>>> 6d5a776e3b0f50dc41009ebd9eec322ff44ed963
        }
      }
      setIsFavorited(!isFavorited);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast({
        title: "Error",
        description: "Failed to update bookmark status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleContactSeller = () => {
    const user = auth.currentUser;
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to contact sellers.",
        variant: "destructive",
      });
      return;
    }
    if (listing) {
      navigate("/messages", { state: { sellerId: listing.sellerId, listingId: id } });
    }
  };

  const handleBid = () => {
    const user = auth.currentUser;
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to place bids.",
        variant: "destructive",
      });
      return;
    }
    setShowBidDialog(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar isAuthenticated={true} />
        <div className="flex flex-1">
          <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
              <Skeleton className="h-8 w-48 mb-4" />
              <Skeleton className="h-64 w-full mb-6" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-6" />
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar isAuthenticated={true} />
        <div className="flex flex-1">
          <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md text-center text-red-600">
              <p>{error}</p>
              <Button onClick={() => navigate("/listings")} className="mt-4">
                Go back to Listings
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  // Use sellerProfile for display
<<<<<<< HEAD
  const displaySellerName = sellerProfile?.name || listing.seller?.name || "Unknown Seller";
  const displaySellerAvatar = sellerProfile?.avatar || listing.seller?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${listing.seller?.userId || 'unknown'}`;
  const displaySellerUniversity = sellerProfile?.university || listing.seller?.university || "Unknown University";
  const displaySellerRating = sellerProfile?.rating || listing.seller?.rating || 0;
  const isService = listing.category === "Services";
=======
  const displaySellerName = sellerProfile?.name || listing.seller.name; // Use seller.name
  const displaySellerAvatar = sellerProfile?.avatar || listing.seller.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${listing.seller.userId}`; // Use seller.avatar or seller.userId for fallback
  const displaySellerUniversity = sellerProfile?.university || listing.seller.university; // Use seller.university
  const displaySellerRating = sellerProfile?.rating || listing.seller.rating; // Use seller.rating
  const isService = listing.category === "Services"; // Check if category is "Services"
>>>>>>> 6d5a776e3b0f50dc41009ebd9eec322ff44ed963

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
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
              <Button 
                variant="ghost" 
                onClick={() => navigate(-1)} 
                className="mb-4 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Listings
              </Button>

              <div className="relative mb-6">
                <img
                  src={listing.imageUrl || "/placeholder.svg"}
                  alt={listing.title}
                  className="w-full h-96 object-cover rounded-lg shadow-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className={`absolute top-4 right-4 h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background/95 shadow-md ${
                    isFavorited ? "text-primary-warm" : "text-muted-foreground"
                  }`}
                  onClick={handleFavoriteToggle}
                >
                  <Heart className={`h-5 w-5 ${isFavorited ? "fill-current" : ""}`} />
                </Button>
                <div className="absolute top-4 left-4">
                  <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm font-medium text-base">
<<<<<<< HEAD
                    {listing.category}
=======
                    {listing.category} {/* Display category */}
>>>>>>> 6d5a776e3b0f50dc41009ebd9eec322ff44ed963
                  </Badge>
                </div>
              </div>

              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">{listing.title}</h1>
                  {/* Availability Status Display */}
                  <div className="flex items-center gap-3">
                    {listing.isAvailable !== false && listing.availabilityStatus === 'available' ? (
                      <Badge className="bg-green-100 text-green-800 border-green-300 text-base px-3 py-1">
                        ✅ Available
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        {listing.availabilityStatus === 'sold' && (
                          <Badge className="bg-red-100 text-red-800 border-red-300 text-base px-3 py-1">
                            ❌ SOLD
                          </Badge>
                        )}
                        {listing.availabilityStatus === 'reserved' && (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-base px-3 py-1">
                            ⏳ RESERVED
                          </Badge>
                        )}
                        {listing.availabilityStatus === 'unavailable' && (
                          <Badge className="bg-gray-100 text-gray-800 border-gray-300 text-base px-3 py-1">
                            🚫 UNAVAILABLE
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-3xl text-primary-warm">
                    {isService ? `$${parseFloat(listing.price).toFixed(2)}/hr` : `$${parseFloat(listing.price).toFixed(2)}`}
                  </p>
                  {!isService && (
                    <Badge variant={listing.condition === "New" ? "default" : "outline"} className={cn(
                      "text-sm",
                      listing.condition === "New" && "bg-primary-warm"
                    )}>
                      {listing.condition}
                    </Badge>
                  )}
                </div>
              </div>

              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                {listing.description}
              </p>

              {/* Location and Delivery Information */}
              {listing.locations && listing.locations.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    Location & Delivery Information
                  </h3>
                  
                  <LocationDisplay 
                    locations={listing.locations}
                    deliveryRadius={listing.deliveryRadius}
                    showFullAddress={true}
                  />
                </div>
              )}

              <div className="flex items-center justify-between border-t border-b py-4 mb-6">
                {loadingSeller ? (
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div>
                      <Skeleton className="h-6 w-32 mb-1" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                ) : (
                  sellerProfile && (
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                        <AvatarImage src={displaySellerAvatar} />
                        <AvatarFallback className="text-lg bg-warm-100 text-warm-800">
                          {displaySellerName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-lg font-semibold">{displaySellerName}</p>
                        <div className="flex items-center space-x-1 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <p className="text-sm">{displaySellerUniversity}</p>
                        </div>
                      </div>
                    </div>
                  )
                )}
                
                {loadingSeller ? (
                  <Skeleton className="h-8 w-20 rounded-md" />
                ) : (
                  sellerProfile && (
                    <div className="flex items-center space-x-1 bg-warm-50 px-3 py-1.5 rounded-md">
                      <Star className="h-4 w-4 fill-warm-400 text-warm-400" />
                      <span className="text-base font-medium text-warm-700">{displaySellerRating}</span>
                    </div>
                  )
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Edit button - only show for listing owner */}
                {auth.currentUser && listing.sellerId === auth.currentUser.uid && (
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 text-lg py-6 border-blue-600 text-blue-600 hover:bg-blue-50" 
                    onClick={() => navigate(`/listings/${id}/edit`)}
                  >
                    <Edit className="h-5 w-5" />
                    Edit Listing
                  </Button>
                )}
                
                {/* Contact button - hide for listing owner and adjust based on availability */}
                {(!auth.currentUser || listing.sellerId !== auth.currentUser.uid) && (
                  <div className="space-y-2">
                    {(listing.isAvailable !== false && (listing.availabilityStatus === 'available' || !listing.availabilityStatus)) ? (
                      <div className="space-y-2">
                        <Button variant="primary-warm" className="w-full gap-2 text-lg py-6" onClick={handleContactSeller}>
                          <MessageSquare className="h-5 w-5" />
                          Contact Seller
                        </Button>
                        {!isService && (
                          <Button variant="outline" className="w-full gap-2 text-lg py-6 border-green-600 text-green-600 hover:bg-green-50" onClick={handleBid}>
                            💰 Place Bid
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Button 
                          variant="outline" 
                          className="w-full gap-2 text-lg py-6 cursor-not-allowed opacity-60" 
                          disabled
                        >
                          <MessageSquare className="h-5 w-5" />
                          {listing.availabilityStatus === 'sold' && 'Item Sold - Contact Unavailable'}
                          {listing.availabilityStatus === 'reserved' && 'Item Reserved - Contact Unavailable'}
                          {listing.availabilityStatus === 'unavailable' && 'Item Unavailable - Contact Unavailable'}
                          {!listing.availabilityStatus && 'Contact Unavailable'}
                        </Button>
                        <p className="text-sm text-center text-gray-600">
                          {listing.availabilityStatus === 'sold' && 'This item has been sold and is no longer available.'}
                          {listing.availabilityStatus === 'reserved' && 'This item is currently reserved for another buyer.'}
                          {listing.availabilityStatus === 'unavailable' && 'This item is temporarily unavailable.'}
                          {!listing.availabilityStatus && 'This item is currently unavailable.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      
      <FloatingChat />
      
      {/* Bid Dialog */}
      {listing && (
        <BidDialog
          isOpen={showBidDialog}
          onClose={() => setShowBidDialog(false)}
          listing={{
            id: listing.id,
            title: listing.title,
<<<<<<< HEAD
            price: parseFloat(listing.price),
=======
            price: Number(listing.price),
>>>>>>> 6d5a776e3b0f50dc41009ebd9eec322ff44ed963
            sellerId: listing.sellerId || '',
            sellerName: displaySellerName,
            category: listing.category,
            condition: listing.condition,
            imageUrl: listing.imageUrl,
          }}
        />
      )}
    </div>
  );
}
