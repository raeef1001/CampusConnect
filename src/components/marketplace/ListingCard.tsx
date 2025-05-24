import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, MapPin, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, query, where, getDocs, doc, getDoc, serverTimestamp } from "firebase/firestore"; // Import serverTimestamp
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface SellerProfile {
  name: string;
  avatar?: string;
  university: string;
  rating: number;
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
}

export function ListingCard({ 
  id,
  title, 
  price, 
  condition, 
  description, 
  image, 
  seller, 
  category, 
  isService = false 
}: ListingCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [loadingSeller, setLoadingSeller] = useState(true);

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

    const fetchSellerProfile = async () => {
      if (!seller || !seller.userId) {
        console.warn("Seller or seller.userId is undefined for listing:", id);
        setLoadingSeller(false);
        return;
      }
      try {
        const userDocRef = doc(db, "users", seller.userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setSellerProfile(userDocSnap.data() as SellerProfile);
        } else {
          // Fallback if user document doesn't exist but seller data is provided
          setSellerProfile({
            name: seller.name,
            avatar: seller.avatar,
            university: seller.university,
            rating: seller.rating,
          });
        }
      } catch (error) {
        console.error("Error fetching seller profile:", error);
        // Fallback on error
        setSellerProfile({
          name: seller.name,
          avatar: seller.avatar,
          university: seller.university,
          rating: seller.rating,
        });
      } finally {
        setLoadingSeller(false);
      }
    };
    fetchSellerProfile();
  }, [id, seller?.userId, seller?.name, seller?.avatar, seller?.university, seller?.rating]); // Added dependencies and optional chaining

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
          createdAt: new Date(),
        });
        toast({
          title: "Bookmark Added",
          description: "Listing added to your favorites!",
        });

        // Create notification for the listing owner
        const listingOwnerId = seller.userId;
        if (auth.currentUser && listingOwnerId !== auth.currentUser.uid) { // Don't notify self
          await addDoc(collection(db, "notifications"), {
            userId: listingOwnerId,
            type: "bookmark",
            message: `Your listing '${title}' has been bookmarked by ${auth.currentUser.displayName || auth.currentUser.email?.split('@')[0]}!`,
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
          "group transition-all duration-300 cursor-pointer overflow-hidden",
          "shadow-sm hover:shadow-md hover:shadow-lg hover:scale-[1.02] hover:border-primary-warm"
        )}
      >
        <CardContent className="p-0">
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
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm font-medium">
                {category}
              </Badge>
            </div>
          </div>
          
          <div className="p-4">
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
            
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {description}
            </p>
            
            <div className="flex items-center justify-between">
              {loadingSeller ? (
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ) : (
                sellerProfile && (
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-7 w-7 border-2 border-background shadow-sm">
                      {sellerProfile.avatar && <AvatarImage src={sellerProfile.avatar} />}
                      <AvatarFallback className="text-xs bg-warm-100 text-warm-800">
                        {sellerProfile.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{sellerProfile.name}</p>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{sellerProfile.university}</p>
                      </div>
                    </div>
                  </div>
                )
              )}
              
              {loadingSeller ? (
                <Skeleton className="h-6 w-16 rounded" />
              ) : (
                sellerProfile && (
                  <div className="flex items-center space-x-1 bg-warm-50 px-2 py-1 rounded">
                    <Star className="h-3 w-3 fill-warm-400 text-warm-400" />
                    <span className="text-sm font-medium text-warm-700">{sellerProfile.rating || 0}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="pt-0 px-4 pb-4">
          <Button className="w-full gap-2 text-base py-5 bg-warm-50 hover:bg-warm-100 text-warm-700" variant="ghost" onClick={handleContactSeller}>
            <MessageSquare className="h-4 w-4" />
            Contact Seller
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
