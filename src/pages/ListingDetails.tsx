import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, addDoc, deleteDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, MapPin, Star, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

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
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
}

interface SellerProfile { // Define SellerProfile interface
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
  const { toast } = useToast();
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null); // Add sellerProfile state
  const [loadingSeller, setLoadingSeller] = useState(true); // Add loadingSeller state

  useEffect(() => {
    const fetchListingAndFavoriteStatus = async () => {
      if (!id) {
        setError("Listing ID is missing.");
        setLoading(false);
        return;
      }
      try {
        const docRef = doc(db, "listings", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const listingData = { id: docSnap.id, ...docSnap.data() } as Listing;
          setListing(listingData);

          // Fetch seller profile
          if (listingData.userId) {
            try {
              const userDocRef = doc(db, "users", listingData.userId);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                setSellerProfile(userDocSnap.data() as SellerProfile);
              } else {
                // Fallback to listing's userEmail if profile not found
                setSellerProfile({
                  name: listingData.userEmail?.split('@')[0] || "Unknown Seller",
                  avatar: listingData.userEmail ? `https://api.dicebear.com/7.x/initials/svg?seed=${listingData.userEmail}` : undefined,
                  university: "University Name", // Placeholder
                  rating: 0, // Placeholder
                });
              }
            } catch (sellerError) {
              console.error("Error fetching seller profile in ListingDetails:", sellerError);
              // Fallback on error
              setSellerProfile({
                name: listingData.userEmail?.split('@')[0] || "Unknown Seller",
                avatar: listingData.userEmail ? `https://api.dicebear.com/7.x/initials/svg?seed=${listingData.userEmail}` : undefined,
                university: "University Name", // Placeholder
                rating: 0, // Placeholder
              });
            }
          } else {
            console.warn("listingData.userId is missing for listing:", id);
            setSellerProfile({
              name: listingData.userEmail?.split('@')[0] || "Unknown Seller",
              avatar: listingData.userEmail ? `https://api.dicebear.com/7.x/initials/svg?seed=${listingData.userEmail}` : undefined,
              university: "University Name", // Placeholder
              rating: 0, // Placeholder
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
          const querySnapshot = await getDocs(q);
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
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
        toast({
          title: "Bookmark Removed",
          description: "Listing removed from your favorites.",
        });
      } else {
        // Add to favorites
        await addDoc(collection(db, "bookmarks"), {
          userId: user.uid,
          listingId: id,
          createdAt: new Date(),
        });
        toast({
          title: "Bookmark Added",
          description: "Listing added to your favorites!",
        });

        // Create notification for the listing owner
        const listingOwnerId = listing.userId;
        const currentUser = auth.currentUser; // Get current user
        if (currentUser && listingOwnerId !== currentUser.uid) { // Don't notify self
          await addDoc(collection(db, "notifications"), {
            userId: listingOwnerId,
            type: "bookmark",
            message: `Your listing '${listing.title}' has been bookmarked by ${currentUser.displayName || currentUser.email?.split('@')[0]}!`,
            read: false,
            createdAt: serverTimestamp(),
            relatedId: id, // Link to the listing
          });
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
      navigate("/messages", { state: { sellerId: listing.userId, listingId: id } });
    }
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
    return null; // Should not happen if error is handled
  }

  // Use sellerProfile for display
  const displaySellerName = sellerProfile?.name || listing.userEmail.split('@')[0];
  const displaySellerAvatar = sellerProfile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${listing.userEmail}`;
  const displaySellerUniversity = sellerProfile?.university || "University Name";
  const displaySellerRating = sellerProfile?.rating || 0;
  const isService = listing.category === "Services";

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
                    isFavorited ? "text-warm-500" : "text-muted-foreground"
                  }`}
                  onClick={handleFavoriteToggle}
                >
                  <Heart className={`h-5 w-5 ${isFavorited ? "fill-current" : ""}`} />
                </Button>
                <div className="absolute top-4 left-4">
                  <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm font-medium text-base">
                    {listing.category}
                  </Badge>
                </div>
              </div>

              <div className="flex items-start justify-between mb-4">
                <h1 className="text-4xl font-bold text-gray-900">{listing.title}</h1>
                <div className="text-right">
                  <p className="font-bold text-3xl text-primary-warm">
                    {isService ? `${listing.price}/hr` : `$${listing.price.toFixed(2)}`}
                  </p>
                  {!isService && (
                    <Badge variant={listing.condition === "New" ? "default" : "outline"} className={cn(
                      "text-sm",
                      listing.condition === "New" && "bg-warm-500"
                    )}>
                      {listing.condition}
                    </Badge>
                  )}
                </div>
              </div>

              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                {listing.description}
              </p>

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

              <Button className="w-full gap-2 text-lg py-6 bg-warm-500 hover:bg-warm-600 text-white" onClick={handleContactSeller}>
                <MessageSquare className="h-5 w-5" />
                Contact Seller
              </Button>
            </div>
          </main>
        </div>
      </div>
      
      <FloatingChat />
    </div>
  );
}
