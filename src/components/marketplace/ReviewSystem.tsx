import { useState, useEffect, useCallback } from "react";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment, limit, startAfter, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, ThumbsUp, Flag, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ReportUser } from "./ReportUser";

interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string;
  sellerId: string;
  listingId?: string;
  listingTitle?: string;
  rating: number;
  comment: string;
  createdAt: any;
  helpful: number;
  verified: boolean;
}

interface ReviewSystemProps {
  sellerId: string;
  sellerName: string;
  currentListingId?: string;
  currentListingTitle?: string;
  showAddReview?: boolean;
}

const REVIEWS_PER_PAGE = 10;

export function ReviewSystem({ 
  sellerId, 
  sellerName, 
  currentListingId, 
  currentListingTitle,
  showAddReview = true 
}: ReviewSystemProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [ratingDistribution, setRatingDistribution] = useState<{[key: number]: number}>({});
  const { toast } = useToast();

  // Combined fetch function to get both summary and reviews
  const fetchReviewsAndSummary = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      console.log("Fetching reviews for sellerId:", sellerId);

      // First, get all reviews for summary calculation
      const allReviewsQuery = query(
        collection(db, "reviews"),
        where("sellerId", "==", sellerId)
      );
      
      const allReviewsSnapshot = await getDocs(allReviewsQuery);
      const allReviewsData: Review[] = [];
      
      allReviewsSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log("Review data:", data);
        allReviewsData.push({ id: doc.id, ...data } as Review);
      });

      console.log("Total reviews found:", allReviewsData.length);

      // Update summary data
      setTotalReviews(allReviewsData.length);
      
      if (allReviewsData.length > 0) {
        const avgRating = allReviewsData.reduce((sum, review) => sum + review.rating, 0) / allReviewsData.length;
        setAverageRating(Math.round(avgRating * 10) / 10);
        
        // Calculate rating distribution
        const distribution: {[key: number]: number} = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        allReviewsData.forEach(review => {
          distribution[review.rating] = (distribution[review.rating] || 0) + 1;
        });
        setRatingDistribution(distribution);
      } else {
        setAverageRating(0);
        setRatingDistribution({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
      }

      // Now get paginated reviews for display
      let reviewsQuery = query(
        collection(db, "reviews"),
        where("sellerId", "==", sellerId),
        orderBy("createdAt", "desc"),
        limit(REVIEWS_PER_PAGE)
      );

      if (isLoadMore && lastDoc) {
        reviewsQuery = query(
          collection(db, "reviews"),
          where("sellerId", "==", sellerId),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(REVIEWS_PER_PAGE)
        );
      }

      const paginatedSnapshot = await getDocs(reviewsQuery);
      const newReviews: Review[] = [];
      
      paginatedSnapshot.forEach((doc) => {
        const data = doc.data();
        newReviews.push({ id: doc.id, ...data } as Review);
      });

      console.log("Paginated reviews found:", newReviews.length);

      if (isLoadMore) {
        setReviews(prev => [...prev, ...newReviews]);
      } else {
        setReviews(newReviews);
      }

      // Update pagination state
      if (paginatedSnapshot.docs.length > 0) {
        setLastDoc(paginatedSnapshot.docs[paginatedSnapshot.docs.length - 1]);
      }
      
      setHasMore(paginatedSnapshot.docs.length === REVIEWS_PER_PAGE);
      
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [sellerId, lastDoc]);

  useEffect(() => {
    if (sellerId) {
      console.log("useEffect triggered for sellerId:", sellerId);
      fetchReviewsAndSummary();
    }
  }, [sellerId, fetchReviewsAndSummary]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchReviewsAndSummary(true);
    }
  };

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

    setSubmitting(true);

    try {
      // Get reviewer info
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();

      // Add review
      const reviewData = {
        reviewerId: user.uid,
        reviewerName: userData?.name || user.displayName || user.email?.split('@')[0] || "Anonymous",
        reviewerAvatar: userData?.avatar || user.photoURL,
        sellerId: sellerId,
        listingId: currentListingId || null,
        listingTitle: currentListingTitle || null,
        rating: rating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
        helpful: 0,
        verified: true,
      };

      console.log("Submitting review:", reviewData);
      await addDoc(collection(db, "reviews"), reviewData);

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

      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback!",
      });

      setShowReviewDialog(false);
      setRating(0);
      setComment("");
      
      // Refresh data
      setLastDoc(null); // Reset pagination
      fetchReviewsAndSummary();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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

  // Debug info
  console.log("ReviewSystem render:", {
    sellerId,
    totalReviews,
    averageRating,
    reviewsLength: reviews.length,
    loading,
    ratingDistribution
  });

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
                        disabled={submitting || rating === 0}
                      >
                        {submitting ? "Submitting..." : "Submit Review"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 && totalReviews === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No reviews yet</p>
              <p className="text-sm text-gray-400">
                Be the first to review {sellerName}!
              </p>
            </CardContent>
          </Card>
        ) : reviews.length === 0 && totalReviews > 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading review details...</p>
              <p className="text-sm text-gray-400">
                Found {totalReviews} review{totalReviews !== 1 ? 's' : ''}, loading content...
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
            
            {/* Load More Button */}
            {hasMore && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="w-full"
                >
                  {loadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Loading more reviews...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Load More Reviews
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
