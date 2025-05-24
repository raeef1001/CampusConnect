import { Timestamp, FieldValue } from "firebase/firestore";

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  createdAt: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  listingId?: string; 
  // Encryption field for last message
  encryptedLastMessage?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text?: string;
  image?: string;
  listingId?: string; 
  orderId?: string;
  cartId?: string;
  paymentStatus?: 'pending' | 'completed' | 'failed';
  createdAt: Timestamp | FieldValue;
  // Encryption fields
  encrypted?: boolean;
  encryptedText?: string;
  encryptedImage?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  avatar?: string;
  university?: string;
  rating?: number;
}

export interface Notification {
  userId: string;
  type: "listing" | "message" | "profile" | "system" | "bookmark" | "bid";
  message: string;
  relatedId?: string; // e.g., listingId, chatId, userId
  bidId?: string; // For bid-related notifications
  read: boolean;
  createdAt: Timestamp | FieldValue;
}
