import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, TrendingUp, Info, CheckCircle, AlertCircle } from "lucide-react";
import { analyzePriceForListing, PriceAnalysis } from "@/lib/priceAdvisor";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PriceAdvisorProps {
  title: string;
  category: string;
  condition: string;
  description: string;
  onPriceSuggestion: (price: number) => void;
}

export function PriceAdvisor({ 
  title, 
  category, 
  condition, 
  description, 
  onPriceSuggestion 
}: PriceAdvisorProps) {
  const [analysis, setAnalysis] = useState<PriceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAnalyze = title.length > 3 && category && description.length > 10;

  const handleAnalyze = async () => {
    if (!canAnalyze) return;

    setLoading(true);
    setError(null);
    
    try {
      const result = await analyzePriceForListing(title, category, condition, description);
      setAnalysis(result);
    } catch (err) {
      setError('Failed to analyze price. Please try again.');
      console.error('Price analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUseSuggestion = () => {
    if (analysis) {
      onPriceSuggestion(analysis.suggestedPrice);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'High': return <CheckCircle className="h-4 w-4" />;
      case 'Medium': return <AlertCircle className="h-4 w-4" />;
      case 'Low': return <Info className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  // Auto-analyze when inputs change (with debounce)
  useEffect(() => {
    if (canAnalyze && !loading) {
      const timer = setTimeout(() => {
        handleAnalyze();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [title, category, condition, description]);

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <TrendingUp className="h-5 w-5" />
          Price Advisor
        </CardTitle>
        <CardDescription>
          Get intelligent pricing suggestions based on similar listings and market data
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!canAnalyze && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Fill in the title, category, and description to get price suggestions.
            </AlertDescription>
          </Alert>
        )}

        {canAnalyze && !analysis && !loading && (
          <Button 
            onClick={handleAnalyze} 
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Analyze Price
          </Button>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-sm text-gray-600">Analyzing market data...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {analysis && (
          <div className="space-y-4">
            {/* Main Price Suggestion */}
            <div className="text-center p-4 bg-white rounded-lg border">
              <div className="text-2xl font-bold text-green-600 mb-1">
                ${analysis.suggestedPrice}
              </div>
              <div className="text-sm text-gray-600 mb-2">Suggested Price</div>
              <div className="flex items-center justify-center gap-2 mb-3">
                <Badge className={getConfidenceColor(analysis.confidence)}>
                  {getConfidenceIcon(analysis.confidence)}
                  <span className="ml-1">{analysis.confidence} Confidence</span>
                </Badge>
              </div>
              <Button 
                onClick={handleUseSuggestion}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                Use This Price
              </Button>
            </div>

            {/* Price Range */}
            <div className="bg-white p-3 rounded-lg border">
              <div className="text-sm font-medium mb-2">Recommended Range</div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Min: <span className="font-medium">${analysis.priceRange.min}</span>
                </span>
                <span className="text-sm text-gray-600">
                  Max: <span className="font-medium">${analysis.priceRange.max}</span>
                </span>
              </div>
            </div>

            {/* Reasoning */}
            <div className="bg-white p-3 rounded-lg border">
              <div className="text-sm font-medium mb-2">Analysis</div>
              <p className="text-sm text-gray-700">{analysis.reasoning}</p>
            </div>

            {/* Similar Listings */}
            {analysis.similarListings.length > 0 && (
              <div className="bg-white p-3 rounded-lg border">
                <div className="text-sm font-medium mb-3">Similar Recent Listings</div>
                <div className="space-y-2">
                  {analysis.similarListings.map((listing, index) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <div className="flex-1 truncate pr-2">
                        <span className="font-medium">{listing.title}</span>
                        <span className="text-gray-500 ml-1">({listing.condition})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">${listing.price}</span>
                        <span className="text-gray-500">{listing.daysAgo}d ago</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Re-analyze Button */}
            <Button 
              onClick={handleAnalyze} 
              variant="outline" 
              size="sm" 
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <TrendingUp className="h-4 w-4 mr-2" />
              )}
              Re-analyze Price
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
