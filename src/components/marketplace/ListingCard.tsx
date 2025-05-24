
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, MapPin, Star, ExternalLink } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ListingCardProps {
  id: string;
  title: string;
  price: string;
  condition: string;
  description: string;
  image: string;
  seller: {
    name: string;
    avatar?: string;
    university: string;
    rating: number;
  };
  category: string;
  isService?: boolean;
}

export function ListingCard({ 
  title, 
  price, 
  condition, 
  description, 
  image, 
  seller, 
  category, 
  isService = false 
}: ListingCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card 
      className={cn(
        "group transition-all duration-300 cursor-pointer overflow-hidden",
        isHovered ? "shadow-lg scale-[1.02] border-blue-100" : "shadow-sm hover:shadow-md"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-0">
        <div className="relative">
          <div className="overflow-hidden">
            <img
              src={image}
              alt={title}
              className={cn(
                "w-full h-48 object-cover transition-all duration-500",
                isHovered ? "transform scale-110" : ""
              )}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-3 right-3 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white/95 shadow-sm ${
              isFavorited ? "text-red-500" : "text-gray-600"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setIsFavorited(!isFavorited);
            }}
          >
            <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
          </Button>
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm font-medium">
              {category}
            </Badge>
          </div>
          {isHovered && (
            <div className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent",
              "flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            )}>
              <Button variant="secondary" size="sm" className="bg-white/90 backdrop-blur-sm gap-1">
                <ExternalLink className="h-3.5 w-3.5" />
                View Details
              </Button>
            </div>
          )}
        </div>
        
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-blue-600 transition-colors">
              {title}
            </h3>
            <div className="text-right">
              <p className="font-bold text-lg text-blue-600">
                {isService ? `${price}/hr` : price}
              </p>
              {!isService && (
                <Badge variant={condition === "New" ? "default" : "outline"} className={cn(
                  "text-xs",
                  condition === "New" && "bg-emerald-500"
                )}>
                  {condition}
                </Badge>
              )}
            </div>
          </div>
          
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {description}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Avatar className="h-7 w-7 border-2 border-white shadow-sm">
                <AvatarImage src={seller.avatar} />
                <AvatarFallback className="text-xs bg-blue-100 text-blue-800">
                  {seller.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{seller.name}</p>
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3 text-gray-400" />
                  <p className="text-xs text-gray-500">{seller.university}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-700">{seller.rating}</span>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 px-4 pb-4">
        <Button className="w-full gap-2 text-base py-5 bg-blue-50 hover:bg-blue-100 text-blue-700" variant="ghost">
          <MessageSquare className="h-4 w-4" />
          Contact Seller
        </Button>
      </CardFooter>
    </Card>
  );
}
