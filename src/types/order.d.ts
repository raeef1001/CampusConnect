// src/types/order.d.ts
export interface Order {
  id: string;
  listingId: string;
  listingTitle: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  deliveryMethod: 'pickup' | 'delivery' | 'shipping';
  estimatedDelivery?: {
    seconds: number;
    nanoseconds: number;
  };
  trackingNumber?: string;
  notes?: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  updatedAt: {
    seconds: number;
    nanoseconds: number;
  };
}

export interface OrderWithListing extends Order {
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

export interface OrderStatusUpdate {
  status: Order['status'];
  message?: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
}
