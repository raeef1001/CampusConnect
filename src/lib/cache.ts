import { Listing } from '@/types/listing';

// Cache configuration
const CACHE_KEYS = {
  USER_PROFILES: 'user_profiles',
  LISTINGS: 'listings',
  REVIEWS: 'reviews',
  NOTIFICATIONS: 'notifications',
  MESSAGES: 'messages',
  BOOKMARKS: 'bookmarks',
  BIDS: 'bids',
  ORDERS: 'orders',
} as const;

const CACHE_EXPIRY = {
  USER_PROFILES: 30 * 60 * 1000, // 30 minutes
  LISTINGS: 10 * 60 * 1000, // 10 minutes
  REVIEWS: 15 * 60 * 1000, // 15 minutes
  NOTIFICATIONS: 5 * 60 * 1000, // 5 minutes
  MESSAGES: 2 * 60 * 1000, // 2 minutes
  BOOKMARKS: 20 * 60 * 1000, // 20 minutes
  BIDS: 10 * 60 * 1000, // 10 minutes
  ORDERS: 10 * 60 * 1000, // 10 minutes
} as const;

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

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

// Memory cache for frequently accessed data
class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();

  set<T>(key: string, data: T, expiry: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() - item.timestamp > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

// Local storage cache for persistent data
class LocalStorageCache {
  private prefix = 'campus_connect_';

  set<T>(key: string, data: T, expiry: number): void {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiry,
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  get<T>(key: string): T | null {
    try {
      const itemStr = localStorage.getItem(this.prefix + key);
      if (!itemStr) return null;

      const item: CacheItem<T> = JSON.parse(itemStr);
      if (Date.now() - item.timestamp > item.expiry) {
        this.delete(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  }

  delete(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.warn('Failed to delete from localStorage:', error);
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  has(key: string): boolean {
    try {
      const itemStr = localStorage.getItem(this.prefix + key);
      if (!itemStr) return false;

      const item: CacheItem<any> = JSON.parse(itemStr);
      if (Date.now() - item.timestamp > item.expiry) {
        this.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}

// Cache instances
export const memoryCache = new MemoryCache();
export const localStorageCache = new LocalStorageCache();

// Cache utility functions
export const cacheUtils = {
  // User profiles
  setUserProfile: (userId: string, profile: UserProfile) => {
    const key = `${CACHE_KEYS.USER_PROFILES}_${userId}`;
    memoryCache.set(key, profile, CACHE_EXPIRY.USER_PROFILES);
    localStorageCache.set(key, profile, CACHE_EXPIRY.USER_PROFILES);
  },

  getUserProfile: (userId: string): UserProfile | null => {
    const key = `${CACHE_KEYS.USER_PROFILES}_${userId}`;
    return memoryCache.get(key) || localStorageCache.get(key);
  },

  // Listings
  setListings: (listings: Listing[]) => {
    const key = CACHE_KEYS.LISTINGS;
    memoryCache.set(key, listings, CACHE_EXPIRY.LISTINGS);
    localStorageCache.set(key, listings, CACHE_EXPIRY.LISTINGS);
  },

  getListings: (): Listing[] | null => {
    const key = CACHE_KEYS.LISTINGS;
    return memoryCache.get(key) || localStorageCache.get(key);
  },

  setUserListings: (userId: string, listings: Listing[]) => {
    const key = `${CACHE_KEYS.LISTINGS}_user_${userId}`;
    memoryCache.set(key, listings, CACHE_EXPIRY.LISTINGS);
    localStorageCache.set(key, listings, CACHE_EXPIRY.LISTINGS);
  },

  getUserListings: (userId: string): Listing[] | null => {
    const key = `${CACHE_KEYS.LISTINGS}_user_${userId}`;
    return memoryCache.get(key) || localStorageCache.get(key);
  },

  // Reviews
  setReviews: (sellerId: string, reviews: Review[]) => {
    const key = `${CACHE_KEYS.REVIEWS}_${sellerId}`;
    memoryCache.set(key, reviews, CACHE_EXPIRY.REVIEWS);
    localStorageCache.set(key, reviews, CACHE_EXPIRY.REVIEWS);
  },

  getReviews: (sellerId: string): Review[] | null => {
    const key = `${CACHE_KEYS.REVIEWS}_${sellerId}`;
    return memoryCache.get(key) || localStorageCache.get(key);
  },

  setReviewSummary: (sellerId: string, summary: { averageRating: number; totalReviews: number; ratingDistribution: {[key: number]: number} }) => {
    const key = `${CACHE_KEYS.REVIEWS}_summary_${sellerId}`;
    memoryCache.set(key, summary, CACHE_EXPIRY.REVIEWS);
    localStorageCache.set(key, summary, CACHE_EXPIRY.REVIEWS);
  },

  getReviewSummary: (sellerId: string): { averageRating: number; totalReviews: number; ratingDistribution: {[key: number]: number} } | null => {
    const key = `${CACHE_KEYS.REVIEWS}_summary_${sellerId}`;
    return memoryCache.get(key) || localStorageCache.get(key);
  },

  // Notifications
  setNotifications: (userId: string, notifications: any[]) => {
    const key = `${CACHE_KEYS.NOTIFICATIONS}_${userId}`;
    memoryCache.set(key, notifications, CACHE_EXPIRY.NOTIFICATIONS);
  },

  getNotifications: (userId: string): any[] | null => {
    const key = `${CACHE_KEYS.NOTIFICATIONS}_${userId}`;
    return memoryCache.get(key);
  },

  // Messages
  setMessages: (chatId: string, messages: any[]) => {
    const key = `${CACHE_KEYS.MESSAGES}_${chatId}`;
    memoryCache.set(key, messages, CACHE_EXPIRY.MESSAGES);
  },

  getMessages: (chatId: string): any[] | null => {
    const key = `${CACHE_KEYS.MESSAGES}_${chatId}`;
    return memoryCache.get(key);
  },

  // Bookmarks
  setBookmarks: (userId: string, bookmarks: string[]) => {
    const key = `${CACHE_KEYS.BOOKMARKS}_${userId}`;
    memoryCache.set(key, bookmarks, CACHE_EXPIRY.BOOKMARKS);
    localStorageCache.set(key, bookmarks, CACHE_EXPIRY.BOOKMARKS);
  },

  getBookmarks: (userId: string): string[] | null => {
    const key = `${CACHE_KEYS.BOOKMARKS}_${userId}`;
    return memoryCache.get(key) || localStorageCache.get(key);
  },

  // Bids
  setBids: (userId: string, bids: any[], type: 'sent' | 'received') => {
    const key = `${CACHE_KEYS.BIDS}_${type}_${userId}`;
    memoryCache.set(key, bids, CACHE_EXPIRY.BIDS);
    localStorageCache.set(key, bids, CACHE_EXPIRY.BIDS);
  },

  getBids: (userId: string, type: 'sent' | 'received'): any[] | null => {
    const key = `${CACHE_KEYS.BIDS}_${type}_${userId}`;
    return memoryCache.get(key) || localStorageCache.get(key);
  },

  // Orders
  setOrders: (userId: string, orders: any[], type: 'incoming' | 'outgoing') => {
    const key = `${CACHE_KEYS.ORDERS}_${type}_${userId}`;
    memoryCache.set(key, orders, CACHE_EXPIRY.ORDERS);
    localStorageCache.set(key, orders, CACHE_EXPIRY.ORDERS);
  },

  getOrders: (userId: string, type: 'incoming' | 'outgoing'): any[] | null => {
    const key = `${CACHE_KEYS.ORDERS}_${type}_${userId}`;
    return memoryCache.get(key) || localStorageCache.get(key);
  },

  // Cache invalidation
  invalidateUserProfile: (userId: string) => {
    const key = `${CACHE_KEYS.USER_PROFILES}_${userId}`;
    memoryCache.delete(key);
    localStorageCache.delete(key);
  },

  invalidateListings: () => {
    memoryCache.delete(CACHE_KEYS.LISTINGS);
    localStorageCache.delete(CACHE_KEYS.LISTINGS);
  },

  invalidateUserListings: (userId: string) => {
    const key = `${CACHE_KEYS.LISTINGS}_user_${userId}`;
    memoryCache.delete(key);
    localStorageCache.delete(key);
  },

  invalidateReviews: (sellerId: string) => {
    const key = `${CACHE_KEYS.REVIEWS}_${sellerId}`;
    const summaryKey = `${CACHE_KEYS.REVIEWS}_summary_${sellerId}`;
    memoryCache.delete(key);
    memoryCache.delete(summaryKey);
    localStorageCache.delete(key);
    localStorageCache.delete(summaryKey);
  },

  invalidateNotifications: (userId: string) => {
    const key = `${CACHE_KEYS.NOTIFICATIONS}_${userId}`;
    memoryCache.delete(key);
  },

  invalidateMessages: (chatId: string) => {
    const key = `${CACHE_KEYS.MESSAGES}_${chatId}`;
    memoryCache.delete(key);
  },

  invalidateBookmarks: (userId: string) => {
    const key = `${CACHE_KEYS.BOOKMARKS}_${userId}`;
    memoryCache.delete(key);
    localStorageCache.delete(key);
  },

  invalidateBids: (userId: string, type?: 'sent' | 'received') => {
    if (type) {
      const key = `${CACHE_KEYS.BIDS}_${type}_${userId}`;
      memoryCache.delete(key);
      localStorageCache.delete(key);
    } else {
      ['sent', 'received'].forEach(t => {
        const key = `${CACHE_KEYS.BIDS}_${t}_${userId}`;
        memoryCache.delete(key);
        localStorageCache.delete(key);
      });
    }
  },

  invalidateOrders: (userId: string, type?: 'incoming' | 'outgoing') => {
    if (type) {
      const key = `${CACHE_KEYS.ORDERS}_${type}_${userId}`;
      memoryCache.delete(key);
      localStorageCache.delete(key);
    } else {
      ['incoming', 'outgoing'].forEach(t => {
        const key = `${CACHE_KEYS.ORDERS}_${t}_${userId}`;
        memoryCache.delete(key);
        localStorageCache.delete(key);
      });
    }
  },

  // Clear all cache
  clearAll: () => {
    memoryCache.clear();
    localStorageCache.clear();
  },
};

// Background cache warming
export const warmCache = {
  // Preload user profile and related data
  preloadUserData: async (userId: string) => {
    // This will be implemented with actual Firebase calls
    console.log('Warming cache for user:', userId);
  },

  // Preload popular listings
  preloadPopularListings: async () => {
    console.log('Warming cache for popular listings');
  },
};

// Cache statistics for debugging
export const getCacheStats = () => {
  const memoryKeys = Array.from((memoryCache as any).cache.keys());
  const localStorageKeys = Object.keys(localStorage).filter(key => 
    key.startsWith('campus_connect_')
  );

  return {
    memory: {
      keys: memoryKeys.length,
      items: memoryKeys,
    },
    localStorage: {
      keys: localStorageKeys.length,
      items: localStorageKeys,
    },
  };
};
