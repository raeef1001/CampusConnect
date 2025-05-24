import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with the publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export { stripePromise };

// Stripe configuration
export const stripeConfig = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  secretKey: import.meta.env.STRIPE_SECRET_KEY,
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
