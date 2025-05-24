import { auth } from '@/lib/firebase';
import { cacheUtils } from '@/lib/cache';
import { onAuthStateChanged } from 'firebase/auth';

class CacheWarmingService {
  private isWarming = false;
  private warmingQueue: Set<string> = new Set();

  constructor() {
    this.initializeAuthListener();
  }

  private initializeAuthListener() {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.warmUserCache(user.uid);
      } else {
        this.clearUserSpecificCache();
      }
    });
  }

  async warmUserCache(userId: string) {
    if (this.isWarming || this.warmingQueue.has(userId)) {
      return;
    }

    this.isWarming = true;
    this.warmingQueue.add(userId);

    try {
      console.log('🔥 Warming cache for user:', userId);

      // Warm user profile cache
      await this.warmUserProfile(userId);

      // Warm user listings cache
      await this.warmUserListings(userId);

      // Warm user reviews cache
      await this.warmUserReviews(userId);

      // Warm popular listings cache
      await this.warmPopularListings();

      console.log('✅ Cache warming completed for user:', userId);
    } catch (error) {
      console.error('❌ Cache warming failed:', error);
    } finally {
      this.isWarming = false;
      this.warmingQueue.delete(userId);
    }
  }

  private async warmUserProfile(userId: string) {
    try {
      // Check if already cached
      const cachedProfile = cacheUtils.getUserProfile(userId);
      if (cachedProfile) {
        console.log('📋 User profile already cached');
        return;
      }

      // Import Firebase functions dynamically to avoid circular dependencies
      const { db } = await import('@/lib/firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const profile = { uid: userId, ...userDoc.data() };
        cacheUtils.setUserProfile(userId, profile as any);
        console.log('📋 User profile cached');
      }
    } catch (error) {
      console.error('Failed to warm user profile cache:', error);
    }
  }

  private async warmUserListings(userId: string) {
    try {
      // Check if already cached
      const cachedListings = cacheUtils.getUserListings(userId);
      if (cachedListings) {
        console.log('📦 User listings already cached');
        return;
      }

      // Import Firebase functions dynamically
      const { db } = await import('@/lib/firebase');
      const { collection, getDocs } = await import('firebase/firestore');
      
      const listingsRef = collection(db, 'listings');
      const snapshot = await getDocs(listingsRef);
      
      const userListings: any[] = [];
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const sellerId = data.sellerId || data.userId || data.createdBy || data.seller?.userId || '';
        
        if (sellerId === userId) {
          userListings.push({ id: docSnapshot.id, ...data });
        }
      });

      cacheUtils.setUserListings(userId, userListings);
      console.log(`📦 User listings cached (${userListings.length} items)`);
    } catch (error) {
      console.error('Failed to warm user listings cache:', error);
    }
  }

  private async warmUserReviews(userId: string) {
    try {
      // Check if already cached
      const cachedReviews = cacheUtils.getReviews(userId);
      if (cachedReviews) {
        console.log('⭐ User reviews already cached');
        return;
      }

      // Import Firebase functions dynamically
      const { db } = await import('@/lib/firebase');
      const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
      
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('sellerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(reviewsQuery);
      const reviews: any[] = [];
      
      snapshot.forEach((doc) => {
        reviews.push({ id: doc.id, ...doc.data() });
      });

      cacheUtils.setReviews(userId, reviews);

      // Also cache review summary
      if (reviews.length > 0) {
        const totalReviews = reviews.length;
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = Math.round((totalRating / totalReviews) * 10) / 10;
        
        const ratingDistribution: {[key: number]: number} = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach(review => {
          ratingDistribution[review.rating] = (ratingDistribution[review.rating] || 0) + 1;
        });

        cacheUtils.setReviewSummary(userId, { averageRating, totalReviews, ratingDistribution });
      }

      console.log(`⭐ User reviews cached (${reviews.length} reviews)`);
    } catch (error) {
      console.error('Failed to warm user reviews cache:', error);
    }
  }

  private async warmPopularListings() {
    try {
      // Check if already cached
      const cachedListings = cacheUtils.getListings();
      if (cachedListings) {
        console.log('🔥 Popular listings already cached');
        return;
      }

      // Import Firebase functions dynamically
      const { db } = await import('@/lib/firebase');
      const { collection, query, orderBy, limit, getDocs, doc, getDoc } = await import('firebase/firestore');
      
      const listingsRef = collection(db, 'listings');
      const listingsQuery = query(listingsRef, orderBy('createdAt', 'desc'), limit(50)); // Cache top 50 recent listings
      const snapshot = await getDocs(listingsQuery);
      
      const listings: any[] = [];
      
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
                
                // Cache the user profile for future use
                cacheUtils.setUserProfile(sellerId, userData as any);
              }
            } catch (error) {
              console.error('Error fetching seller profile:', error);
            }
          }
        }

        const listing = {
          id: docSnapshot.id,
          ...data,
          seller: sellerData,
        };
        
        listings.push(listing);
      }

      cacheUtils.setListings(listings);
      console.log(`🔥 Popular listings cached (${listings.length} items)`);
    } catch (error) {
      console.error('Failed to warm popular listings cache:', error);
    }
  }

  private clearUserSpecificCache() {
    console.log('🧹 Clearing user-specific cache');
    // We could implement selective cache clearing here
    // For now, we'll let the cache expire naturally
  }

  // Method to warm cache for specific data types
  async warmSpecificData(type: 'listings' | 'profiles' | 'reviews', identifier?: string) {
    if (this.isWarming) {
      console.log('Cache warming already in progress');
      return;
    }

    this.isWarming = true;

    try {
      switch (type) {
        case 'listings':
          await this.warmPopularListings();
          break;
        case 'profiles':
          if (identifier) {
            await this.warmUserProfile(identifier);
          }
          break;
        case 'reviews':
          if (identifier) {
            await this.warmUserReviews(identifier);
          }
          break;
      }
    } catch (error) {
      console.error(`Failed to warm ${type} cache:`, error);
    } finally {
      this.isWarming = false;
    }
  }

  // Method to preload data for a specific user (useful for profile visits)
  async preloadUserData(userId: string) {
    if (userId && !this.warmingQueue.has(userId)) {
      // Run in background without blocking
      setTimeout(() => {
        this.warmUserCache(userId);
      }, 100);
    }
  }

  // Method to get cache statistics
  getCacheStats() {
    const { getCacheStats } = require('@/lib/cache');
    return getCacheStats();
  }

  // Method to clear all cache (useful for debugging)
  clearAllCache() {
    cacheUtils.clearAll();
    console.log('🧹 All cache cleared');
  }
}

// Create singleton instance
export const cacheWarmingService = new CacheWarmingService();

// Export for manual cache warming
export const warmCache = {
  user: (userId: string) => cacheWarmingService.warmUserCache(userId),
  listings: () => cacheWarmingService.warmSpecificData('listings'),
  profile: (userId: string) => cacheWarmingService.warmSpecificData('profiles', userId),
  reviews: (userId: string) => cacheWarmingService.warmSpecificData('reviews', userId),
  preloadUser: (userId: string) => cacheWarmingService.preloadUserData(userId),
  stats: () => cacheWarmingService.getCacheStats(),
  clear: () => cacheWarmingService.clearAllCache(),
};
