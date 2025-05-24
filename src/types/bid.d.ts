// src/types/bid.d.ts
export interface Bid {
  id: string;
  listingId: string;
  listingTitle: string;
  sellerId: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  originalPrice: number;
  bidAmount: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  updatedAt: {
    seconds: number;
    nanoseconds: number;
  };
  counterOffer?: {
    amount: number;
    message: string;
    createdAt: {
      seconds: number;
      nanoseconds: number;
    };
  };
}

export interface BidWithListing extends Bid {
  listing?: {
    id: string;
    title: string;
    imageUrl: string;
    category: string;
    condition?: string;
    price: number;
    sellerId: string;
    isAvailable: boolean;
  };
}
