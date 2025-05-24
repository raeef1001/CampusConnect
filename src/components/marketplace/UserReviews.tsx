import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface UserReviewsProps {
  userId: string;
}

export function UserReviews({ userId }: UserReviewsProps) {
  const [receivedReviews, setReceivedReviews] = useState<Review[]>([]);
  const [givenReviews, setGivenReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    // Fetch reviews received by the user (as a seller)
    const receivedQuery = query(
      collection(db, "reviews"),
      where("sellerId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribeReceived = onSnapshot(receivedQuery, (snapshot) => {
      const reviewsData: Review[] = [];
      snapshot.forEach((doc) => {
        reviewsData.push({ id: doc.id, ...doc.data() } as Review);
      });
      
      setReceivedReviews(reviewsData);
      setTotalReviews(reviewsData.length);
      
      // Calculate average rating
      if (reviewsData.length > 0) {
        const avgRating = reviewsData.reduce((sum, review) => sum + review.rating, 0) / reviewsData.length;
        setAverageRating(Math.round(avgRating * 10) / 10);
      } else {
        setAverageRating(0);
      }
    });

    // Fetch reviews given by the user (as a buyer)
    const givenQuery = query(
      collection(db, "reviews"),
      where("reviewerId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribeGiven = onSnapshot(givenQuery, (snapshot) => {
      const reviewsData: Review[] = [];
      snapshot.forEach((doc) => {
        reviewsData.push({ id: doc.id, ...doc.data() } as Review);
      });
      
      setGivenReviews(reviewsData);
      setLoading(false);
    });

    return () => {
      unsubscribeReceived();
      unsubscribeGiven();
    };
  }, [userId]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
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

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Loading reviews...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary for Received Reviews */}
      {receivedReviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Rating Summary</CardTitle>
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
                  const count = receivedReviews.filter(r => r.rating === star).length;
                  const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center space-x-2 text-sm">
                      <span className="w-3">{star}</span>
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full"
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
      )}

      {/* Reviews Tabs */}
      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received">
            Reviews Received ({receivedReviews.length})
          </TabsTrigger>
          <TabsTrigger value="given">
            Reviews Given ({givenReviews.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-4">
          {receivedReviews.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No reviews received yet</p>
                <p className="text-sm text-gray-400">
                  Start selling to receive reviews from buyers!
                </p>
              </CardContent>
            </Card>
          ) : (
            receivedReviews.map((review) => (
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
                      <p className="text-gray-700">{review.comment}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="given" className="space-y-4">
          {givenReviews.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No reviews given yet</p>
                <p className="text-sm text-gray-400">
                  Purchase items and leave reviews for sellers!
                </p>
              </CardContent>
            </Card>
          ) : (
            givenReviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold">Review for Seller</p>
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
                      <p className="text-gray-700">{review.comment}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
