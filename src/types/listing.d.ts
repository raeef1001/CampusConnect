// src/types/listing.d.ts
export interface LocationData {
  id: string;
  lat: number;
  lng: number;
  type: 'main' | 'delivery';
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
  category: string;
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
  seller: { // Add seller object
    name: string;
    avatar?: string;
    university: string;
    rating: number;
    userId: string;
  };
  isService?: boolean; // Added for service listings
}
