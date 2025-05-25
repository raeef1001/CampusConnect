import { GoogleGenerativeAI, Part } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("VITE_GEMINI_API_KEY is not defined in environment variables.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export { model };

// Import the Listing interface from types
import { Listing } from "@/types/listing";
import { UserProfile, Message, Notification } from "@/types/chat"; // Import new types

// Enhanced function to generate AI response about listings with product recommendations
export async function generateListingResponse(
  userMessage: string,
  listings: Listing[],
  userProfiles?: UserProfile[], // Optional user profiles
  messages?: Message[], // Optional messages
  notifications?: Notification[], // Optional notifications
  imageFile?: File, // New optional parameter for image
  allListings?: Listing[] // New optional parameter for all listings for related product search
) {
  try {
    let imageBase64: string | undefined;
    let imageMimeType: string | undefined;

    if (imageFile) {
      imageBase64 = await fileToBase64(imageFile);
      imageMimeType = imageFile.type;
    }

    // Create a context about available listings
    const listingsContext = listings.map(listing => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      image: listing.image,
      imageUrl: listing.imageUrl,
      sellerId: listing.sellerId,
      category: listing.category,
      condition: listing.condition,
      location: listing.location || (listing.locations && listing.locations.length > 0 ? listing.locations[0].name : 'Unknown'),
      locations: listing.locations, // Include detailed location data
      deliveryRadius: listing.deliveryRadius,
      isAvailable: listing.isAvailable,
      availabilityStatus: listing.availabilityStatus,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      seller: listing.seller, // Include full seller object
      isService: listing.isService
    }));

    // Create context for user profiles, messages, and notifications if provided
    const userProfilesContext = userProfiles ? userProfiles.map(profile => ({
      uid: profile.uid,
      name: profile.name,
      university: profile.university,
      rating: profile.rating,
      // Exclude avatar for brevity in prompt, or include if relevant for AI
    })) : [];

    const messagesContext = messages ? messages.map(msg => ({
      id: msg.id,
      senderId: msg.senderId,
      text: msg.text,
      listingId: msg.listingId,
      createdAt: msg.createdAt,
    })) : [];

    const notificationsContext = notifications ? notifications.map(notif => ({
      userId: notif.userId,
      type: notif.type,
      message: notif.message,
      relatedId: notif.relatedId,
      read: notif.read,
      createdAt: notif.createdAt,
    })) : [];

    let prompt = `
You are a helpful AI assistant for CampusConnect, a student marketplace platform. You help users find products and services listed by other students. You can search listings by:
- Product title and description
- Categories
- Condition
- Location (e.g., specific university buildings, general areas)
- Seller's university
- Seller's rating
`;

    if (imageFile) {
      prompt += `
The user has also provided an image. Analyze the image in conjunction with their question.
`;
    }

    prompt += `
Current available listings:
${JSON.stringify(listingsContext, null, 2)}
`;

    if (userProfilesContext.length > 0) {
      prompt += `
Current user profiles:
${JSON.stringify(userProfilesContext, null, 2)}
`;
    }

    if (messagesContext.length > 0) {
      prompt += `
Current messages:
${JSON.stringify(messagesContext, null, 2)}
`;
    }

    if (notificationsContext.length > 0) {
      prompt += `
Current notifications:
${JSON.stringify(notificationsContext, null, 2)}
    `;
        }
    
    prompt += `
User question: "${userMessage}"

When responding, please follow these steps to ensure the best search results:
1.  **Analyze the user's question/query and the provided image (if any):** Identify key product names, categories, conditions, or other search terms.
2.  **Search \`listingsContext\`:** Thoroughly scan the provided \`listingsContext\` for listings that directly match the identified search terms in their \`title\`, \`description\`, or \`category\`.
3.  **Prioritize exact matches:** If an exact match is found (e.g., "red crew neck t-shirt" is in a listing's title or description), prioritize recommending that listing.
4.  **Suggest alternatives:** If no exact matches are found, then look for partial matches or closely related items within the \`listingsContext\` and suggest those as alternatives.
5.  **Include Listing IDs:** Always include the listing ID in your response using the format: [LISTING:id] for any recommended products.
`;

    if (imageFile && allListings) {
      prompt += `
After providing your initial response, if the image contains a product, also suggest related products from the \`allListings\` based on the image content.
`;
    }

    prompt += `
Please provide a helpful response about the available listings, user profiles, messages, or notifications. You can:
- Help users find specific products or services
- Compare different listings
- Provide information about prices, conditions, and sellers
- Suggest alternatives if exact matches aren't found
- Answer general questions about the marketplace
- Provide information about users based on their profiles
- Summarize recent messages or notifications
- Answer questions related to chat history or notification events

IMPORTANT FORMATTING RULES:
- DO NOT use any markdown formatting (no asterisks, underscores, or other markdown symbols)
- Use plain text only
- When recommending specific products, include the listing ID in your response using this format: [LISTING:id] where 'id' is the actual listing ID
- Keep responses concise and precise
- Use simple, clear language without special formatting

Example response format: "I found a red t-shirt [LISTING:abc123] that matches your request. It's in like new condition and priced at $10."

Keep your response conversational, helpful, and focused on the available data. If the user asks about something not available in the provided context, suggest they create a listing request or check back later.

If you're recommending multiple products, mention the most relevant ones and include their listing IDs.
`;

    const parts: Part[] = [
      { text: prompt }
    ];

    if (imageBase64 && imageMimeType) {
      parts.push({
        inlineData: {
          data: imageBase64,
          mimeType: imageMimeType
        }
      });
    }

    const result = await model.generateContent(parts);
    let responseText = (await result.response).text();

    // If an image is provided and allListings are available, find related products
    if (imageFile && allListings) {
      try {
        const relatedProductsResult = await analyzeImageForRelatedProducts(imageFile, allListings);
        if (relatedProductsResult.relatedListingIds.length > 0) {
          const relatedListings = getListingsByIds(relatedProductsResult.relatedListingIds, allListings);
          if (relatedListings.length > 0) {
            responseText += `\n\nBased on the image, you might also be interested in these similar products: `;
            responseText += relatedListings.map(l => `${l.title} [LISTING:${l.id}]`).join(', ');
            responseText += `.`;
          }
        } else if (relatedProductsResult.query) {
          responseText += `\n\nBased on the image, you might want to search for "${relatedProductsResult.query}".`;
        }
      } catch (relatedError) {
        console.error('Error finding related products:', relatedError);
        responseText += "\n\nI had trouble finding related products based on the image, but please feel free to search manually.";
      }
    }

    return responseText;
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
  category: string; // Changed to single string
  condition: string;
  suggestedPrice: number;
  confidence: number;
}

