// src/types/listing.d.ts
export interface LocationData {
  id: string;
  lat: number;
  lng: number;
  type: 'main' | 'delivery' | 'pickup';
  name?: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: string; // Changed from number to string
  image: string;
  imageUrl: string; // Add imageUrl property for database compatibility
  sellerId: string;
<<<<<<< HEAD

  userId?: string; // Optional fallback field for seller ID
  createdBy?: string; // Optional fallback field for seller ID
  category: string;

  categories: string[]; // Changed to array of strings
=======
  userId?: string; // Optional fallback field for seller ID
  createdBy?: string; // Optional fallback field for seller ID
  category: string;
>>>>>>> 6d5a776e3b0f50dc41009ebd9eec322ff44ed963
  condition: string;
  location: string; // Keep for backward compatibility
  locations?: LocationData[]; // New multi-location support
  deliveryRadius?: number; // Delivery radius in kilometers
  isAvailable?: boolean; // Product availability status
  availabilityStatus?: 'available' | 'sold' | 'reserved' | 'unavailable'; // Detailed availability status
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  updatedAt?: {
    seconds: number;
    nanoseconds: number;
  };
  seller?: { // Make seller object optional
    name: string;
    avatar?: string;
    university: string;
    rating: number;
    userId: string;
  };
  isService?: boolean; // Added for service listings
}
