import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck,
  Package,
  MapPin,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Eye,
  MessageSquare
} from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/components/ui/use-toast';
import { OrderWithListing } from '@/types/order';
import { useNavigate } from 'react-router-dom';
import { addNotification } from '@/utils/notifications';

export function IncomingOrders() {
  const [orders, setOrders] = useState<OrderWithListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const [statusUpdates, setStatusUpdates] = useState<{ [key: string]: { status: string; trackingNumber: string; notes: string } }>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const ordersQuery = query(
      collection(db, "orders")
    );

    const unsubscribe = onSnapshot(ordersQuery, async (snapshot) => {
      try {
        const ordersList: OrderWithListing[] = [];
        
        for (const docSnapshot of snapshot.docs) {
          const orderData = { id: docSnapshot.id, ...docSnapshot.data() } as any;
          
          // Handle new order structure with items array
          if (orderData.items && Array.isArray(orderData.items)) {
            // Process each item in the order to find items for current seller
            for (const item of orderData.items) {
              if (item.sellerId === user.uid) {
                const orderItem: OrderWithListing = {
                  id: orderData.id,
                  buyerId: orderData.buyerId,
                  buyerName: orderData.buyerInfo?.fullName || 'Unknown Buyer',
                  buyerEmail: orderData.buyerInfo?.email || '',
                  sellerId: item.sellerId,
                  listingId: item.listingId,
                  listingTitle: item.listing?.title || 'Unknown Item',
                  quantity: item.quantity,
                  unitPrice: item.listing?.price || '0',
                  totalAmount: orderData.totalAmount,
                  status: orderData.status,
                  paymentStatus: orderData.paymentStatus || 'pending',
                  deliveryMethod: 'shipping',
                  createdAt: orderData.createdAt,
                  updatedAt: orderData.updatedAt,
                  sellerName: item.listing?.seller?.name || 'Unknown Seller',
                  sellerEmail: item.listing?.seller?.email || '',
                  shippingAddress: orderData.buyerInfo,
                  listing: item.listing
                };
                ordersList.push(orderItem);
              }
            }
          } else if (orderData.sellerId === user.uid) {
            // Handle legacy order structure
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
            ordersList.push(orderData as OrderWithListing);
          }
        }
        
        // Sort orders by createdAt in descending order (newest first)
        ordersList.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });
        
        setOrders(ordersList);
      } catch (error) {
        console.error("Error fetching incoming orders:", error);
        toast({
          title: "Error",
          description: "Failed to load incoming orders.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [toast]);

  const handleOrderStatusUpdate = async (orderId: string, newStatus: string, trackingNumber?: string, notes?: string) => {
    setProcessingOrder(orderId);
    
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp(),
      };

      if (trackingNumber) {
        updateData.trackingNumber = trackingNumber;
      }

      if (notes) {
        updateData.notes = notes;
      }

      // Set estimated delivery for shipped orders
      if (newStatus === 'shipped') {
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 3); // 3 days from now
        updateData.estimatedDelivery = estimatedDelivery;
      }

      await updateDoc(doc(db, "orders", orderId), updateData);

      // Create notification for buyer
      let notificationMessage = '';
      switch (newStatus) {
        case 'confirmed':
          notificationMessage = `Your order for "${order.listingTitle}" has been confirmed by the seller.`;
          break;
        case 'shipped':
          notificationMessage = `Your order for "${order.listingTitle}" has been shipped${trackingNumber ? ` (Tracking: ${trackingNumber})` : ''}.`;
          break;
        case 'delivered':
          notificationMessage = `Your order for "${order.listingTitle}" has been delivered.`;
          break;
        case 'cancelled':
          notificationMessage = `Your order for "${order.listingTitle}" has been cancelled by the seller.`;
          break;
        default:
          notificationMessage = `Your order for "${order.listingTitle}" status has been updated to ${newStatus}.`;
      }

      try {
        await addNotification({
          userId: order.buyerId,
          type: "system",
          message: notificationMessage,
          relatedId: order.listingId,
        });
      } catch (notificationError) {
        console.error("Error creating notification:", notificationError);
      }

      // Create a message in the chat system
      const user = auth.currentUser;
      if (user) {
        let messageContent = '';
        switch (newStatus) {
          case 'confirmed':
            messageContent = `✅ **Order Confirmed**\n\n**Item:** ${order.listingTitle}\n**Order ID:** ${orderId}\n**Total:** $${order.totalAmount}\n\nYour order has been confirmed and is being prepared for ${order.deliveryMethod}.`;
            break;
          case 'shipped':
            messageContent = `🚚 **Order Shipped**\n\n**Item:** ${order.listingTitle}\n**Order ID:** ${orderId}\n**Tracking Number:** ${trackingNumber || 'N/A'}\n\nYour order has been shipped and is on its way!`;
            break;
          case 'delivered':
            messageContent = `📦 **Order Delivered**\n\n**Item:** ${order.listingTitle}\n**Order ID:** ${orderId}\n\nYour order has been successfully delivered. Thank you for your purchase!`;
            break;
          case 'cancelled':
            messageContent = `❌ **Order Cancelled**\n\n**Item:** ${order.listingTitle}\n**Order ID:** ${orderId}\n\nYour order has been cancelled. ${notes ? `Reason: ${notes}` : ''}`;
            break;
        }

        if (messageContent) {
          const chatMessage = {
            senderId: user.uid,
            receiverId: order.buyerId,
            listingId: order.listingId,
            type: 'order_update',
            content: messageContent,
            orderId: orderId,
            createdAt: serverTimestamp(),
            read: false,
          };

          await addDoc(collection(db, "messages"), chatMessage);
        }
      }

      toast({
        title: "Success",
        description: `Order status updated to ${newStatus}.`,
      });

      // Clear status update form
      setStatusUpdates(prev => {
        const newState = { ...prev };
        delete newState[orderId];
        return newState;
      });

    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleStatusUpdateChange = (orderId: string, field: 'status' | 'trackingNumber' | 'notes', value: string) => {
    setStatusUpdates(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [field]: value
      }
    }));
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Incoming Orders
          </CardTitle>
          <CardDescription>Orders received on your listings</CardDescription>
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
          <ShoppingBag className="h-5 w-5" />
          Incoming Orders ({orders.length})
        </CardTitle>
        <CardDescription>
          Manage orders received on your listings
        </CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders received yet</h3>
            <p className="text-gray-500 mb-4">
              When buyers purchase your listings, orders will appear here.
            </p>
            <Button onClick={() => navigate('/listings?filter=my-listings')}>
              View My Listings
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
                        View Listing
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/messages?buyer=${order.buyerId}&listing=${order.listingId}`)}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Message
                      </Button>
                    </div>
                  </div>

                  {/* Buyer Information */}
                  <div className="bg-gray-50 rounded p-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-sm">Buyer Information</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <span className="ml-2 font-medium">{order.buyerName}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Email:</span>
                        <span className="ml-2">{order.buyerEmail}</span>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="bg-blue-50 rounded p-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">Shipping Address</span>
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
                      <p className="text-sm text-yellow-800">
                        <strong>Notes:</strong> {order.notes}
                      </p>
                    </div>
                  )}

                  {/* Order Management Actions */}
                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <div className="border-t pt-4">
                      <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Update Order Status
                      </h5>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <Label htmlFor={`status-${order.id}`} className="text-xs">Status</Label>
                          <Select
                            value={statusUpdates[order.id]?.status || order.status}
                            onValueChange={(value) => handleStatusUpdateChange(order.id, 'status', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="shipped">Shipped</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor={`tracking-${order.id}`} className="text-xs">Tracking Number (Optional)</Label>
                          <Input
                            id={`tracking-${order.id}`}
                            placeholder="Enter tracking number"
                            value={statusUpdates[order.id]?.trackingNumber || ''}
                            onChange={(e) => handleStatusUpdateChange(order.id, 'trackingNumber', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`notes-${order.id}`} className="text-xs">Notes (Optional)</Label>
                          <Textarea
                            id={`notes-${order.id}`}
                            placeholder="Add notes..."
                            value={statusUpdates[order.id]?.notes || ''}
                            onChange={(e) => handleStatusUpdateChange(order.id, 'notes', e.target.value)}
                            rows={1}
                          />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          const update = statusUpdates[order.id];
                          const newStatus = update?.status || order.status;
                          if (newStatus !== order.status) {
                            handleOrderStatusUpdate(
                              order.id,
                              newStatus,
                              update?.trackingNumber,
                              update?.notes
                            );
                          }
                        }}
                        disabled={!statusUpdates[order.id]?.status || statusUpdates[order.id]?.status === order.status || processingOrder === order.id}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Package className="h-3 w-3 mr-1" />
                        {processingOrder === order.id ? 'Updating...' : 'Update Status'}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
