import { useState } from "react";
import { doc, getDoc, updateDoc, increment, addDoc, serverTimestamp, collection } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, ThumbsUp, Flag } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ReportUser } from "./ReportUser";
import { useOptimizedReviews, useOptimizedReviewSummary, useCreateReview } from "@/hooks/useOptimizedData";

interface ReviewSystemProps {
  sellerId: string;
  sellerName: string;
  currentListingId?: string;
  currentListingTitle?: string;
  showAddReview?: boolean;
}

export function OptimizedReviewSystem({ 
  sellerId, 
  sellerName, 
  currentListingId, 
  currentListingTitle,
  showAddReview = true 
}: ReviewSystemProps) {
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const { toast } = useToast();

  // Use optimized hooks for data fetching
  const { data: reviews = [], isLoading: reviewsLoading, error: reviewsError } = useOptimizedReviews(sellerId);
  const { data: reviewSummary, isLoading: summaryLoading } = useOptimizedReviewSummary(sellerId);
  const createReviewMutation = useCreateReview();

  const { averageRating = 0, totalReviews = 0, ratingDistribution = {} } = reviewSummary || {};

  const handleSubmitReview = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to leave a review.",
        variant: "destructive",
      });
      return;
    }

    if (user.uid === sellerId) {
      toast({
        title: "Cannot Review Yourself",
        description: "You cannot leave a review for your own listing.",
        variant: "destructive",
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (comment.trim().length < 10) {
      toast({
        title: "Comment Too Short",
        description: "Please write at least 10 characters in your review.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get reviewer info
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();

      // Prepare review data
      const reviewData = {
        reviewerId: user.uid,
        reviewerName: userData?.name || user.displayName || user.email?.split('@')[0] || "Anonymous",
        reviewerAvatar: userData?.avatar || user.photoURL,
        sellerId: sellerId,
        listingId: currentListingId || null,
        listingTitle: currentListingTitle || null,
        rating: rating,
        comment: comment.trim(),
        helpful: 0,
        verified: true,
      };

      // Use the mutation to create the review
      await createReviewMutation.mutateAsync(reviewData);

      // Update seller's rating in users collection
      const sellerRef = doc(db, "users", sellerId);
      const newAverageRating = totalReviews > 0 
        ? ((averageRating * totalReviews) + rating) / (totalReviews + 1)
        : rating;
      
      await updateDoc(sellerRef, {
        rating: Math.round(newAverageRating * 10) / 10,
        totalReviews: increment(1)
      });

      // Create notification for seller
      await addDoc(collection(db, "notifications"), {
        userId: sellerId,
        type: "review",
        message: `You received a ${rating}-star review from ${userData?.name || "a user"}!`,
        read: false,
        createdAt: serverTimestamp(),
        relatedId: currentListingId,
      });

      setShowReviewDialog(false);
      setRating(0);
      setComment("");
      
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderStars = (rating: number, interactive = false, onStarClick?: (star: number) => void) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            } ${interactive ? "cursor-pointer hover:text-yellow-400" : ""}`}
            onClick={() => interactive && onStarClick && onStarClick(star)}
          />
        ))}
      </div>
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Recently";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const canLeaveReview = () => {
    const user = auth.currentUser;
    if (!user || user.uid === sellerId) return false;
    
    // Check if user already reviewed this seller
    const existingReview = reviews.find(review => review.reviewerId === user.uid);
    return !existingReview;
  };

  const loading = reviewsLoading || summaryLoading;

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Reviews & Ratings</span>
            {showAddReview && canLeaveReview() && (
              <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Write Review
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Review {sellerName}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="rating">Rating</Label>
                      <div className="mt-2">
                        {renderStars(rating, true, setRating)}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="comment">Your Review</Label>
                      <Textarea
                        id="comment"
                        placeholder="Share your experience with this seller..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="mt-2"
                        rows={4}
                        maxLength={500}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        {comment.length}/500 characters
                      </p>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowReviewDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmitReview}
                        disabled={createReviewMutation.isPending || rating === 0}
                      >
                        {createReviewMutation.isPending ? "Submitting..." : "Submit Review"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {averageRating.toFixed(1)}
                </div>
                <div className="flex justify-center mb-1">
                  {renderStars(Math.round(averageRating))}
                </div>
                <div className="text-sm text-gray-500">
                  {totalReviews} review{totalReviews !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="flex-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingDistribution[star] || 0;
                  const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center space-x-2 text-sm">
                      <span className="w-3">{star}</span>
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-8 text-gray-500">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No reviews yet</p>
              <p className="text-sm text-gray-400">
                Be the first to review {sellerName}!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={review.reviewerAvatar} />
                      <AvatarFallback>
                        {review.reviewerName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold">{review.reviewerName}</p>
                          <div className="flex items-center space-x-2">
                            {renderStars(review.rating)}
                            {review.verified && (
                              <Badge variant="secondary" className="text-xs">
                                Verified
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {formatDate(review.createdAt)}
                          </p>
                          {review.listingTitle && (
                            <p className="text-xs text-gray-400">
                              for "{review.listingTitle}"
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-700 mb-3">{review.comment}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <button className="flex items-center space-x-1 hover:text-blue-600 transition-colors">
                          <ThumbsUp className="h-4 w-4" />
                          <span>Helpful ({review.helpful})</span>
                        </button>
                        <ReportUser
                          userId={review.reviewerId}
                          userName={review.reviewerName}
                          listingId={review.listingId}
                          listingTitle={review.listingTitle}
                          trigger={
                            <button className="flex items-center space-x-1 hover:text-red-600 transition-colors">
                              <Flag className="h-4 w-4" />
                              <span>Report</span>
                            </button>
                          }
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