// Interface for related products analysis result
export interface RelatedProductsAnalysisResult {
  query: string; // A search query based on the image
  relatedListingIds: string[]; // IDs of related listings
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
3. The most appropriate single category from: Apparel, Electronics, Textbooks, Furniture, Home Goods, Sporting Goods, Academic Supplies, Vehicles, Other. Choose the most specific and relevant one.
4. The condition from: New, Like New, Good, Used, Fair
5. A suggested price in USD (consider this is a student marketplace, so prices should be reasonable)
6. Your confidence level (0-100) in the analysis

Please respond in this EXACT format:
TITLE: [title here]
DESCRIPTION: [description here]
CATEGORY: [category here]
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
    const categoryMatch = text.match(/CATEGORY:\s*(.+)/);
    const conditionMatch = text.match(/CONDITION:\s*(.+)/);
    const priceMatch = text.match(/PRICE:\s*(\d+)/);
    const confidenceMatch = text.match(/CONFIDENCE:\s*(\d+)/);

    if (titleMatch && descriptionMatch && categoryMatch && conditionMatch && priceMatch) {
      return {
        title: titleMatch[1].trim(),
        description: descriptionMatch[1].trim(),
        category: categoryMatch[1].trim(),
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

// Function to analyze image for related products
export async function analyzeImageForRelatedProducts(imageFile: File, allListings: Listing[]): Promise<RelatedProductsAnalysisResult> {
  try {
    const imageBase64 = await fileToBase64(imageFile);

    const listingsContext = allListings.map(listing => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      category: listing.category,
      condition: listing.condition,
      price: listing.price,
      imageUrl: listing.imageUrl,
    }));

    const prompt = `
Analyze the provided image and identify the main product shown. Then, based on the product in the image, suggest relevant search queries and identify up to 5 related product IDs from the provided list of current listings.

Current available listings:
${JSON.stringify(listingsContext, null, 2)}

Please respond in this EXACT format:
QUERY: [suggested search query based on image]
RELATED_LISTING_IDS: [id1, id2, id3, ...] (comma-separated, max 5 IDs)
CONFIDENCE: [number 0-100]

Example:
QUERY: red t-shirt
RELATED_LISTING_IDS: abc123, def456
CONFIDENCE: 90

If no related listings are found, provide a general query and an empty array for IDs.
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

    const queryMatch = text.match(/QUERY:\s*(.+)/);
    const relatedListingIdsMatch = text.match(/RELATED_LISTING_IDS:\s*\[?\s*(.*?)\s*\]?/); // More flexible regex
    const confidenceMatch = text.match(/CONFIDENCE:\s*(\d+)/);

    if (queryMatch) { // Only query is strictly required for a valid response
      const relatedListingIds = relatedListingIdsMatch && relatedListingIdsMatch[1]
        ? relatedListingIdsMatch[1]
            .split(',')
            .map(id => id.trim())
            .filter(id => id !== '') // Filter out empty strings
        : []; // Default to empty array if no match

      return {
        query: queryMatch[1].trim(),
        relatedListingIds: relatedListingIds,
        confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 75
      };
    } else {
      throw new Error('Failed to parse AI response for related products: Missing QUERY');
    }
  } catch (error) {
    console.error('Error analyzing image for related products:', error);
    throw new Error('Failed to find related products. Please try again.');
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
