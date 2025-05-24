// src/types/listing.d.ts
export interface LocationData {
  id: string;
  lat: number;
  lng: number;
  type: 'main' | 'delivery' | 'pickup';
  name?: string;
  address?: string; // Added to store the human-readable address
}

export interface VisibilitySettings {
  mode: 'university' | 'all_students';
  allowedUniversities?: string[]; // For university mode, specify which universities can see the listing
  description?: string; // Optional description for the visibility setting
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: string; // Changed from number to string
  image: string;
  imageUrl: string; // Add imageUrl property for database compatibility
  sellerId: string;
  userId?: string; // Optional fallback field for seller ID
  createdBy?: string; // Optional fallback field for seller ID
  category: string;
<<<<<<< HEAD
=======
  categories: string[]; // Changed to array of strings
>>>>>>> bb7217a54ab15460e12023f2cf354ab72a9bbc86
  condition: string;
  location: string; // Keep for backward compatibility
  locations?: LocationData[]; // New multi-location support
  deliveryRadius?: number; // Delivery radius in kilometers
  isAvailable?: boolean; // Product availability status
  availabilityStatus?: 'available' | 'sold' | 'reserved' | 'unavailable'; // Detailed availability status
  visibilitySettings?: VisibilitySettings; // New visibility control settings
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  updatedAt?: {
    seconds: number;
    nanoseconds: number;
  };
  seller: { // Make seller object required
    name: string;
    avatar?: string;
    university: string;
    rating: number;
    userId: string;
  };
  isService?: boolean; // Added for service listings
}
