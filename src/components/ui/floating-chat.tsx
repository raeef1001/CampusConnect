import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Send, Loader2, ExternalLink, Star, MapPin } from "lucide-react";
import { generateListingResponse, extractListingIds, getListingsByIds } from "@/lib/gemini";
import { Listing } from "@/types/listing";
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
  listings?: Listing[];
}

interface SellerProfile {
  name: string;
  avatar?: string;
  university: string;
  rating: number;
}

interface FloatingChatProps {
  listings?: Listing[];
}

export function FloatingChat({ listings = [] }: FloatingChatProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      content: "Hi! I'm your CampusConnect AI assistant. I can help you find products and services from the marketplace. Ask me about available listings, prices, categories, or anything else related to the products listed by students!",
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentListings, setCurrentListings] = useState<Listing[]>(listings);

  // Fetch listings if not provided as props
  useEffect(() => {
    if (listings.length === 0) {
      const listingsQuery = query(collection(db, "listings"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(listingsQuery, (snapshot) => {
        const listingsData: Listing[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Listing));
        setCurrentListings(listingsData);
      });

      return () => unsubscribe();
    } else {
      setCurrentListings(listings);
    }
  }, [listings]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Generate AI response using Gemini
      const aiResponse = await generateListingResponse(inputValue, currentListings);
      
      // Extract listing IDs from the response
      const listingIds = extractListingIds(aiResponse);
      const recommendedListings = getListingsByIds(listingIds, currentListings);
      
      // Clean the response text by removing listing ID markers and any markdown formatting
      const cleanedResponse = aiResponse
        .replace(/\[LISTING:[^\]]+\]/g, '')
        .replace(/\*\*/g, '')  // Remove bold markdown
        .replace(/\*/g, '')    // Remove italic markdown
        .replace(/_/g, '')     // Remove underscores
        .replace(/`/g, '')     // Remove code backticks
        .replace(/#{1,6}\s/g, '') // Remove headers
        .trim();
      
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: cleanedResponse,
        isBot: true,
        timestamp: new Date(),
        listings: recommendedListings.length > 0 ? recommendedListings : undefined,
      };
      
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I'm having trouble processing your request right now. Please try again later or contact support if the issue persists.",
        isBot: true,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedQuestions = [
    "What electronics are available?",
    "Show me textbooks under $50",
    "Any tutoring services available?",
    "What's the cheapest laptop?",
    "Show me items in good condition"
  ];

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
  };

  // Helper function to fetch seller profile
  const fetchSellerProfile = async (userId: string, userEmail: string): Promise<SellerProfile> => {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        return userDocSnap.data() as SellerProfile;
      } else {
        // Fallback to email-based profile
        return {
          name: userEmail?.split('@')[0] || "Unknown Seller",
          avatar: userEmail ? `https://api.dicebear.com/7.x/initials/svg?seed=${userEmail}` : undefined,
          university: "University Name",
          rating: 0,
        };
      }
    } catch (error) {
      console.error("Error fetching seller profile:", error);
      return {
        name: userEmail?.split('@')[0] || "Unknown Seller",
        avatar: userEmail ? `https://api.dicebear.com/7.x/initials/svg?seed=${userEmail}` : undefined,
        university: "University Name",
        rating: 0,
      };
    }
  };

  // Product card component
  const ProductCard = ({ listing }: { listing: Listing }) => {
    const isService = listing.category === "Services";

    const handleViewDetails = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Navigating to listing details:', listing.id);
      console.log('Full listing object:', listing);
      
      // Use React Router navigation
      navigate(`/listings/${listing.id}`);
    };

    return (
      <Card 
        className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border border-gray-200 bg-white overflow-hidden"
      >
        <CardContent className="p-0">
          <div className="p-3 pb-0">
            <div className="flex space-x-3">
              <div className="relative flex-shrink-0">
                <img
                  src={listing.imageUrl || "/placeholder.svg"}
                  alt={listing.title}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <Badge 
                  variant="secondary" 
                  className="absolute -top-1 -right-1 text-xs px-1 py-0 bg-blue-500 text-white"
                >
                  {listing.category}
                </Badge>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-semibold text-sm line-clamp-1 text-gray-900">
                    {listing.title}
                  </h4>
                  <div className="text-right ml-2">
                    <p className="font-bold text-sm text-blue-600">
                      {isService ? `$${listing.price}/hr` : `$${listing.price}`}
                    </p>
                    {!isService && (
                      <Badge variant="outline" className="text-xs">
                        {listing.condition}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                  {listing.description}
                </p>
                
                {listing.seller && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-xs bg-gray-100">
                          {listing.seller.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-gray-500 truncate">
                        {listing.seller.name}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-gray-500">{listing.seller.rating || 0}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-3 pt-2">
            <Button 
              size="sm" 
              className="w-full h-8 text-xs bg-blue-500 hover:bg-blue-600 text-white border-0 font-medium shadow-sm"
              onClick={handleViewDetails}
              type="button"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-xl hover:shadow-2xl hover:shadow-blue-300/50 z-50 transition-all duration-300 hover:scale-110 group border-2 border-white/20"
        >
          <MessageCircle className="h-7 w-7 text-white group-hover:scale-110 transition-transform duration-200" />
          <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
            <div className="h-2 w-2 bg-white rounded-full animate-pulse"></div>
          </div>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-96 sm:max-w-md p-0 bg-gradient-to-b from-blue-50 to-white">
        <SheetHeader className="p-6 pb-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <SheetTitle className="flex items-center space-x-3 text-white">
            <Avatar className="h-10 w-10 bg-white/20 backdrop-blur-sm border-2 border-white/30">
              <AvatarFallback className="text-blue-600 text-sm font-bold bg-white">AI</AvatarFallback>
            </Avatar>
            <div>
              <span className="text-lg font-semibold">CampusConnect AI</span>
              <p className="text-xs text-blue-100 font-normal">Your marketplace assistant</p>
            </div>
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-full max-h-[calc(100vh-140px)]">
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-4 py-4">
              {messages.map((message) => (
                <div key={message.id} className="space-y-3">
                  <div
                    className={`flex ${message.isBot ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                        message.isBot
                          ? "bg-white text-gray-900 border border-gray-200"
                          : "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-200"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-2">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  
                  {/* Render product cards if listings are available */}
                  {message.isBot && message.listings && message.listings.length > 0 && (
                    <div className="flex justify-start">
                      <div className="max-w-[90%] space-y-3">
                        <div className="flex items-center space-x-2 px-2">
                          <div className="h-1 w-1 bg-blue-400 rounded-full"></div>
                          <p className="text-xs text-gray-600 font-medium">
                            {message.listings.length === 1 ? "Recommended product:" : "Recommended products:"}
                          </p>
                        </div>
                        {message.listings.map((listing) => (
                          <ProductCard key={listing.id} listing={listing} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-900 rounded-2xl px-4 py-3 flex items-center space-x-3 shadow-sm border border-gray-200">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Suggested Questions */}
          {messages.length === 1 && (
            <div className="px-4 py-3 bg-white/50 backdrop-blur-sm border-t border-gray-200">
              <p className="text-xs text-gray-600 mb-3 font-medium">💡 Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-3 bg-white hover:bg-blue-50 border-blue-200 text-blue-700 hover:text-blue-800 rounded-full"
                    onClick={() => handleSuggestedQuestion(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex space-x-3">
              <Input
                placeholder="Ask about listings, prices, categories..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                disabled={isLoading}
              />
              <Button 
                size="icon" 
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="rounded-full bg-blue-500 hover:bg-blue-600 shadow-lg hover:shadow-blue-200 transition-all duration-200"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
