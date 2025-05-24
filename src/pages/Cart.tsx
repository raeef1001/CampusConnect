import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, MinusCircle, PlusCircle, ShoppingCart as CartIconLucide } from "lucide-react"; // Renamed to avoid conflict
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, onSnapshot, query, updateDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/components/ui/use-toast";
import { Listing } from "@/types/listing";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
// Represents the structure of a document in the 'cart' subcollection
interface CartItemDocument {
  id: string; // The document ID from the 'cart' subcollection
  listingId: string;
  quantity: number;
  // addedAt?: Timestamp; // Optional: if you store this when adding to cart
  // You might also store snapshots of title, image, price here
  // for resilience if the original listing is deleted or changed.
}

export default function CartPage() { // Renamed component to CartPage for clarity
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [cartItems, setCartItems] = useState<CartItemDocument[]>([]);
  const [listingsData, setListingsData] = useState<{[key: string]: Listing}>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setLoading(true);
        // Reference to the 'cart' subcollection for the current user
        const userCartCollectionRef = collection(db, "users", user.uid, "cart");

        const unsubscribeCart = onSnapshot(query(userCartCollectionRef), async (querySnapshot) => {
          const fetchedCartItems: CartItemDocument[] = querySnapshot.docs.map(docSnap => ({
            id: docSnap.id, // This is the ID of the cart item document itself
            listingId: docSnap.data().listingId,
            quantity: docSnap.data().quantity,
            // addedAt: docSnap.data().addedAt, // if you store it
          }));
          setCartItems(fetchedCartItems);

          if (fetchedCartItems.length > 0) {
            const uniqueListingIds = Array.from(new Set(fetchedCartItems.map(item => item.listingId)));
            const newFetchedListings: {[key: string]: Listing} = { ...listingsData }; // Preserve already fetched
            let listingsNeedUpdate = false;

            for (const listingId of uniqueListingIds) {
              if (!newFetchedListings[listingId]) { // Fetch only if not already present
                const listingDocRef = doc(db, "listings", listingId);
                const listingDocSnap = await getDoc(listingDocRef);
                if (listingDocSnap.exists()) {
                  const listingDataItem = listingDocSnap.data();
                  // Construct the seller object for the Listing type
                  let sellerInfo: Listing['seller'] = { userId: listingDataItem.sellerId || listingDataItem.userId, name: "Unknown", avatar: "/placeholder.svg", rating: 0, university: "N/A" };
                  if (listingDataItem.sellerId || listingDataItem.userId) {
                      const sellerDocRef = doc(db, "users", listingDataItem.sellerId || listingDataItem.userId);
                      const sellerDocSnap = await getDoc(sellerDocRef);
                      if (sellerDocSnap.exists()) {
                          const sData = sellerDocSnap.data();
                          sellerInfo = {
                              userId: sellerDocSnap.id,
                              name: sData.name || "Seller",
                              avatar: sData.avatar || "/placeholder.svg",
                              rating: sData.rating || 0,
                              university: sData.university || "N/A"
                          };
                      }
                  }

                  newFetchedListings[listingId] = { 
                    id: listingDocSnap.id, 
                    ...listingDataItem,
                    price: String(listingDataItem.price), // Ensure price is string
                    image: listingDataItem.imageUrl, // Assuming imageUrl is the field
                    sellerId: listingDataItem.sellerId || listingDataItem.userId, // Ensure this exists
                    seller: sellerInfo
                  } as Listing;
                  listingsNeedUpdate = true;
                } else {
                  console.warn(`Listing with ID ${listingId} not found in listings collection. It might have been deleted.`);
                  // Optionally, you could mark this cart item as "unavailable" or auto-remove it.
                }
              }
            }
            if (listingsNeedUpdate) {
              setListingsData(newFetchedListings);
            }
          } else {
            setListingsData({}); // No items in cart, clear listings data
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching cart items:", error);
          toast({ title: "Error", description: "Failed to load your cart. Please try again.", variant: "destructive" });
          setLoading(false);
        });
        return () => unsubscribeCart(); // Cleanup listener when user logs out or component unmounts
      } else {
        // User is logged out
        setCartItems([]);
        setListingsData({});
        setLoading(false);
      }
    });
    return () => unsubscribeAuth(); // Cleanup auth listener
  }, [toast]); // listingsData removed from deps to avoid re-runs from its own update

  const handleRemoveItem = async (cartItemId: string) => {
    const user = auth.currentUser;
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in.", variant: "destructive" });
      return;
    }
    
    const itemToRemove = cartItems.find(item => item.id === cartItemId);
    const listingTitle = itemToRemove && listingsData[itemToRemove.listingId]?.title || "The product";

    try {
      const cartItemDocRef = doc(db, "users", user.uid, "cart", cartItemId);
      await deleteDoc(cartItemDocRef);
      toast({
        title: "Item Removed",
        description: `${listingTitle} has been removed from your cart.`,
      });
      // Real-time listener (onSnapshot) will automatically update the cartItems state.
    } catch (error) {
      console.error("Error removing item from cart:", error);
      toast({ title: "Error", description: "Could not remove item. Please try again.", variant: "destructive" });
    }
  };

  const handleUpdateQuantity = async (cartItemId: string, newQuantity: number) => {
    const user = auth.currentUser;
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in.", variant: "destructive" });
      return;
    }
    if (newQuantity < 1) { // Prevent quantity from going below 1
        // Optionally, if newQuantity is 0, you could call handleRemoveItem(cartItemId);
        console.warn("Quantity cannot be less than 1.");
        return; 
    }

    try {
      const cartItemDocRef = doc(db, "users", user.uid, "cart", cartItemId);
      await updateDoc(cartItemDocRef, { quantity: newQuantity });
      // Real-time listener (onSnapshot) will automatically update the cartItems state.
    } catch (error) {
      console.error("Error updating item quantity:", error);
      toast({ title: "Error", description: "Could not update quantity. Please try again.", variant: "destructive" });
    }
  };

  const calculateTotalPrice = () => {
    return cartItems.reduce((total, item) => {
      const listing = listingsData[item.listingId];
      if (listing && listing.price) {
        const priceString = String(listing.price); // Ensure it's a string
        const priceValue = parseFloat(priceString.replace(/[^0-9.]/g, "")); // Keep only numbers and decimal point
        if (!isNaN(priceValue)) {
          return total + (priceValue * item.quantity);
        }
      }
      return total;
    }, 0).toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col dark:bg-gray-900">
        <Navbar isAuthenticated={!!auth.currentUser} />
        <div className="flex flex-1">
          <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">Your Cart</h1>
              <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
                <div className="space-y-6">
                  {[...Array(3)].map((_, i) => ( // Skeleton loader for cart items
                    <div key={i} className="flex items-center space-x-4 p-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                      <Skeleton className="w-20 h-20 rounded-md" />
                      <div className="flex-1 space-y-3">
                        <Skeleton className="h-5 w-3/4 rounded" />
                        <Skeleton className="h-4 w-1/2 rounded" />
                      </div>
                      <Skeleton className="h-8 w-24 rounded" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </main>
        </div>
        <FloatingChat />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar isAuthenticated={!!auth.currentUser} />
      <div className="flex h-[calc(100vh-var(--navbar-height,64px))]">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <div className="max-w-5xl mx-auto">
              <h1 className="text-2xl md:text-3xl font-bold mb-6">Your Cart</h1>
              {cartItems.length === 0 ? (
                <Card className="p-6 py-12 text-center text-muted-foreground flex flex-col items-center">
                  <CartIconLucide className="h-20 w-20 mb-6 text-gray-400" />
                  <p className="text-xl font-semibold mb-2">Your cart is currently empty.</p>
                  <p className="mb-6">Looks like you haven't added anything yet.</p>
                  <Button asChild size="lg">
                    <Link to="/marketplace">Browse Products</Link> {/* Ensure this route exists */}
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    {cartItems.map(item => { // item is CartItemDocument
                      const listing = listingsData[item.listingId];
                      if (!listing) { // If listing details are not yet fetched or listing was deleted
                        return (
                            <Card key={item.id + "-loading"} className="flex items-center p-4 opacity-60 animate-pulse">
                                <Skeleton className="w-20 h-20 rounded-md mr-4" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-5 w-3/4 rounded" />
                                    <Skeleton className="h-4 w-1/2 rounded" />
                                </div>
                            </Card>
                        );
                      }
                      return (
                        <Card key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center p-4 space-x-0 sm:space-x-4 relative">
                          <Link to={`/listings/${listing.id}`} className="w-full sm:w-24 flex-shrink-0 mb-3 sm:mb-0">
                            <img 
                              src={listing.image || "/placeholder.svg"} 
                              alt={listing.title} 
                              className="w-full sm:w-24 h-auto sm:h-24 object-cover rounded-md"
                            />
                          </Link>
                          <div className="flex-1">
                            <Link to={`/listings/${listing.id}`} className="hover:underline" title={listing.title}>
                                <h3 className="font-semibold text-lg line-clamp-2">{listing.title}</h3>
                            </Link>
                            <p className="text-primary font-medium text-md my-1">{listing.price}</p>
                            <div className="flex items-center mt-2 space-x-2">
                              <Button variant="outline" size="icon" onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} aria-label="Decrease quantity">
                                <MinusCircle className="h-4 w-4" />
                              </Button>
                              <span className="mx-1 font-medium w-8 text-center tabular-nums">{item.quantity}</span>
                              <Button variant="outline" size="icon" onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} aria-label="Increase quantity">
                                <PlusCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="absolute top-2 right-2 sm:static sm:ml-auto text-destructive hover:text-destructive/80" onClick={() => handleRemoveItem(item.id)} aria-label="Remove item">
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </Card>
                      );
                    })}
                  </div>
                  <div className="lg:col-span-1">
                    <Card className="p-6 sticky top-20 shadow-lg"> {/* Adjusted sticky top for typical navbar height */}
                      <CardHeader className="p-0 mb-4">
                        <CardTitle className="text-xl md:text-2xl">Order Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 space-y-3">
                        <div className="flex justify-between text-md">
                          <span>Subtotal</span>
                          <span>${calculateTotalPrice()}</span>
                        </div>
                        <div className="flex justify-between text-md text-muted-foreground">
                          <span>Shipping</span>
                          <span className="text-green-600 font-medium">FREE</span> {/* Or implement shipping calculation */}
                        </div>
                        <hr className="my-3 border-border"/>
                        <div className="flex justify-between text-lg font-semibold">
                          <span>Total Estimate:</span>
                          <span>${calculateTotalPrice()}</span>
                        </div>
                        <Button className="w-full mt-6 text-lg py-3 h-auto">
                          Proceed to Checkout
                        </Button>
                         <p className="text-xs text-muted-foreground text-center mt-2">Secure and encrypted checkout.</p>
                      </CardContent>
                    </Card>
                  </div>
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
