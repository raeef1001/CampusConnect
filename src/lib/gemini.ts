import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("VITE_GEMINI_API_KEY is not defined in environment variables.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export { model };

// Import the Listing interface from types
import { Listing } from "@/types/listing";

// Enhanced function to generate AI response about listings with product recommendations
export async function generateListingResponse(userMessage: string, listings: Listing[]) {
  try {
    // Create a context about available listings
    const listingsContext = listings.map(listing => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      categories: listing.categories, // Use categories array
      condition: listing.condition,
      seller: listing.seller?.name || 'Unknown',
      university: listing.seller?.university || 'Unknown'
    }));

    const prompt = `
You are a helpful AI assistant for CampusConnect, a student marketplace platform. You help users find products and services listed by other students.

Current available listings:
${JSON.stringify(listingsContext, null, 2)}

User question: "${userMessage}"

Please provide a helpful response about the available listings. You can:
- Help users find specific products or services
- Compare different listings
- Provide information about prices, conditions, and sellers
- Suggest alternatives if exact matches aren't found
- Answer general questions about the marketplace

IMPORTANT FORMATTING RULES:
- DO NOT use any markdown formatting (no asterisks, underscores, or other markdown symbols)
- Use plain text only
- When recommending specific products, include the listing ID in your response using this format: [LISTING:id] where 'id' is the actual listing ID
- Keep responses concise and precise
- Use simple, clear language without special formatting

Example response format: "I found a red t-shirt [LISTING:abc123] that matches your request. It's in like new condition and priced at $10."

Keep your response conversational, helpful, and focused on the available listings. If the user asks about something not available in the listings, suggest they create a listing request or check back later.

If you're recommending multiple products, mention the most relevant ones and include their listing IDs.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating AI response:', error);
    return "I'm sorry, I'm having trouble processing your request right now. Please try again later.";
  }
}

// Function to extract listing IDs from AI response
export function extractListingIds(text: string): string[] {
  const regex = /\[LISTING:([^\]]+)\]/g;
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

// Function to get listings by IDs
export function getListingsByIds(listingIds: string[], allListings: Listing[]): Listing[] {
  return allListings.filter(listing => listingIds.includes(listing.id));
}

// Interface for image analysis result
export interface ImageAnalysisResult {
  title: string;
  description: string;
  categories: string[]; // Changed to array of strings
  condition: string;
  suggestedPrice: number;
  confidence: number;
}

// Function to analyze image and generate listing details
export async function analyzeImageForListing(imageFile: File): Promise<ImageAnalysisResult> {
  try {
    // Convert image to base64
    const imageBase64 = await fileToBase64(imageFile);
    
    const prompt = `
Analyze this image and create a marketplace listing for a student marketplace platform. Based on what you see in the image, provide:

1. A clear, descriptive title (max 60 characters)
2. A detailed description (2-3 sentences)
3. The most appropriate categories from: Apparel, Electronics, Textbooks, Furniture, Home Goods, Sporting Goods, Academic Supplies, Vehicles, Other. Provide up to 3 categories, comma-separated, choosing the most specific and relevant ones.
4. The condition from: New, Like New, Good, Used, Fair
5. A suggested price in USD (consider this is a student marketplace, so prices should be reasonable)
6. Your confidence level (0-100) in the analysis

Please respond in this EXACT format:
TITLE: [title here]
DESCRIPTION: [description here]
CATEGORIES: [category1, category2, ...]
CONDITION: [condition here]
PRICE: [number only]
CONFIDENCE: [number 0-100]

Be specific about what you see in the image. If it's a textbook, include the subject or title if visible. If it's electronics, mention the brand and model if identifiable. For furniture, describe the type and apparent condition.
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: imageFile.type
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();

    // Parse the response
    const titleMatch = text.match(/TITLE:\s*(.+)/);
    const descriptionMatch = text.match(/DESCRIPTION:\s*(.+)/);
    const categoriesMatch = text.match(/CATEGORIES:\s*(?:\[(.+)\]|(.+))/); // Make brackets optional
    const conditionMatch = text.match(/CONDITION:\s*(.+)/);
    const priceMatch = text.match(/PRICE:\s*(\d+)/);
    const confidenceMatch = text.match(/CONFIDENCE:\s*(\d+)/);

    if (titleMatch && descriptionMatch && categoriesMatch && conditionMatch && priceMatch) {
      let categories: string[] = [];
      if (categoriesMatch[1]) { // Matched with brackets
        categories = categoriesMatch[1].split(',').map(cat => cat.trim());
      } else if (categoriesMatch[2]) { // Matched without brackets
        categories = [categoriesMatch[2].trim()];
      }

      return {
        title: titleMatch[1].trim(),
        description: descriptionMatch[1].trim(),
        categories: categories,
        condition: conditionMatch[1].trim(),
        suggestedPrice: parseInt(priceMatch[1]),
        confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 75
      };
    } else {
      throw new Error('Failed to parse AI response');
    }
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw new Error('Failed to analyze image. Please try again or fill in the details manually.');
  }
}

// Helper function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get just the base64 data
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}
