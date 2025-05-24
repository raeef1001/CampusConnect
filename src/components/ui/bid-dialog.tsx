import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DollarSign, MessageSquare, Clock, MapPin } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { addNotification } from '@/utils/notifications';

interface BidDialogProps {
  isOpen: boolean;
  onClose: () => void;
  listing: {
    id: string;
    title: string;
    price: number;
    sellerId: string;
    sellerName: string;
    category: string;
    condition?: string;
    imageUrl?: string;
  };
}

export const BidDialog: React.FC<BidDialogProps> = ({ isOpen, onClose, listing }) => {
  const [bidAmount, setBidAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to place a bid.",
        variant: "destructive",
      });
      return;
    }

    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      toast({
        title: "Invalid Bid Amount",
        description: "Please enter a valid bid amount.",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(bidAmount) >= listing.price) {
      toast({
        title: "Bid Too High",
        description: "Your bid should be lower than the asking price for negotiation.",
        variant: "destructive",
      });
      return;
    }

    // Validate that sellerId is not undefined
    if (!listing.sellerId || listing.sellerId.trim() === '') {
      console.error("Seller ID is undefined or empty:", listing);
      toast({
        title: "Error",
        description: "Unable to identify seller. Please contact support if this issue persists.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const bidData = {
        listingId: listing.id,
        listingTitle: listing.title,
        sellerId: listing.sellerId,
        buyerId: user.uid,
        buyerName: user.displayName || user.email?.split('@')[0] || 'Anonymous Buyer',
        buyerEmail: user.email,
        originalPrice: listing.price,
        bidAmount: parseFloat(bidAmount),
        message: message.trim(),
        status: 'pending', // pending, accepted, rejected, countered
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add bid to bids collection
      const bidRef = await addDoc(collection(db, "bids"), bidData);

      // Create a message in the chat system
      const chatMessage = {
        senderId: user.uid,
        receiverId: listing.sellerId,
        listingId: listing.id,
        type: 'bid',
        content: `🏷️ **New Bid Received**\n\n**Item:** ${listing.title}\n**Original Price:** $${listing.price}\n**Bid Amount:** $${bidAmount}\n**Savings:** $${(listing.price - parseFloat(bidAmount)).toFixed(2)}\n\n**Buyer's Message:**\n${message || 'No additional message provided.'}\n\n*This is a bidding message. You can accept, reject, or counter this offer.*`,
        bidId: bidRef.id,
        bidAmount: parseFloat(bidAmount),
        originalPrice: listing.price,
        createdAt: serverTimestamp(),
        read: false,
      };

      await addDoc(collection(db, "messages"), chatMessage);

      // Create notification for seller (with error handling to prevent hanging)
      try {
        await addNotification({
          userId: listing.sellerId,
          type: "bid",
          message: `New bid of $${bidAmount} received for "${listing.title}" from ${user.displayName || user.email?.split('@')[0]}`,
          relatedId: listing.id,
          bidId: bidRef.id,
        });
      } catch (notificationError) {
        console.error("Error creating notification (non-critical):", notificationError);
        // Don't fail the entire bid submission if notification fails
      }

      toast({
        title: "Bid Submitted Successfully!",
        description: `Your bid of $${bidAmount} has been sent to the seller.`,
      });

      // Reset form and close dialog
      setBidAmount('');
      setMessage('');
      onClose();

    } catch (error) {
      console.error("Error submitting bid:", error);
      toast({
        title: "Error",
        description: "Failed to submit bid. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const suggestedBids = [
    Math.round(listing.price * 0.8), // 20% off
    Math.round(listing.price * 0.85), // 15% off
    Math.round(listing.price * 0.9), // 10% off
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Place a Bid
          </DialogTitle>
          <DialogDescription>
            Make an offer for "{listing.title}" to start price negotiation with the seller.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Listing Summary */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{listing.title}</h4>
              <Badge variant="outline">{listing.category}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Asking Price:</span>
              <span className="font-bold text-lg text-green-600">${listing.price}</span>
            </div>
            {listing.condition && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Condition:</span>
                <Badge variant="secondary" className="text-xs">{listing.condition}</Badge>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Bid Amount */}
            <div className="space-y-2">
              <Label htmlFor="bid-amount">Your Bid Amount ($)</Label>
              <Input
                id="bid-amount"
                type="number"
                placeholder="Enter your offer"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                min="1"
                max={listing.price - 1}
                step="0.01"
                required
              />
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs text-gray-500">Quick suggestions:</span>
                {suggestedBids.map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-6 px-2"
                    onClick={() => setBidAmount(amount.toString())}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            </div>

            {/* Savings Display */}
            {bidAmount && parseFloat(bidAmount) > 0 && parseFloat(bidAmount) < listing.price && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-700">Potential Savings:</span>
                  <span className="font-bold text-green-800">
                    ${(listing.price - parseFloat(bidAmount)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="bid-message">Message to Seller (Optional)</Label>
              <Textarea
                id="bid-message"
                placeholder="Explain why you're interested, ask questions, or provide additional context for your offer..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-500">
                {message.length}/500 characters
              </p>
            </div>

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !bidAmount || parseFloat(bidAmount) <= 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Submit Bid
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BidDialog;
