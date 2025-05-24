// src/types/listing.d.ts
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
  location: string;
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
}
