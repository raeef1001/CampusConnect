import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with the publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export { stripePromise };

// Stripe configuration with full API access
export const stripeConfig = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  secretKey: import.meta.env.STRIPE_SECRET_KEY,
  apiVersion: '2024-11-20.acacia' as const,
  maxNetworkRetries: 3,
  timeout: 30000,
};

// Helper function to format price for Stripe (convert to cents)
export const formatPriceForStripe = (price: string | number): number => {
  const numericPrice = typeof price === 'string' 
    ? parseFloat(price.replace(/[^0-9.]/g, '')) 
    : price;
  return Math.round(numericPrice * 100); // Convert to cents
};

// Helper function to format price for display
export const formatPriceForDisplay = (priceInCents: number): string => {
  return (priceInCents / 100).toFixed(2);
};

// Enhanced Stripe API utilities for full access
export const stripeUtils = {
  // Payment Intent utilities
  createPaymentIntent: async (amount: number, currency = 'usd', metadata = {}) => {
    const response = await fetch('/api/stripe/payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency, metadata }),
    });
    return response.json();
  },

  // Customer utilities
  createCustomer: async (email: string, name?: string, metadata = {}) => {
    const response = await fetch('/api/stripe/customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, metadata }),
    });
    return response.json();
  },

  // Subscription utilities
  createSubscription: async (customerId: string, priceId: string, metadata = {}) => {
    const response = await fetch('/api/stripe/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, priceId, metadata }),
    });
    return response.json();
  },

  // Product utilities
  createProduct: async (name: string, description?: string, metadata = {}) => {
    const response = await fetch('/api/stripe/product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, metadata }),
    });
    return response.json();
  },

  // Price utilities
  createPrice: async (productId: string, unitAmount: number, currency = 'usd', recurring?: any) => {
    const response = await fetch('/api/stripe/price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, unitAmount, currency, recurring }),
    });
    return response.json();
  },

  // Webhook utilities
  verifyWebhookSignature: (payload: string, signature: string, secret: string) => {
    // This would be implemented on the server side
    return fetch('/api/stripe/verify-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload, signature, secret }),
    });
  },

  // Refund utilities
  createRefund: async (paymentIntentId: string, amount?: number, reason?: string) => {
    const response = await fetch('/api/stripe/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId, amount, reason }),
    });
    return response.json();
  },

  // Transfer utilities (for marketplace functionality)
  createTransfer: async (amount: number, destination: string, currency = 'usd') => {
    const response = await fetch('/api/stripe/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, destination, currency }),
    });
    return response.json();
  },

  // Account utilities (for Connect)
  createConnectAccount: async (type: 'express' | 'standard' | 'custom', email?: string) => {
    const response = await fetch('/api/stripe/connect-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, email }),
    });
    return response.json();
  },
};

// Stripe webhook event types for full API coverage
export const STRIPE_WEBHOOK_EVENTS = {
  PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
  PAYMENT_INTENT_PAYMENT_FAILED: 'payment_intent.payment_failed',
  CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
  SUBSCRIPTION_DELETED: 'subscription.deleted',
  INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  ACCOUNT_UPDATED: 'account.updated',
  TRANSFER_CREATED: 'transfer.created',
} as const;

// Error handling utilities
export const handleStripeError = (error: any) => {
  console.error('Stripe Error:', error);
  
  if (error.type === 'StripeCardError') {
    return { error: 'Your card was declined.' };
  } else if (error.type === 'StripeRateLimitError') {
    return { error: 'Too many requests made to the API too quickly.' };
  } else if (error.type === 'StripeInvalidRequestError') {
    return { error: 'Invalid parameters were supplied to Stripe\'s API.' };
  } else if (error.type === 'StripeAPIError') {
    return { error: 'An error occurred internally with Stripe\'s API.' };
  } else if (error.type === 'StripeConnectionError') {
    return { error: 'Some kind of error occurred during the HTTPS communication.' };
  } else if (error.type === 'StripeAuthenticationError') {
    return { error: 'You probably used an incorrect API key.' };
  } else {
    return { error: 'Something went wrong. Please try again.' };
  }
};
