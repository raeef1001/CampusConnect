import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowRightLeft,
  MessageSquare,
  Eye,
  Trash2
} from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/components/ui/use-toast';
import { BidWithListing } from '@/types/bid';
import { useNavigate } from 'react-router-dom';

export function MyBids() {
  const [bids, setBids] = useState<BidWithListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingBid, setDeletingBid] = useState<string | null>(null);
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
      where("buyerId", "==", user.uid)
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
        console.error("Error fetching bids:", error);
        toast({
          title: "Error",
          description: "Failed to load your bids.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [toast]);

  const handleDeleteBid = async (bidId: string) => {
    if (!confirm("Are you sure you want to withdraw this bid?")) return;
    
    setDeletingBid(bidId);
    try {
      await deleteDoc(doc(db, "bids", bidId));
      toast({
        title: "Bid Withdrawn",
        description: "Your bid has been successfully withdrawn.",
      });
    } catch (error) {
      console.error("Error deleting bid:", error);
      toast({
        title: "Error",
        description: "Failed to withdraw bid. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingBid(null);
    }
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
            My Bids
          </CardTitle>
          <CardDescription>Bids you've placed on listings</CardDescription>
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
          My Bids ({bids.length})
        </CardTitle>
        <CardDescription>
          Track the status of bids you've placed on listings
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bids.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bids placed yet</h3>
            <p className="text-gray-500 mb-4">
              Start bidding on listings to see them here.
            </p>
            <Button onClick={() => navigate('/listings')}>
              Browse Listings
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {bids.map((bid) => (
                <div key={bid.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
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
                          <span>Original: <strong>${bid.originalPrice}</strong></span>
                          <span>Your Bid: <strong className="text-green-600">${bid.bidAmount}</strong></span>
                          <span>Savings: <strong className="text-blue-600">${(bid.originalPrice - bid.bidAmount).toFixed(2)}</strong></span>
                        </div>
                        {bid.counterOffer && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                            <p className="text-sm text-blue-800">
                              <strong>Counter Offer:</strong> ${bid.counterOffer.amount}
                            </p>
                            {bid.counterOffer.message && (
                              <p className="text-xs text-blue-700 mt-1">{bid.counterOffer.message}</p>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Placed on {formatDate(bid.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/listings/${bid.listingId}`)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      {bid.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteBid(bid.id)}
                          disabled={deletingBid === bid.id}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          {deletingBid === bid.id ? 'Withdrawing...' : 'Withdraw'}
                        </Button>
                      )}
                      {bid.status === 'countered' && (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/messages?listing=${bid.listingId}`)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Respond
                        </Button>
                      )}
                    </div>
                  </div>
                  {bid.message && (
                    <div className="mt-3 p-2 bg-gray-50 rounded">
                      <p className="text-sm text-gray-700">
                        <strong>Your message:</strong> {bid.message}
                      </p>
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
