// src/types/listing.d.ts
export interface LocationData {
  id: string;
  lat: number;
  lng: number;
  type: 'main' | 'delivery' | 'pickup';
  name?: string;
  address?: string; // Added to store the human-readable address
}

<<<<<<< HEAD
=======
export interface VisibilitySettings {
  mode: 'university' | 'all_students';
  allowedUniversities?: string[]; // For university mode, specify which universities can see the listing
  description?: string; // Optional description for the visibility setting
}

>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
export interface Listing {
  id: string;
  title: string;
  description: string;
  price: string; // Changed from number to string
  image: string;
  imageUrl: string; // Add imageUrl property for database compatibility
  sellerId: string;
<<<<<<< HEAD
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
=======
  userId?: string; // Optional fallback field for seller ID
  createdBy?: string; // Optional fallback field for seller ID
  category: string;
  categories?: string[]; // Keep both, make categories optional
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
  condition: string;
  location: string; // Keep for backward compatibility
  locations?: LocationData[]; // New multi-location support
  deliveryRadius?: number; // Delivery radius in kilometers
  isAvailable?: boolean; // Product availability status
  availabilityStatus?: 'available' | 'sold' | 'reserved' | 'unavailable'; // Detailed availability status
<<<<<<< HEAD
=======
  visibilitySettings?: VisibilitySettings; // New visibility control settings
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  updatedAt?: {
    seconds: number;
    nanoseconds: number;
  };
<<<<<<< HEAD
  seller?: { // Make seller object optional
=======
  seller: { // Make seller object required
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
    name: string;
    avatar?: string;
    university: string;
    rating: number;
    userId: string;
  };
  isService?: boolean; // Added for service listings
}
