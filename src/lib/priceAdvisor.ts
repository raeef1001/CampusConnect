import { db } from './firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { generateListingResponse } from './gemini';

export interface PriceAnalysis {
  suggestedPrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  confidence: 'High' | 'Medium' | 'Low';
  reasoning: string;
  similarListings: Array<{
    title: string;
    price: number;
    condition: string;
    daysAgo: number;
  }>;
}

export async function analyzePriceForListing(
  title: string,
  category: string,
  condition: string,
  description: string
): Promise<PriceAnalysis> {
  try {
    // Fetch similar listings from the same category
    const categoryQuery = query(
      collection(db, "listings"),
      where("category", "==", category),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const categorySnapshot = await getDocs(categoryQuery);
    const categoryListings = categorySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        price: data.price || 0,
        condition: data.condition || '',
        category: data.category || '',
        description: data.description || '',
        createdAt: data.createdAt?.toDate() || new Date(),
        ...data
      };
    });

    // Filter for more similar items based on title keywords
    const titleKeywords = title.toLowerCase().split(' ').filter(word => word.length > 2);
    const similarListings = categoryListings.filter(listing => {
      const listingTitle = listing.title?.toLowerCase() || '';
      return titleKeywords.some(keyword => listingTitle.includes(keyword));
    });

    // If we have similar listings, analyze them
    if (similarListings.length > 0) {
      const prices = similarListings.map(listing => listing.price).filter(price => price > 0);
      
      if (prices.length > 0) {
        const sortedPrices = prices.sort((a, b) => a - b);
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
        const minPrice = Math.min(...sortedPrices);
        const maxPrice = Math.max(...sortedPrices);

        // Adjust price based on condition
        const conditionMultiplier = getConditionMultiplier(condition);
        const suggestedPrice = Math.round((avgPrice + medianPrice) / 2 * conditionMultiplier);

        // Calculate confidence based on data availability
        let confidence: 'High' | 'Medium' | 'Low' = 'Low';
        if (similarListings.length >= 10) confidence = 'High';
        else if (similarListings.length >= 5) confidence = 'Medium';

        // Prepare similar listings for display
        const recentSimilar = similarListings
          .slice(0, 5)
          .map(listing => ({
            title: listing.title || 'Unknown',
            price: listing.price || 0,
            condition: listing.condition || 'Unknown',
            daysAgo: Math.floor((new Date().getTime() - listing.createdAt.getTime()) / (1000 * 60 * 60 * 24))
          }));

        return {
          suggestedPrice,
          priceRange: {
            min: Math.round(minPrice * 0.8),
            max: Math.round(maxPrice * 1.2)
          },
          confidence,
          reasoning: generateReasoning(similarListings.length, condition, category, avgPrice, suggestedPrice),
          similarListings: recentSimilar
        };
      }
    }

    // Prepare similar listings for AI suggestion
    const aiSimilarListings = similarListings
      .slice(0, 5) // Limit to a reasonable number for the AI prompt
      .map(listing => ({
        title: listing.title || 'Unknown',
        price: listing.price || 0,
        condition: listing.condition || 'Unknown',
        daysAgo: Math.floor((new Date().getTime() - listing.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      }));

    // Fallback: Use AI to suggest price based on description and category, and any limited similar listings found
    return await getAIPriceSuggestion(title, category, condition, description, aiSimilarListings);

  } catch (error) {
    console.error('Error analyzing price:', error);
    
    // Fallback to basic category-based pricing
    return getFallbackPricing(category, condition);
  }
}

function getConditionMultiplier(condition: string): number {
  switch (condition.toLowerCase()) {
    case 'new': return 1.0;
    case 'like new': return 0.9;
    case 'good': return 0.8;
    case 'used': return 0.7;
    case 'fair': return 0.6;
    default: return 0.8;
  }
}

function generateReasoning(
  similarCount: number,
  condition: string,
  category: string,
  avgPrice: number,
  suggestedPrice: number
): string {
  let reasoning = `Based on analysis of ${similarCount} similar ${category.toLowerCase()} listings, `;
  
  if (similarCount >= 10) {
    reasoning += "we have high confidence in this price suggestion. ";
  } else if (similarCount >= 5) {
    reasoning += "we have moderate confidence in this price suggestion. ";
  } else {
    reasoning += "we have limited data but this is our best estimate. ";
  }

  reasoning += `The average price for similar items is $${avgPrice.toFixed(2)}. `;
  
  if (condition && condition !== 'Unknown') {
    reasoning += `Adjusted for "${condition}" condition. `;
  }

  reasoning += "Consider market demand and your item's unique features when setting the final price.";
  
  return reasoning;
}

async function getAIPriceSuggestion(
  title: string,
  category: string,
  condition: string,
  description: string,
  similarListings: Array<{
    title: string;
    price: number;
    condition: string;
    daysAgo: number;
  }>
): Promise<PriceAnalysis> {
  try {
    let similarListingsInfo = '';
    if (similarListings && similarListings.length > 0) {
      similarListingsInfo = '\n\nHere are some similar listings from the marketplace:\n';
      similarListings.forEach(listing => {
        similarListingsInfo += `- Title: ${listing.title}, Price: $${listing.price}, Condition: ${listing.condition}\n`;
      });
    }

    const prompt = `
As a pricing expert for a student marketplace, suggest a fair price for this item:

Title: ${title}
Category: ${category}
Condition: ${condition}
Description: ${description}
${similarListingsInfo}

Please provide:
1. A suggested price in USD
2. A price range (min-max)
3. Brief reasoning

Consider that this is a student marketplace where prices are typically lower than retail.
Respond in this exact format:
SUGGESTED_PRICE: [number]
MIN_PRICE: [number]
MAX_PRICE: [number]
REASONING: [explanation]
`;

    const aiResponse = await generateListingResponse(prompt, []);
    
    // Parse AI response
    const suggestedMatch = aiResponse.match(/SUGGESTED_PRICE:\s*(\d+)/);
    const minMatch = aiResponse.match(/MIN_PRICE:\s*(\d+)/);
    const maxMatch = aiResponse.match(/MAX_PRICE:\s*(\d+)/);
    const reasoningMatch = aiResponse.match(/REASONING:\s*(.+)/);

    if (suggestedMatch && minMatch && maxMatch) {
      return {
        suggestedPrice: parseInt(suggestedMatch[1]),
        priceRange: {
          min: parseInt(minMatch[1]),
          max: parseInt(maxMatch[1])
        },
        confidence: 'Medium',
        reasoning: reasoningMatch ? reasoningMatch[1].trim() : 'AI-generated price suggestion based on item details.',
        similarListings: []
      };
    }
  } catch (error) {
    console.error('Error getting AI price suggestion:', error);
  }

  // Final fallback
  return getFallbackPricing(category, condition);
}

function getFallbackPricing(category: string, condition: string): PriceAnalysis {
  // Basic category-based pricing as last resort
  const basePrices: { [key: string]: number } = {
    'Electronics': 200,
    'Textbooks': 50,
    'Services': 25,
    'Furniture': 100,
    'Academic Supplies': 20,
    'Other': 30
  };

  const basePrice = basePrices[category] || 30;
  const conditionMultiplier = getConditionMultiplier(condition);
  const suggestedPrice = Math.round(basePrice * conditionMultiplier);

  return {
    suggestedPrice,
    priceRange: {
      min: Math.round(suggestedPrice * 0.7),
      max: Math.round(suggestedPrice * 1.5)
    },
    confidence: 'Low',
    reasoning: `Estimated based on typical ${category.toLowerCase()} prices in student marketplaces. Limited historical data available.`,
    similarListings: []
  };
}
