import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck,
  Package,
  MapPin,
  User,
  Star,
  Eye,
  MessageSquare,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/components/ui/use-toast';
import { OrderWithListing } from '@/types/order';
import { useNavigate } from 'react-router-dom';
import { addNotification } from '@/utils/notifications';

export function OutgoingOrders() {
  const [orders, setOrders] = useState<OrderWithListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const ordersQuery = query(
      collection(db, "orders"),
      where("buyerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(ordersQuery, async (snapshot) => {
      try {
        const ordersList: OrderWithListing[] = [];
        
        for (const docSnapshot of snapshot.docs) {
          const orderData = { id: docSnapshot.id, ...docSnapshot.data() } as OrderWithListing;
          
          // Fetch listing details
          try {
            const listingDoc = await getDoc(doc(db, "listings", orderData.listingId));
            if (listingDoc.exists()) {
              orderData.listing = {
                id: listingDoc.id,
                ...listingDoc.data()
              } as OrderWithListing['listing'];
            }
          } catch (error) {
            console.error("Error fetching listing for order:", error);
          }
          
          ordersList.push(orderData);
        }
        
        // Sort orders by createdAt in descending order (newest first)
        ordersList.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });
        
        setOrders(ordersList);
      } catch (error) {
        console.error("Error fetching outgoing orders:", error);
        toast({
          title: "Error",
          description: "Failed to load your orders.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [toast]);

  const handleConfirmDelivery = async (orderId: string) => {
    setProcessingOrder(orderId);
    
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      await updateDoc(doc(db, "orders", orderId), {
        status: 'delivered',
        updatedAt: serverTimestamp(),
      });

      // Create notification for seller
      try {
        await addNotification({
          userId: order.sellerId,
          type: "system",
          message: `Order for "${order.listingTitle}" has been confirmed as delivered by the buyer.`,
          relatedId: order.listingId,
        });
      } catch (notificationError) {
        console.error("Error creating notification:", notificationError);
      }

      // Create a message in the chat system
      const user = auth.currentUser;
      if (user) {
        const chatMessage = {
          senderId: user.uid,
          receiverId: order.sellerId,
          listingId: order.listingId,
          type: 'order_update',
          content: `✅ **Delivery Confirmed**\n\n**Item:** ${order.listingTitle}\n**Order ID:** ${orderId}\n\nThe buyer has confirmed receipt of this order. Thank you for the successful transaction!`,
          orderId: orderId,
          createdAt: serverTimestamp(),
          read: false,
        };

        await addDoc(collection(db, "messages"), chatMessage);
      }

      toast({
        title: "Success",
        description: "Delivery confirmed successfully!",
      });

    } catch (error) {
      console.error("Error confirming delivery:", error);
      toast({
        title: "Error",
        description: "Failed to confirm delivery. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    
    setProcessingOrder(orderId);
    
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      await updateDoc(doc(db, "orders", orderId), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });

      // Create notification for seller
      try {
        await addNotification({
          userId: order.sellerId,
          type: "system",
          message: `Order for "${order.listingTitle}" has been cancelled by the buyer.`,
          relatedId: order.listingId,
        });
      } catch (notificationError) {
        console.error("Error creating notification:", notificationError);
      }

      // Create a message in the chat system
      const user = auth.currentUser;
      if (user) {
        const chatMessage = {
          senderId: user.uid,
          receiverId: order.sellerId,
          listingId: order.listingId,
          type: 'order_update',
          content: `❌ **Order Cancelled**\n\n**Item:** ${order.listingTitle}\n**Order ID:** ${orderId}\n\nThe buyer has cancelled this order.`,
          orderId: orderId,
          createdAt: serverTimestamp(),
          read: false,
        };

        await addDoc(collection(db, "messages"), chatMessage);
      }

      toast({
        title: "Success",
        description: "Order cancelled successfully.",
      });

    } catch (error) {
      console.error("Error cancelling order:", error);
      toast({
        title: "Error",
        description: "Failed to cancel order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingOrder(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'shipped':
        return <Truck className="h-4 w-4 text-purple-600" />;
      case 'delivered':
        return <Package className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatAddress = (address: any) => {
    if (!address) return 'No address provided';
    return `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`;
  };

  const getOrderProgress = (status: string) => {
    const steps = ['pending', 'confirmed', 'shipped', 'delivered'];
    const currentIndex = steps.indexOf(status);
    return currentIndex >= 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            My Orders
          </CardTitle>
          <CardDescription>Track your purchases and orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          My Orders ({orders.length})
        </CardTitle>
        <CardDescription>
          Track and manage your purchases
        </CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders placed yet</h3>
            <p className="text-gray-500 mb-4">
              Start shopping to see your orders here.
            </p>
            <Button onClick={() => navigate('/listings')}>
              Browse Listings
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3 flex-1">
                      {order.listing?.imageUrl && (
                        <img
                          src={order.listing.imageUrl}
                          alt={order.listingTitle}
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{order.listingTitle}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            Order #{order.id.slice(-6)}
                          </Badge>
                          <Badge className={`text-xs ${getStatusColor(order.status)}`}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(order.status)}
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </Badge>
                          <Badge className={`text-xs ${getPaymentStatusColor(order.paymentStatus)}`}>
                            Payment: {order.paymentStatus}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span>Qty: <strong>{order.quantity}</strong></span>
                          <span>Unit: <strong>${order.unitPrice}</strong></span>
                          <span>Total: <strong className="text-green-600">${order.totalAmount}</strong></span>
                          <span>Method: <strong>{order.deliveryMethod}</strong></span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Ordered on {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/listings/${order.listingId}`)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Item
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/messages?seller=${order.sellerId}&listing=${order.listingId}`)}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Message Seller
                      </Button>
                    </div>
                  </div>

                  {/* Order Progress Bar */}
                  {order.status !== 'cancelled' && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Order Progress</span>
                        <span>{Math.round(getOrderProgress(order.status))}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getOrderProgress(order.status)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Pending</span>
                        <span>Confirmed</span>
                        <span>Shipped</span>
                        <span>Delivered</span>
                      </div>
                    </div>
                  )}

                  {/* Seller Information */}
                  <div className="bg-gray-50 rounded p-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-sm">Seller Information</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <span className="ml-2 font-medium">{order.sellerName}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Email:</span>
                        <span className="ml-2">{order.sellerEmail}</span>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="bg-blue-50 rounded p-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">Delivery Address</span>
                    </div>
                    <p className="text-sm text-blue-800">
                      {formatAddress(order.shippingAddress)}
                    </p>
                  </div>

                  {/* Tracking Information */}
                  {order.trackingNumber && (
                    <div className="bg-purple-50 rounded p-3 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Truck className="h-4 w-4 text-purple-600" />
                        <span className="font-medium text-sm">Tracking Information</span>
                      </div>
                      <p className="text-sm text-purple-800">
                        <strong>Tracking Number:</strong> {order.trackingNumber}
                      </p>
                      {order.estimatedDelivery && (
                        <p className="text-sm text-purple-800">
                          <strong>Estimated Delivery:</strong> {formatDate(order.estimatedDelivery)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Order Notes */}
                  {order.notes && (
                    <div className="bg-yellow-50 rounded p-3 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium text-sm">Order Notes</span>
                      </div>
                      <p className="text-sm text-yellow-800">{order.notes}</p>
                    </div>
                  )}

                  {/* Order Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    {order.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={processingOrder === order.id}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        {processingOrder === order.id ? 'Cancelling...' : 'Cancel Order'}
                      </Button>
                    )}
                    
                    {order.status === 'shipped' && (
                      <Button
                        size="sm"
                        onClick={() => handleConfirmDelivery(order.id)}
                        disabled={processingOrder === order.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {processingOrder === order.id ? 'Confirming...' : 'Confirm Delivery'}
                      </Button>
                    )}

                    {order.status === 'delivered' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/listings/${order.listingId}?review=true`)}
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Leave Review
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.reload()}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Refresh Status
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
