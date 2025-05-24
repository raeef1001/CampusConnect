export interface Service {
  id: string;
  title: string;
  description: string;
  category: ServiceCategory;
  hourlyRate: number;
  providerId: string;
  providerName: string;
  providerEmail: string;
  providerAvatar?: string;
  skills: string[];
  availability: {
    days: string[];
    timeSlots: string[];
  };
  location: {
    type: 'online' | 'in-person' | 'both';
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  rating: number;
  reviewCount: number;
  completedJobs: number;
  responseTime: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  requirements?: string;
  portfolio?: {
    images: string[];
    documents: string[];
  };
}

export type ServiceCategory = 
  | 'assignments'
  | 'notes'
  | 'lab-tasks'
  | 'tuition'
  | 'part-time-job'
  | 'task-offer';

export interface ServiceRequest {
  id: string;
  serviceId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  providerId: string;
  title: string;
  description: string;
  estimatedHours: number;
  totalAmount: number;
  hourlyRate: number;
  deadline: Date;
  status: ServiceRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  messages: ServiceMessage[];
  attachments?: string[];
}

export type ServiceRequestStatus = 
  | 'pending'
  | 'accepted'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export interface ServiceMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  attachments?: string[];
}

export interface ServiceReview {
  id: string;
  serviceId: string;
  requestId: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: Date;
}
