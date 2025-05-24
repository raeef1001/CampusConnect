import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, orderBy, where, onSnapshot, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { cacheUtils } from '@/lib/cache';
import { Listing } from '@/types/listing';
import { useToast } from '@/components/ui/use-toast';

// Query keys
export const QUERY_KEYS = {
  LISTINGS: 'listings',
  USER_LISTINGS: 'userListings',
  USER_PROFILE: 'userProfile',
  REVIEWS: 'reviews',
  REVIEW_SUMMARY: 'reviewSummary',
  NOTIFICATIONS: 'notifications',
  MESSAGES: 'messages',
  BOOKMARKS: 'bookmarks',
  BIDS: 'bids',
  ORDERS: 'orders',
} as const;

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  university: string;
  major?: string;
  bio?: string;
  avatar?: string;
  contact?: {
    email?: string;
    phone?: string;
    location?: string;
    displayLocation?: string;
  };
  listingsCount?: number;
  reviewsCount?: number;
  rating?: number;
}

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

// Optimized listings hook
export const useOptimizedListings = (filters?: any) => {
  return useQuery({
    queryKey: [QUERY_KEYS.LISTINGS, filters],
    queryFn: async (): Promise<Listing[]> => {
      // Try cache first
      const cachedListings = cacheUtils.getListings();
      if (cachedListings && !filters) {
        return cachedListings;
      }

      // Fetch from Firebase
      const listingsRef = collection(db, 'listings');
      let listingsQuery = query(listingsRef, orderBy('createdAt', 'desc'));

      const snapshot = await getDocs(listingsQuery);
      const listings: Listing[] = [];

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        
        // Get seller info with caching
        let sellerData = data.seller || {};
        const sellerId = data.sellerId || data.userId || data.createdBy || data.seller?.userId || '';
        
        if (sellerId && (!sellerData.name || sellerData.name === 'Unknown Seller')) {
          const cachedProfile = cacheUtils.getUserProfile(sellerId);
          if (cachedProfile) {
            sellerData = {
              userId: sellerId,
              name: cachedProfile.name,
              avatar: cachedProfile.avatar || '',
              university: cachedProfile.university,
              rating: cachedProfile.rating || 0,
            };
          } else {
            try {
              const userDoc = await getDoc(doc(db, 'users', sellerId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                sellerData = {
                  userId: sellerId,
                  name: userData.name || userData.email?.split('@')[0] || 'Unknown Seller',
                  avatar: userData.avatar || '',
                  university: userData.university || 'Unknown University',
                  rating: userData.rating || 0,
                };
                
                // Cache the user profile
                cacheUtils.setUserProfile(sellerId, userData as UserProfile);
              }
            } catch (error) {
              console.error('Error fetching seller profile:', error);
            }
          }
        }

        const listing: Listing = {
          id: docSnapshot.id,
          ...data,
          seller: sellerData,
        } as Listing;
        
        listings.push(listing);
      }

      // Cache the results
      cacheUtils.setListings(listings);
      
      return listings;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Optimized user listings hook
export const useOptimizedUserListings = (userId: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.USER_LISTINGS, userId],
    queryFn: async (): Promise<Listing[]> => {
      if (!userId) return [];

      // Try cache first
      const cachedListings = cacheUtils.getUserListings(userId);
      if (cachedListings) {
        return cachedListings;
      }

      // Fetch from Firebase
      const listingsRef = collection(db, 'listings');
      const snapshot = await getDocs(listingsRef);
      
      const userListings: Listing[] = [];
      
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const sellerId = data.sellerId || data.userId || data.createdBy || data.seller?.userId || '';
        
        if (sellerId === userId) {
          userListings.push({ id: docSnapshot.id, ...data } as Listing);
        }
      });

      // Cache the results
      cacheUtils.setUserListings(userId, userListings);
      
      return userListings;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Optimized user profile hook
export const useOptimizedUserProfile = (userId: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.USER_PROFILE, userId],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!userId) return null;

      // Try cache first
      const cachedProfile = cacheUtils.getUserProfile(userId);
      if (cachedProfile) {
        return cachedProfile;
      }

      // Fetch from Firebase
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return null;

      const profile = { uid: userId, ...userDoc.data() } as UserProfile;
      
      // Cache the result
      cacheUtils.setUserProfile(userId, profile);
      
      return profile;
    },
    enabled: !!userId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

// Optimized reviews hook
export const useOptimizedReviews = (sellerId: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.REVIEWS, sellerId],
    queryFn: async (): Promise<Review[]> => {
      if (!sellerId) return [];

      // Try cache first
      const cachedReviews = cacheUtils.getReviews(sellerId);
      if (cachedReviews) {
        return cachedReviews;
      }

      // Fetch from Firebase
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('sellerId', '==', sellerId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(reviewsQuery);
      const reviews: Review[] = [];
      
      snapshot.forEach((doc) => {
        reviews.push({ id: doc.id, ...doc.data() } as Review);
      });

      // Cache the results
      cacheUtils.setReviews(sellerId, reviews);
      
      return reviews;
    },
    enabled: !!sellerId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Optimized review summary hook
export const useOptimizedReviewSummary = (sellerId: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.REVIEW_SUMMARY, sellerId],
    queryFn: async () => {
      if (!sellerId) return { averageRating: 0, totalReviews: 0, ratingDistribution: {} };

      // Try cache first
      const cachedSummary = cacheUtils.getReviewSummary(sellerId);
      if (cachedSummary) {
        return cachedSummary;
      }

      // Fetch from Firebase
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('sellerId', '==', sellerId)
      );
      
      const snapshot = await getDocs(reviewsQuery);
      const reviews: Review[] = [];
      
      snapshot.forEach((doc) => {
        reviews.push({ id: doc.id, ...doc.data() } as Review);
      });

      const totalReviews = reviews.length;
      let averageRating = 0;
      const ratingDistribution: {[key: number]: number} = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      if (totalReviews > 0) {
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        averageRating = Math.round((totalRating / totalReviews) * 10) / 10;
        
        reviews.forEach(review => {
          ratingDistribution[review.rating] = (ratingDistribution[review.rating] || 0) + 1;
        });
      }

      const summary = { averageRating, totalReviews, ratingDistribution };
      
      // Cache the result
      cacheUtils.setReviewSummary(sellerId, summary);
      
      return summary;
    },
    enabled: !!sellerId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Optimized notifications hook
export const useOptimizedNotifications = (userId: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.NOTIFICATIONS, userId],
    queryFn: async () => {
      if (!userId) return [];

      // Try cache first
      const cachedNotifications = cacheUtils.getNotifications(userId);
      if (cachedNotifications) {
        return cachedNotifications;
      }

      // Fetch from Firebase
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(notificationsQuery);
      const notifications: any[] = [];
      
      snapshot.forEach((doc) => {
        notifications.push({ id: doc.id, ...doc.data() });
      });

      // Cache the results (shorter cache time for notifications)
      cacheUtils.setNotifications(userId, notifications);
      
      return notifications;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Mutation hooks with cache invalidation
export const useCreateListing = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (listingData: any) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const newListing = {
        ...listingData,
        sellerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'listings'), newListing);
      return { id: docRef.id, ...newListing };
    },
    onSuccess: (newListing) => {
      // Invalidate and refetch listings
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LISTINGS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_LISTINGS, auth.currentUser?.uid] });
      
      // Clear cache
      cacheUtils.invalidateListings();
      if (auth.currentUser?.uid) {
        cacheUtils.invalidateUserListings(auth.currentUser.uid);
      }

      toast({
        title: 'Success',
        description: 'Listing created successfully!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create listing. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, profileData }: { userId: string; profileData: any }) => {
      await updateDoc(doc(db, 'users', userId), profileData);
      return { userId, ...profileData };
    },
    onSuccess: (updatedProfile) => {
      // Invalidate and refetch user profile
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_PROFILE, updatedProfile.userId] });
      
      // Clear cache
      cacheUtils.invalidateUserProfile(updatedProfile.userId);

      toast({
        title: 'Success',
        description: 'Profile updated successfully!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useCreateReview = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (reviewData: any) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const newReview = {
        ...reviewData,
        reviewerId: user.uid,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'reviews'), newReview);
      return { id: docRef.id, ...newReview };
    },
    onSuccess: (newReview) => {
      // Invalidate and refetch reviews
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.REVIEWS, newReview.sellerId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.REVIEW_SUMMARY, newReview.sellerId] });
      
      // Clear cache
      cacheUtils.invalidateReviews(newReview.sellerId);

      toast({
        title: 'Success',
        description: 'Review submitted successfully!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to submit review. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

// Background data prefetching
export const usePrefetchData = () => {
  const queryClient = useQueryClient();

  const prefetchUserData = async (userId: string) => {
    // Prefetch user profile
    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.USER_PROFILE, userId],
      queryFn: async () => {
        const cachedProfile = cacheUtils.getUserProfile(userId);
        if (cachedProfile) return cachedProfile;

        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const profile = { uid: userId, ...userDoc.data() } as UserProfile;
          cacheUtils.setUserProfile(userId, profile);
          return profile;
        }
        return null;
      },
      staleTime: 30 * 60 * 1000,
    });

    // Prefetch user listings
    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.USER_LISTINGS, userId],
      queryFn: async () => {
        const cachedListings = cacheUtils.getUserListings(userId);
        if (cachedListings) return cachedListings;

        const listingsRef = collection(db, 'listings');
        const snapshot = await getDocs(listingsRef);
        const userListings: Listing[] = [];
        
        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          const sellerId = data.sellerId || data.userId || data.createdBy || data.seller?.userId || '';
          
          if (sellerId === userId) {
            userListings.push({ id: docSnapshot.id, ...data } as Listing);
          }
        });

        cacheUtils.setUserListings(userId, userListings);
        return userListings;
      },
      staleTime: 10 * 60 * 1000,
    });
  };

  const prefetchPopularListings = async () => {
    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.LISTINGS],
      queryFn: async () => {
        const cachedListings = cacheUtils.getListings();
        if (cachedListings) return cachedListings;

        const listingsRef = collection(db, 'listings');
        const listingsQuery = query(listingsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(listingsQuery);
        
        const listings: Listing[] = [];
        snapshot.forEach((doc) => {
          listings.push({ id: doc.id, ...doc.data() } as Listing);
        });

        cacheUtils.setListings(listings);
        return listings;
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  return { prefetchUserData, prefetchPopularListings };
};
