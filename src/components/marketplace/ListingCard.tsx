import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, MapPin, Star, Truck } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, query, where, getDocs, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { addNotification } from "@/utils/notifications"; // Import addNotification utility
import { getLocationName } from "@/utils/geocoding";

interface SellerProfile {
  name: string;
  avatar?: string;
  university: string;
  rating: number;
}

interface LocationData {
  id: string;
  lat: number;
  lng: number;
  type: 'main' | 'delivery';
  name?: string;
}

interface ListingCardProps {
  id: string;
  title: string;
  price: string;
  condition: string;
  description: string;
  image: string;
  seller: {
    name: string;
    avatar?: string;
    university: string;
    rating: number;
    userId: string;
  };
  category: string;
  isService?: boolean;
  locations?: LocationData[];
  deliveryRadius?: number;
  isAvailable?: boolean;
  availabilityStatus?: 'available' | 'sold' | 'reserved' | 'unavailable';
}

export function ListingCard({ 
  id,
  title, 
  price, 
  condition, 
  description, 
  image, 
  seller, // Seller prop is now expected to be complete
  category, 
  isService = false,
  locations = [],
  deliveryRadius = 0,
  isAvailable = true,
  availabilityStatus = 'available'
}: ListingCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  // sellerProfile and loadingSeller states are no longer needed as seller prop is complete
  // const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  // const [loadingSeller, setLoadingSeller] = useState(true);

  useEffect(() => {
    const checkFavoriteStatus = async () => {
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
    };
    checkFavoriteStatus();
  }, [id]); // Only id is needed as a dependency now

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
        await addDoc(collection(db, "bookmarks"), {
          userId: user.uid,
          listingId: id,
          createdAt: serverTimestamp(),
        });
        toast({
          title: "Bookmark Added",
          description: "Listing added to your favorites!",
        });

        // Create notification for the listing owner using the utility function
        const listingOwnerId = seller.userId;
        if (auth.currentUser && listingOwnerId !== auth.currentUser.uid) { // Don't notify self
          await addNotification({
            userId: listingOwnerId,
            type: "bookmark",
            message: `Your listing '${title}' has been bookmarked by ${auth.currentUser.displayName || auth.currentUser.email?.split('@')[0]}!`,
            relatedId: id,
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

  const handleContactSeller = (e: React.MouseEvent) => {
    e.stopPropagation();
    const user = auth.currentUser;
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to contact sellers.",
        variant: "destructive",
      });
      return;
    }
    navigate("/messages", { state: { sellerId: seller.userId, listingId: id } });
  };

  return (
    <Link to={`/listings/${id}`} className="block">
      <Card 
        className={cn(
          "group transition-all duration-300 cursor-pointer overflow-hidden flex flex-col", // Added flex flex-col
          "shadow-sm hover:shadow-md hover:shadow-lg hover:scale-[1.02] hover:border-primary-warm",
          "h-full" // Ensure card takes full height of its grid cell
        )}
      >
        <CardContent className="p-0 flex-grow flex flex-col"> {/* Added flex-grow and flex flex-col */}
          <div className="relative">
            <div className="overflow-hidden">
              <img
                src={image || "/placeholder.svg"}
                alt={title}
                className={cn(
                  "w-full h-48 object-cover transition-all duration-500",
                  "group-hover:transform group-hover:scale-110"
                )}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className={`absolute top-3 right-3 h-8 w-8 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background/95 shadow-sm ${
                isFavorited ? "text-warm-500" : "text-muted-foreground"
              }`}
              onClick={handleFavoriteToggle}
            >
              <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
            </Button>
            <div className="absolute top-3 left-3 space-y-1">
              <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm font-medium">
                {category}
              </Badge>
              {/* Availability Status Badge */}
              {!isAvailable || availabilityStatus !== 'available' && (
                <div>
                  <Badge 
                    variant={availabilityStatus === 'sold' ? 'destructive' : 'outline'} 
                    className={cn(
                      "bg-background/90 backdrop-blur-sm font-medium text-xs",
                      availabilityStatus === 'sold' && "bg-red-500 text-white",
                      availabilityStatus === 'reserved' && "bg-yellow-500 text-white",
                      availabilityStatus === 'unavailable' && "bg-gray-500 text-white"
                    )}
                  >
                    {availabilityStatus === 'sold' && 'SOLD'}
                    {availabilityStatus === 'reserved' && 'RESERVED'}
                    {availabilityStatus === 'unavailable' && 'UNAVAILABLE'}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-4 flex-grow flex flex-col justify-between"> {/* Added flex-grow and flex flex-col justify-between */}
            <div> {/* Wrapper div for title and price/condition */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary-warm transition-colors">
                  {title}
                </h3>
                <div className="text-right">
                  <p className="font-bold text-lg text-primary-warm">
                    {isService ? `${price}/hr` : price}
                  </p>
                  {!isService && (
                    <Badge variant={condition === "New" ? "default" : "outline"} className={cn(
                      "text-xs",
                      condition === "New" && "bg-warm-500"
                    )}>
                      {condition}
                    </Badge>
                  )}
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3 min-h-[2.5rem]"> {/* Added min-h for consistent description height */}
                {description}
              </p>

              {/* Location and Delivery Information */}
              {locations.length > 0 && (
                <div className="mb-3 space-y-1">
                  {locations.find(loc => loc.type === 'main') && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 text-blue-600" />
                      <span>Main location set</span>
                    </div>
                  )}
                  {locations.filter(loc => loc.type === 'delivery').length > 0 && deliveryRadius > 0 && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <Truck className="h-3 w-3" />
                      <span>Delivery available ({deliveryRadius}km radius)</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between mt-auto"> {/* Added mt-auto to push to bottom */}
              {/* Seller information is now directly available from the seller prop */}
              {seller && (
                <div className="flex items-center space-x-2">
                  <Avatar className="h-7 w-7 border-2 border-background shadow-sm">
                    {seller.avatar && <AvatarImage src={seller.avatar} />}
                    <AvatarFallback className="text-xs bg-warm-100 text-warm-800">
                      {seller.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{seller.name}</p>
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{seller.university}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {seller && (
                <div className="flex items-center space-x-1 bg-warm-50 px-2 py-1 rounded">
                  <Star className="h-3 w-3 fill-warm-400 text-warm-400" />
                  <span className="text-sm font-medium text-warm-700">{seller.rating || 0}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="pt-0 px-4 pb-4">
          {isAvailable !== false && availabilityStatus === 'available' ? (
            <Button className="w-full gap-2 text-base py-5 bg-warm-50 hover:bg-warm-100 text-warm-700" variant="ghost" onClick={handleContactSeller}>
              <MessageSquare className="h-4 w-4" />
              Contact Seller
            </Button>
          ) : (
            <Button 
              className="w-full gap-2 text-base py-5 cursor-not-allowed opacity-60" 
              variant="outline" 
              disabled
            >
              <MessageSquare className="h-4 w-4" />
              {availabilityStatus === 'sold' && 'Item Sold'}
              {availabilityStatus === 'reserved' && 'Item Reserved'}
              {availabilityStatus === 'unavailable' && 'Unavailable'}
              {!availabilityStatus && 'Unavailable'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
