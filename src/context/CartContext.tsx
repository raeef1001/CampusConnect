import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, doc, getDoc, onSnapshot, query, updateDoc, deleteDoc, setDoc, getDocs } from 'firebase/firestore';
import { useToast } from '@/components/ui/use-toast';
import { Listing } from '@/types/listing';

// Define the structure of a cart item
export interface CartItem {
  listingId: string;
  quantity: number;
  // You might want to store a snapshot of listing details here
  // e.g., title, price, image, to display in the cart even if the original listing changes
  // This is a simplified version, assuming we'll fetch listing details separately.
}

// Define the structure of the CartContext
interface CartContextType {
  cartItems: CartItem[];
  listingsData: { [key: string]: Listing };
  loadingCart: boolean;
  addToCart: (listing: Listing, quantity?: number) => Promise<void>;
  removeFromCart: (listingId: string) => Promise<void>;
  updateCartItemQuantity: (listingId: string, newQuantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartItemQuantity: (listingId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [listingsData, setListingsData] = useState<{ [key: string]: Listing }>({});
  const [loadingCart, setLoadingCart] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setLoadingCart(true);
        const userCartCollectionRef = collection(db, "users", user.uid, "cart");

        const unsubscribeCart = onSnapshot(query(userCartCollectionRef), async (querySnapshot) => {
          const fetchedCartItems: CartItem[] = querySnapshot.docs.map(docSnap => ({
            listingId: docSnap.data().listingId,
            quantity: docSnap.data().quantity,
          }));
          setCartItems(fetchedCartItems);

          if (fetchedCartItems.length > 0) {
            const uniqueListingIds = Array.from(new Set(fetchedCartItems.map(item => item.listingId)));
            const newFetchedListings: { [key: string]: Listing } = { ...listingsData };
            let listingsNeedUpdate = false;

            for (const listingId of uniqueListingIds) {
              if (!newFetchedListings[listingId]) {
                const listingDocRef = doc(db, "listings", listingId);
                const listingDocSnap = await getDoc(listingDocRef);
                if (listingDocSnap.exists()) {
                  const listingDataItem = listingDocSnap.data();
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
                    price: String(listingDataItem.price),
                    image: listingDataItem.imageUrl,
                    sellerId: listingDataItem.sellerId || listingDataItem.userId,
                    seller: sellerInfo
                  } as Listing;
                  listingsNeedUpdate = true;
                } else {
                  console.warn(`Listing with ID ${listingId} not found in listings collection. It might have been deleted.`);
                }
              }
            }
            if (listingsNeedUpdate) {
              setListingsData(newFetchedListings);
            }
          } else {
            setListingsData({});
          }
          setLoadingCart(false);
        }, (error) => {
          console.error("Error fetching cart items:", error);
          toast({ title: "Error", description: "Failed to load your cart. Please try again.", variant: "destructive" });
          setLoadingCart(false);
        });
        return () => unsubscribeCart();
      } else {
        setCartItems([]);
        setListingsData({});
        setLoadingCart(false);
      }
    });
    return () => unsubscribeAuth();
  }, [toast]);

  const addToCart = async (listing: Listing, quantity: number = 1) => {
    const user = auth.currentUser;
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to add items to your cart.", variant: "destructive" });
      return;
    }

    try {
      const cartItemRef = doc(db, "users", user.uid, "cart", listing.id);
      const cartDocSnap = await getDoc(cartItemRef);

      if (cartDocSnap.exists()) {
        // Item already in cart, update quantity
        const currentQuantity = cartDocSnap.data().quantity;
        await updateDoc(cartItemRef, { quantity: currentQuantity + quantity });
        toast({ title: "Cart Updated", description: `${listing.title} quantity updated in your cart.` });
      } else {
        // Item not in cart, add new
        await setDoc(cartItemRef, {
          listingId: listing.id,
          quantity: quantity,
          addedAt: new Date(), // Optional: timestamp
        });
        toast({ title: "Added to Cart", description: `${listing.title} has been added to your cart.` });
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast({ title: "Error", description: "Failed to add item to cart. Please try again.", variant: "destructive" });
    }
  };

  const removeFromCart = async (listingId: string) => {
    const user = auth.currentUser;
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in.", variant: "destructive" });
      return;
    }

    try {
      const cartItemRef = doc(db, "users", user.uid, "cart", listingId);
      await deleteDoc(cartItemRef);
      toast({ title: "Item Removed", description: "Product removed from your cart." });
    } catch (error) {
      console.error("Error removing from cart:", error);
      toast({ title: "Error", description: "Failed to remove item from cart. Please try again.", variant: "destructive" });
    }
  };

  const updateCartItemQuantity = async (listingId: string, newQuantity: number) => {
    const user = auth.currentUser;
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in.", variant: "destructive" });
      return;
    }
    if (newQuantity < 1) {
      // If quantity drops to 0 or less, remove the item
      await removeFromCart(listingId);
      return;
    }

    try {
      const cartItemRef = doc(db, "users", user.uid, "cart", listingId);
      await updateDoc(cartItemRef, { quantity: newQuantity });
      toast({ title: "Cart Updated", description: "Product quantity updated." });
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast({ title: "Error", description: "Failed to update quantity. Please try again.", variant: "destructive" });
    }
  };

  const clearCart = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in.", variant: "destructive" });
      return;
    }
    try {
      const cartCollectionRef = collection(db, "users", user.uid, "cart");
      const querySnapshot = await getDocs(query(cartCollectionRef));
      const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      toast({ title: "Cart Cleared", description: "Your cart has been emptied." });
    } catch (error) {
      console.error("Error clearing cart:", error);
      toast({ title: "Error", description: "Failed to clear cart. Please try again.", variant: "destructive" });
    }
  };

  const getCartItemQuantity = (listingId: string): number => {
    const item = cartItems.find(item => item.listingId === listingId);
    return item ? item.quantity : 0;
  };

  return (
    <CartContext.Provider value={{ cartItems, listingsData, loadingCart, addToCart, removeFromCart, updateCartItemQuantity, clearCart, getCartItemQuantity }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
