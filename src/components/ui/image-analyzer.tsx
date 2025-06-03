import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Camera, Sparkles, CheckCircle, AlertCircle, Upload } from "lucide-react";
import { analyzeImageForListing, ImageAnalysisResult } from "@/lib/gemini";

interface ImageAnalyzerProps {
  onAnalysisComplete: (result: ImageAnalysisResult) => void;
  onImageSelected: (file: File) => void;
}

export function ImageAnalyzer({ onAnalysisComplete, onImageSelected }: ImageAnalyzerProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size must be less than 10MB.');
        return;
      }

      setSelectedImage(file);
      onImageSelected(file);
      setError(null);
      setAnalysisResult(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageSelected]);

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeImageForListing(selectedImage);
      setAnalysisResult(result);
      onAnalysisComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image');
    } finally {
      setAnalyzing(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 80) return <CheckCircle className="h-4 w-4" />;
    if (confidence >= 60) return <AlertCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  return (
    <Card className="border-purple-200 bg-purple-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Sparkles className="h-5 w-5" />
          Image Analyzer
        </CardTitle>
        <CardDescription>
          Upload an image and let the system automatically fill in your listing details
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Image Upload */}
        <div className="space-y-2">
          <Label htmlFor="image-upload">Upload Product Image</Label>
          <div className="flex items-center gap-2">
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="space-y-3">
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg border"
              />
              {selectedImage && (
                <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                  {selectedImage.name}
                </div>
              )}
            </div>

            {/* Analyze Button */}
            {!analyzing && !analysisResult && (
              <Button
                onClick={handleAnalyze}
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={!selectedImage}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze Image
              </Button>
            )}
          </div>
        )}

        {/* Loading State */}
        {analyzing && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-purple-600" />
              <p className="text-sm text-gray-600">Analyzing your image...</p>
              <p className="text-xs text-gray-500 mt-1">This may take a few seconds</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-green-800">Analysis Complete!</h4>
                <Badge className={getConfidenceColor(analysisResult.confidence)}>
                  {getConfidenceIcon(analysisResult.confidence)}
                  <span className="ml-1">{analysisResult.confidence}% Confident</span>
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Title:</span> {analysisResult.title}
                </div>
                <div>
                  <span className="font-medium">Categories:</span> {analysisResult.categories.join(', ')}
                </div>
                <div>
                  <span className="font-medium">Condition:</span> {analysisResult.condition}
                </div>
                <div>
                  <span className="font-medium">Suggested Price:</span> ${analysisResult.suggestedPrice}
                </div>
                <div>
                  <span className="font-medium">Description:</span> {analysisResult.description}
                </div>
              </div>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                The form has been automatically filled with generated details. You can review and edit them before creating your listing.
              </AlertDescription>
            </Alert>

            {/* Re-analyze Button */}
            <Button
              onClick={handleAnalyze}
              variant="outline"
              size="sm"
              className="w-full"
              disabled={analyzing}
            >
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Re-analyze Image
            </Button>
          </div>
        )}

        {/* Instructions */}
        {!selectedImage && (
          <div className="text-center py-6 border-2 border-dashed border-purple-200 rounded-lg">
            <Camera className="h-12 w-12 mx-auto mb-3 text-purple-400" />
            <p className="text-sm text-gray-600 mb-1">Upload a clear image of your item</p>
            <p className="text-xs text-gray-500">
              The system will analyze the image and automatically fill in the listing details
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
