import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowRightLeft,
  MessageSquare,
  Eye,
  User,
  Mail,
  Calendar
} from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/components/ui/use-toast';
import { BidWithListing } from '@/types/bid';
import { useNavigate } from 'react-router-dom';
import { addNotification } from '@/utils/notifications';

export function ReceivedBids() {
  const [bids, setBids] = useState<BidWithListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingBid, setProcessingBid] = useState<string | null>(null);
  const [counterOffers, setCounterOffers] = useState<{ [key: string]: { amount: string; message: string } }>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const bidsQuery = query(
      collection(db, "bids"),
      where("sellerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(bidsQuery, async (snapshot) => {
      try {
        const bidsList: BidWithListing[] = [];
        
        for (const docSnapshot of snapshot.docs) {
          const bidData = { id: docSnapshot.id, ...docSnapshot.data() } as BidWithListing;
          
          // Fetch listing details
          try {
            const listingDoc = await getDoc(doc(db, "listings", bidData.listingId));
            if (listingDoc.exists()) {
              bidData.listing = {
                id: listingDoc.id,
                ...listingDoc.data()
              } as BidWithListing['listing'];
            }
          } catch (error) {
            console.error("Error fetching listing for bid:", error);
          }
          
          bidsList.push(bidData);
        }
        
        // Sort bids by createdAt in descending order (newest first)
        bidsList.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });
        
        setBids(bidsList);
      } catch (error) {
        console.error("Error fetching received bids:", error);
        toast({
          title: "Error",
          description: "Failed to load received bids.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [toast]);

  const handleBidAction = async (bidId: string, action: 'accept' | 'reject', counterOffer?: { amount: number; message: string }) => {
    setProcessingBid(bidId);
    
    try {
      const bid = bids.find(b => b.id === bidId);
      if (!bid) return;

      const updateData: any = {
        status: action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'countered',
        updatedAt: serverTimestamp(),
      };

      if (counterOffer) {
        updateData.status = 'countered';
        updateData.counterOffer = {
          amount: counterOffer.amount,
          message: counterOffer.message,
          createdAt: serverTimestamp(),
        };
      }

      await updateDoc(doc(db, "bids", bidId), updateData);

      // Create notification for buyer
      let notificationMessage = '';
      if (action === 'accept') {
        notificationMessage = `Your bid of $${bid.bidAmount} for "${bid.listingTitle}" has been accepted!`;
      } else if (action === 'reject') {
        notificationMessage = `Your bid of $${bid.bidAmount} for "${bid.listingTitle}" has been declined.`;
      } else if (counterOffer) {
        notificationMessage = `Counter offer of $${counterOffer.amount} received for "${bid.listingTitle}".`;
      }

      try {
        await addNotification({
          userId: bid.buyerId,
          type: "bid",
          message: notificationMessage,
          relatedId: bid.listingId,
          bidId: bidId,
        });
      } catch (notificationError) {
        console.error("Error creating notification:", notificationError);
      }

      // Create a message in the chat system
      const user = auth.currentUser;
      if (user) {
        let messageContent = '';
        if (action === 'accept') {
          messageContent = `🎉 **Bid Accepted!**\n\n**Item:** ${bid.listingTitle}\n**Accepted Bid:** $${bid.bidAmount}\n\nCongratulations! Your bid has been accepted. Please contact the seller to arrange payment and pickup/delivery.`;
        } else if (action === 'reject') {
          messageContent = `❌ **Bid Declined**\n\n**Item:** ${bid.listingTitle}\n**Declined Bid:** $${bid.bidAmount}\n\nThank you for your interest. The seller has decided not to accept this bid at this time.`;
        } else if (counterOffer) {
          messageContent = `🔄 **Counter Offer**\n\n**Item:** ${bid.listingTitle}\n**Your Original Bid:** $${bid.bidAmount}\n**Counter Offer:** $${counterOffer.amount}\n**Savings from Original Price:** $${(bid.originalPrice - counterOffer.amount).toFixed(2)}\n\n**Seller's Message:**\n${counterOffer.message || 'No additional message provided.'}\n\n*You can accept this counter offer or negotiate further.*`;
        }

        const chatMessage = {
          senderId: user.uid,
          receiverId: bid.buyerId,
          listingId: bid.listingId,
          type: 'bid_response',
          content: messageContent,
          bidId: bidId,
          bidAmount: counterOffer ? counterOffer.amount : bid.bidAmount,
          originalPrice: bid.originalPrice,
          createdAt: serverTimestamp(),
          read: false,
        };

        await addDoc(collection(db, "messages"), chatMessage);
      }

      toast({
        title: "Success",
        description: `Bid ${action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'countered'} successfully!`,
      });

      // Clear counter offer form
      if (counterOffer) {
        setCounterOffers(prev => {
          const newState = { ...prev };
          delete newState[bidId];
          return newState;
        });
      }

    } catch (error) {
      console.error("Error updating bid:", error);
      toast({
        title: "Error",
        description: "Failed to update bid. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingBid(null);
    }
  };

  const handleCounterOfferChange = (bidId: string, field: 'amount' | 'message', value: string) => {
    setCounterOffers(prev => ({
      ...prev,
      [bidId]: {
        ...prev[bidId],
        [field]: value
      }
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'countered':
        return <ArrowRightLeft className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'countered':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Received Bids
          </CardTitle>
          <CardDescription>Bids received on your listings</CardDescription>
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
          <DollarSign className="h-5 w-5" />
          Received Bids ({bids.length})
        </CardTitle>
        <CardDescription>
          Manage bids received on your listings
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bids.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bids received yet</h3>
            <p className="text-gray-500 mb-4">
              When buyers place bids on your listings, they'll appear here.
            </p>
            <Button onClick={() => navigate('/listings?filter=my-listings')}>
              View My Listings
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-6">
              {bids.map((bid) => (
                <div key={bid.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3 flex-1">
                      {bid.listing?.imageUrl && (
                        <img
                          src={bid.listing.imageUrl}
                          alt={bid.listingTitle}
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{bid.listingTitle}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {bid.listing?.category || 'Unknown'}
                          </Badge>
                          <Badge className={`text-xs ${getStatusColor(bid.status)}`}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(bid.status)}
                              {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                            </span>
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span>Your Price: <strong>${bid.originalPrice}</strong></span>
                          <span>Bid Amount: <strong className="text-green-600">${bid.bidAmount}</strong></span>
                          <span>Difference: <strong className="text-red-600">-${(bid.originalPrice - bid.bidAmount).toFixed(2)}</strong></span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Received on {formatDate(bid.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/listings/${bid.listingId}`)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Listing
                    </Button>
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
                        <span className="ml-2 font-medium">{bid.buyerName}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Email:</span>
                        <span className="ml-2">{bid.buyerEmail}</span>
                      </div>
                    </div>
                  </div>

                  {/* Buyer's Message */}
                  {bid.message && (
                    <div className="bg-blue-50 rounded p-3 mb-4">
                      <p className="text-sm text-blue-800">
                        <strong>Buyer's message:</strong> {bid.message}
                      </p>
                    </div>
                  )}

                  {/* Counter Offer Display */}
                  {bid.counterOffer && (
                    <div className="bg-blue-50 rounded p-3 mb-4 border border-blue-200">
                      <p className="text-sm text-blue-800 mb-1">
                        <strong>Your Counter Offer:</strong> ${bid.counterOffer.amount}
                      </p>
                      {bid.counterOffer.message && (
                        <p className="text-xs text-blue-700">{bid.counterOffer.message}</p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {bid.status === 'pending' && (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleBidAction(bid.id, 'accept')}
                          disabled={processingBid === bid.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Accept Bid
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBidAction(bid.id, 'reject')}
                          disabled={processingBid === bid.id}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/messages?buyer=${bid.buyerId}&listing=${bid.listingId}`)}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Message Buyer
                        </Button>
                      </div>

                      {/* Counter Offer Form */}
                      <div className="border-t pt-4">
                        <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
                          <ArrowRightLeft className="h-4 w-4" />
                          Make Counter Offer
                        </h5>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <Label htmlFor={`counter-amount-${bid.id}`} className="text-xs">Counter Amount ($)</Label>
                            <Input
                              id={`counter-amount-${bid.id}`}
                              type="number"
                              placeholder="Enter counter offer"
                              value={counterOffers[bid.id]?.amount || ''}
                              onChange={(e) => handleCounterOfferChange(bid.id, 'amount', e.target.value)}
                              min={bid.bidAmount}
                              max={bid.originalPrice}
                              step="0.01"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`counter-message-${bid.id}`} className="text-xs">Message (Optional)</Label>
                            <Textarea
                              id={`counter-message-${bid.id}`}
                              placeholder="Explain your counter offer..."
                              value={counterOffers[bid.id]?.message || ''}
                              onChange={(e) => handleCounterOfferChange(bid.id, 'message', e.target.value)}
                              rows={2}
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            const counterOffer = counterOffers[bid.id];
                            if (counterOffer?.amount) {
                              handleBidAction(bid.id, 'reject', {
                                amount: parseFloat(counterOffer.amount),
                                message: counterOffer.message || ''
                              });
                            }
                          }}
                          disabled={!counterOffers[bid.id]?.amount || processingBid === bid.id}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <ArrowRightLeft className="h-3 w-3 mr-1" />
                          Send Counter Offer
                        </Button>
                      </div>
                    </div>
                  )}

                  {bid.status !== 'pending' && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/messages?buyer=${bid.buyerId}&listing=${bid.listingId}`)}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Message Buyer
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
