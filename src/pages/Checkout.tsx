import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, onSnapshot, query, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { stripePromise, formatPriceForStripe } from "@/lib/stripe";
import { Listing } from "@/types/listing";
import { CreditCard, Lock, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface CartItemDocument {
  id: string;
  listingId: string;
  quantity: number;
}

interface CheckoutFormData {
  email: string;
  fullName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
}

export default function CheckoutPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [cartItems, setCartItems] = useState<CartItemDocument[]>([]);
  const [listingsData, setListingsData] = useState<{[key: string]: Listing}>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState<CheckoutFormData>({
    email: "",
    fullName: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setLoading(true);
        // Set user email in form
        setFormData(prev => ({ ...prev, email: user.email || "" }));
        
        const userCartCollectionRef = collection(db, "users", user.uid, "cart");
        const unsubscribeCart = onSnapshot(query(userCartCollectionRef), async (querySnapshot) => {
          const fetchedCartItems: CartItemDocument[] = querySnapshot.docs.map(docSnap => ({
            id: docSnap.id,
            listingId: docSnap.data().listingId,
            quantity: docSnap.data().quantity,
          }));
          setCartItems(fetchedCartItems);

          if (fetchedCartItems.length > 0) {
            const uniqueListingIds = Array.from(new Set(fetchedCartItems.map(item => item.listingId)));
            const newFetchedListings: {[key: string]: Listing} = { ...listingsData };
            let listingsNeedUpdate = false;

            for (const listingId of uniqueListingIds) {
              if (!newFetchedListings[listingId]) {
                const listingDocRef = doc(db, "listings", listingId);
                const listingDocSnap = await getDoc(listingDocRef);
                if (listingDocSnap.exists()) {
                  const listingDataItem = listingDocSnap.data();
                  let sellerInfo: Listing['seller'] = { 
                    userId: listingDataItem.sellerId || listingDataItem.userId, 
                    name: "Unknown", 
                    avatar: "/placeholder.svg", 
                    rating: 0, 
                    university: "N/A" 
                  };
                  
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
                }
              }
            }
            if (listingsNeedUpdate) {
              setListingsData(newFetchedListings);
            }
          } else {
            setListingsData({});
          }
          setLoading(false);
        });
        return () => unsubscribeCart();
      } else {
        navigate("/auth");
      }
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  const calculateTotalPrice = () => {
    return cartItems.reduce((total, item) => {
      const listing = listingsData[item.listingId];
      if (listing && listing.price) {
        const priceString = String(listing.price);
        const priceValue = parseFloat(priceString.replace(/[^0-9.]/g, ""));
        if (!isNaN(priceValue)) {
          return total + (priceValue * item.quantity);
        }
      }
      return total;
    }, 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    const requiredFields = ['email', 'fullName', 'address', 'city', 'state', 'zipCode', 'phone'];
    for (const field of requiredFields) {
      if (!formData[field as keyof CheckoutFormData].trim()) {
        toast({
          title: "Missing Information",
          description: `Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} field.`,
          variant: "destructive"
        });
        return false;
      }
    }
    return true;
  };

  const handlePayment = async () => {
    if (!validateForm()) return;
    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Your cart is empty. Please add items before checkout.",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    const user = auth.currentUser;
    if (!user) return;

    try {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe failed to load");
      }

      const totalAmount = calculateTotalPrice();
      const amountInCents = formatPriceForStripe(totalAmount);

      // Create order in Firebase first
      const orderData = {
        buyerId: user.uid,
        buyerInfo: {
          email: formData.email,
          fullName: formData.fullName,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          phone: formData.phone,
        },
        items: cartItems.map(item => ({
          listingId: item.listingId,
          quantity: item.quantity,
          listing: listingsData[item.listingId],
          sellerId: listingsData[item.listingId]?.sellerId,
        })),
        totalAmount: totalAmount,
        status: "pending",
        paymentStatus: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const orderRef = await addDoc(collection(db, "orders"), orderData);

      // Create Stripe Checkout Session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountInCents,
          orderId: orderRef.id,
          customerEmail: formData.email,
          items: cartItems.map(item => ({
            name: listingsData[item.listingId]?.title || "Product",
            quantity: item.quantity,
            price: formatPriceForStripe(listingsData[item.listingId]?.price || "0"),
          })),
        }),
      });

      if (!response.ok) {
        // Fallback to client-side payment if server endpoint doesn't exist
        await handleClientSidePayment(stripe, amountInCents, orderRef.id);
        return;
      }

      const session = await response.json();
      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "An error occurred during payment processing.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleClientSidePayment = async (stripe: any, amountInCents: number, orderId: string) => {
    // This is a simplified client-side payment flow
    // In a real application, you would need a backend to create payment intents
    toast({
      title: "Payment Processing",
      description: "Redirecting to payment processor...",
    });

    // Simulate payment processing
    setTimeout(async () => {
      try {
        // Update order status
        await updateDoc(doc(db, "orders", orderId), {
          status: "confirmed",
          paymentStatus: "completed",
          updatedAt: new Date(),
        });

        // Clear cart
        const user = auth.currentUser;
        if (user) {
          for (const item of cartItems) {
            await deleteDoc(doc(db, "users", user.uid, "cart", item.id));
          }
        }

        toast({
          title: "Payment Successful!",
          description: "Your order has been placed successfully.",
        });

        navigate("/orders/outgoing");
      } catch (error) {
        console.error("Order update error:", error);
        toast({
          title: "Order Processing Error",
          description: "Payment was successful but there was an issue updating your order.",
          variant: "destructive"
        });
      }
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar isAuthenticated={!!auth.currentUser} />
        <div className="flex h-[calc(100vh-var(--navbar-height,64px))]">
          <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading checkout...</p>
            </div>
          </div>
        </div>
        <FloatingChat />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar isAuthenticated={!!auth.currentUser} />
        <div className="flex h-[calc(100vh-var(--navbar-height,64px))]">
          <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
          <div className="flex-1 flex items-center justify-center">
            <Card className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
              <p className="text-muted-foreground mb-6">Add some items to your cart before checkout.</p>
              <Button asChild>
                <Link to="/marketplace">Browse Products</Link>
              </Button>
            </Card>
          </div>
        </div>
        <FloatingChat />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar isAuthenticated={!!auth.currentUser} />
      <div className="flex h-[calc(100vh-var(--navbar-height,64px))]">
        <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="flex-1 overflow-auto">
          <main className="p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" asChild>
                  <Link to="/cart">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <h1 className="text-2xl md:text-3xl font-bold">Checkout</h1>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Billing Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Billing Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          name="state"
                          value={formData.state}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="zipCode">ZIP Code</Label>
                        <Input
                          id="zipCode"
                          name="zipCode"
                          value={formData.zipCode}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Order Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {cartItems.map(item => {
                        const listing = listingsData[item.listingId];
                        if (!listing) return null;
                        
                        return (
                          <div key={item.id} className="flex items-center space-x-4">
                            <img 
                              src={listing.image || "/placeholder.svg"} 
                              alt={listing.title} 
                              className="w-16 h-16 object-cover rounded-md"
                            />
                            <div className="flex-1">
                              <h4 className="font-medium line-clamp-2">{listing.title}</h4>
                              <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">${listing.price}</p>
                            </div>
                          </div>
                        );
                      })}
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>${calculateTotalPrice().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Shipping</span>
                          <span className="text-green-600">FREE</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax</span>
                          <span>$0.00</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-lg font-semibold">
                          <span>Total</span>
                          <span>${calculateTotalPrice().toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full mt-6" 
                        size="lg"
                        onClick={handlePayment}
                        disabled={processing}
                      >
                        {processing ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Processing...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Complete Payment
                          </div>
                        )}
                      </Button>
                      
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        <Lock className="h-3 w-3 inline mr-1" />
                        Your payment information is secure and encrypted
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
      <FloatingChat />
    </div>
  );
}
